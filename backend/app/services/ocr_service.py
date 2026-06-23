"""
EasyOCR License Plate Service.

Pipeline:
  1. Determine plate search regions (YOLO bbox > vehicle-lower-half > whole-image contour)
  2. Crop each region from the enhanced image
  3. Perspective correction (deskew the plate crop)
  4. Preprocess the crop (grayscale → CLAHE → adaptive threshold → denoise → upscale)
  5. Run EasyOCR ONLY on the preprocessed crop — never on the full image
  6. Return the RAW EasyOCR text EXACTLY as read — never modify, complete, or invent characters
  7. Save original crop, perspective-corrected crop, and preprocessed crop to uploads/debug/

ABSOLUTE RULE: The only valid source of a license plate number is EasyOCR inference
on an actually detected plate crop. Never fabricate, complete, or guess missing characters.
If OCR returns nothing, store NULL and report failure honestly.
"""
import cv2
import numpy as np
import re
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

_ocr_reader = None
_paddle_reader = None


# ── EasyOCR singleton ─────────────────────────────────────────────────────────

def get_reader():
    """Lazy-load EasyOCR reader (downloads models on first use, ~200 MB)."""
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            logger.info("[OCR] Initializing EasyOCR reader (en)...")
            _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            logger.info("[OCR] EasyOCR reader ready.")
        except Exception as e:
            logger.error(f"[OCR] EasyOCR initialization failed: {e}", exc_info=True)
            raise RuntimeError(f"OCR unavailable: {e}") from e
    return _ocr_reader


# ── PaddleOCR singleton ───────────────────────────────────────────────────────

def get_paddle_reader():
    """Lazy-load PaddleOCR reader if settings configure it as primary."""
    global _paddle_reader
    if _paddle_reader is None:
        try:
            from app.config import settings
            if settings.OCR_PRIMARY_ENGINE == "paddleocr":
                try:
                    from paddleocr import PaddleOCR
                    # Suppress paddle logs to keep stdout clean
                    logging.getLogger("ppocr").setLevel(logging.ERROR)
                    logger.info("[OCR] Initializing PaddleOCR reader (en)...")
                    _paddle_reader = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
                    logger.info("[OCR] PaddleOCR reader ready.")
                except ImportError:
                    logger.warning("[OCR] PaddleOCR not installed. PaddleOCR primary engine unavailable.")
                except Exception as e:
                    logger.error(f"[OCR] PaddleOCR initialization failed: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"[OCR] Failed to resolve settings for PaddleOCR: {e}")
    return _paddle_reader


# ── Perspective correction ────────────────────────────────────────────────────

def perspective_correct_crop(crop: np.ndarray) -> np.ndarray:
    """
    Attempt to deskew a license plate crop using contour-based perspective correction.

    If a clear quadrilateral contour is found, applies warpPerspective.
    Falls back to the original crop if no suitable contour is detected.

    Returns the corrected (or original) crop as a BGR numpy array.
    """
    if crop is None or crop.size == 0:
        return crop

    h, w = crop.shape[:2]

    # Need minimum size to apply correction meaningfully
    if w < 40 or h < 10:
        return crop

    try:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        # Strong bilateral filter to preserve edges while smoothing noise
        blur = cv2.bilateralFilter(gray, 9, 75, 75)
        # Canny edge detection with auto-threshold
        median = float(np.median(blur))
        lo = max(0, int(0.67 * median))
        hi = min(255, int(1.33 * median))
        edges = cv2.Canny(blur, lo, hi)

        # Dilate to close small gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return crop

        # Find the largest contour with 4 corners (license plate shape)
        best_quad = None
        best_area = 0.0
        img_area = h * w

        for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:10]:
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
            area = cv2.contourArea(cnt)
            # Accept quadrilaterals that cover at least 20% of crop area
            if len(approx) == 4 and area > img_area * 0.20 and area > best_area:
                best_quad = approx
                best_area = area

        if best_quad is None:
            return crop  # No suitable quad found — use original

        # Order points: top-left, top-right, bottom-right, bottom-left
        pts = best_quad.reshape(4, 2).astype(np.float32)
        s = pts.sum(axis=1)
        diff = np.diff(pts, axis=1)
        ordered = np.zeros((4, 2), dtype=np.float32)
        ordered[0] = pts[np.argmin(s)]    # top-left
        ordered[2] = pts[np.argmax(s)]    # bottom-right
        ordered[1] = pts[np.argmin(diff)] # top-right
        ordered[3] = pts[np.argmax(diff)] # bottom-left

        # Target rectangle — maintain crop aspect ratio
        dst = np.array([
            [0, 0],
            [w - 1, 0],
            [w - 1, h - 1],
            [0, h - 1],
        ], dtype=np.float32)

        M = cv2.getPerspectiveTransform(ordered, dst)
        corrected = cv2.warpPerspective(crop, M, (w, h),
                                        flags=cv2.INTER_CUBIC,
                                        borderMode=cv2.BORDER_REPLICATE)
        logger.info("[OCR] Perspective correction applied successfully.")
        return corrected

    except Exception as e:
        logger.warning(f"[OCR] Perspective correction failed ({e}); using original crop.")
        return crop


# ── Plate crop preprocessing ──────────────────────────────────────────────────

def preprocess_plate_crop(crop: np.ndarray) -> np.ndarray:
    """
    Enhance a license plate crop for better OCR accuracy.

    Steps:
      1. Convert to grayscale
      2. Upscale if too small (min width 200 px)
      3. CLAHE contrast enhancement
      4. Gaussian blur to reduce noise
      5. Adaptive threshold → binary image
      6. Dilation to connect broken characters

    Returns the preprocessed crop (single-channel, uint8).
    """
    # 1. Grayscale
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # 2. Upscale small crops — EasyOCR performs poorly below ~200 px wide
    h, w = gray.shape
    if w < 200:
        scale = 200.0 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # 3. CLAHE to boost contrast
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    gray = clahe.apply(gray)

    # 4. Gaussian denoise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # 5. Adaptive threshold → binary
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15,
        C=8,
    )

    # 6. Slight dilation to close gaps in characters
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.dilate(binary, kernel, iterations=1)

    return binary


# ── Contour-based plate region finder (fallback) ──────────────────────────────

def find_plate_regions(img: np.ndarray) -> List[Dict[str, int]]:
    """
    Find potential license plate regions using OpenCV contour analysis.
    Used as fallback when no YOLO plate detections are available.

    Criteria:
      - Aspect ratio 2.0–6.5 (plates are wider than tall)
      - Minimum area: 0.1% of image area (not too tiny)
      - Maximum area: 15% of image area (not the whole image)

    Returns up to 5 candidate regions as bbox dicts {x1, y1, x2, y2}.
    """
    gray     = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred  = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh   = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2,
    )

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    h_img, w_img = img.shape[:2]
    img_area     = h_img * w_img
    min_area     = img_area * 0.001   # 0.1%
    max_area     = img_area * 0.15    # 15%

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if h < 8:                                   # too short
            continue
        aspect_ratio = w / (h + 1e-6)
        area = w * h
        if 2.0 <= aspect_ratio <= 6.5 and min_area < area < max_area:
            candidates.append({
                "x1": x, "y1": y,
                "x2": x + w, "y2": y + h,
            })

    # Sort by area descending, return top 5
    candidates.sort(
        key=lambda c: (c["x2"] - c["x1"]) * (c["y2"] - c["y1"]),
        reverse=True,
    )
    logger.info(f"[OCR] Contour search found {len(candidates)} plate candidates (returning top 5).")
    return candidates[:5]


# ── Format validator (REPORT ONLY — never modifies OCR output) ────────────────

def validate_plate_format(raw_ocr_text: str) -> Dict[str, Any]:
    """
    Validate whether the raw OCR text matches a standard Indian plate format.

    This function is FOR REPORTING ONLY.
    It NEVER modifies the OCR output.
    It NEVER replaces uncertain characters.
    It NEVER auto-completes partial plates.

    Returns:
        dict with keys:
            valid_format (bool) — whether the text matches a known plate pattern
            reason (str)        — why validation passed or failed
    """
    if not raw_ocr_text:
        return {"valid_format": False, "reason": "Empty OCR result"}

    # Strip only whitespace for format check — keep all other chars as-is
    stripped = raw_ocr_text.strip()

    # Indian plate pattern: 2 letters + 2 digits + 1-3 letters + 1-4 digits
    # Examples: MH12AB1234, TS09AB1234, KA01A1234
    pattern = re.compile(r'^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$', re.IGNORECASE)

    # Remove only spaces for pattern matching
    compact = re.sub(r'\s+', '', stripped).upper()

    if pattern.match(compact):
        return {"valid_format": True, "reason": f"Matches Indian plate format: {compact}"}
    elif len(compact) < 4:
        return {"valid_format": False, "reason": f"Too short ({len(compact)} chars) to be a plate"}
    elif len(compact) > 13:
        return {"valid_format": False, "reason": f"Too long ({len(compact)} chars) for a plate"}
    else:
        return {
            "valid_format": False,
            "reason": f"Does not match Indian plate format — raw text preserved as-is: '{stripped}'"
        }


# ── Main entry point ──────────────────────────────────────────────────────────

def extract_plates(
    img: np.ndarray,
    vehicle_detections: List[dict],
    plate_detections: Optional[List[dict]],
    evidence_dir: Path,
    image_id: int,
) -> List[Dict[str, Any]]:
    """
    Main OCR entry point.

    Region selection priority:
      1. YOLO license_plate.pt bounding boxes      (most accurate)
      2. Lower half of each detected vehicle bbox  (fallback when YOLO plate model absent)
      3. Whole-image OpenCV contour search         (last resort — no vehicles detected)

    For each region:
      - Crop from the enhanced image
      - Apply perspective correction (deskew)
      - Preprocess the crop (grayscale, CLAHE, adaptive threshold, denoise)
      - Run EasyOCR on the PREPROCESSED CROP ONLY (never on full image)
      - Save raw crop, perspective-corrected crop, and preprocessed crop to uploads/debug/
      - Filter low-confidence results
      - Store the EXACT EasyOCR output — never modify, complete, or fabricate

    OCR failure handling:
      - If OCR returns nothing → the caller stores NULL and reports "OCR could not recognize"
      - If OCR returns text below confidence threshold → skipped and logged
      - NEVER invent a registration number

    Returns:
      List of plate dicts with keys:
        raw_ocr_text     — EXACT text from EasyOCR, unmodified
        plate_text       — raw_ocr_text.strip().upper() (case/whitespace only, never chars changed)
        ocr_confidence   — DIRECT from EasyOCR, never invented
        format_valid     — whether text matches Indian plate format (reporting only)
        format_reason    — explanation of format check
        bbox             — detected region coordinates
        vehicle_idx      — index into vehicle_detections if matched
        plate_crop_path  — saved raw crop path for debug/evidence
    """
    t0 = time.perf_counter()
    results = []

    logger.info(f"[OCR] Starting plate recognition for image_id={image_id}")

    # Initialise EasyOCR (or reuse singleton)
    try:
        reader = get_reader()
    except RuntimeError as e:
        logger.warning(f"[OCR] Skipping OCR — reader unavailable: {e}")
        return results

    # Import debug dir from settings (created at startup)
    try:
        from app.config import settings as _settings
        debug_dir = Path(_settings.DEBUG_DIR)
        debug_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        debug_dir = None

    # ── Determine search regions ───────────────────────────────────────────────
    vehicles = [d for d in vehicle_detections if d["class_id"] in {1, 2, 3, 5, 7}]
    search_regions: List[Dict[str, Any]] = []

    if plate_detections:
        logger.info(
            f"[OCR] Using {len(plate_detections)} YOLO plate detection(s) as search regions."
        )
        for p in plate_detections:
            b = p["bbox"]
            cx = (b["x1"] + b["x2"]) / 2
            cy = (b["y1"] + b["y2"]) / 2
            matched_idx = None
            for idx, v in enumerate(vehicles):
                vb = v["bbox"]
                if vb["x1"] <= cx <= vb["x2"] and vb["y1"] <= cy <= vb["y2"]:
                    matched_idx = idx
                    break
            search_regions.append({
                "x1": int(b["x1"]),
                "y1": int(b["y1"]),
                "x2": int(b["x2"]),
                "y2": int(b["y2"]),
                "vehicle_idx": matched_idx,
                "source": "YOLO-plate",
            })

    elif vehicles:
        logger.info(
            f"[OCR] No YOLO plate model. "
            f"Using lower third of {len(vehicles)} vehicle bbox(es) as plate search regions."
        )
        for idx, v in enumerate(vehicles):
            b = v["bbox"]
            h_v = b["y2"] - b["y1"]
            # Use lower third of the vehicle bbox (where plate is usually mounted)
            plate_y1 = int(b["y1"] + h_v * 0.65)
            search_regions.append({
                "x1": int(b["x1"]),
                "y1": plate_y1,
                "x2": int(b["x2"]),
                "y2": int(b["y2"]),
                "vehicle_idx": idx,
                "source": "vehicle-lower-third",
            })

    else:
        # No vehicles detected at all — search the whole image for plate-like contours
        logger.info(
            "[OCR] No vehicles detected. Running whole-image contour search for plate regions."
        )
        contour_regions = find_plate_regions(img)
        if contour_regions:
            search_regions = [dict(**r, vehicle_idx=None, source="contour") for r in contour_regions]
        else:
            logger.info("[OCR] No plate regions found via contours either. Returning empty.")
            return results

    if not search_regions:
        logger.info("[OCR] No search regions available — returning empty plate list.")
        return results

    logger.info(f"[OCR] Processing {len(search_regions)} region(s) with EasyOCR...")

    h_img, w_img = img.shape[:2]
    seen_texts: set = set()

    for region_idx, region in enumerate(search_regions):
        x1 = max(0, region["x1"])
        y1 = max(0, region["y1"])
        x2 = min(w_img, region["x2"])
        y2 = min(h_img, region["y2"])

        if x2 <= x1 + 5 or y2 <= y1 + 5:
            logger.info(f"[OCR] Region {region_idx} too small ({x2-x1}×{y2-y1}px) — skipping.")
            continue

        # Raw crop from enhanced image
        raw_crop = img[y1:y2, x1:x2].copy()

        # ── Debug: save raw crop ───────────────────────────────────────────────
        if debug_dir is not None:
            raw_crop_path = debug_dir / f"plate_{image_id:04d}_{region_idx:02d}_raw.jpg"
            try:
                cv2.imwrite(str(raw_crop_path), raw_crop)
                logger.info(f"[OCR] Saved raw crop → {raw_crop_path}")
            except Exception as e:
                logger.warning(f"[OCR] Could not save raw crop: {e}")

        # ── Perspective correction ─────────────────────────────────────────────
        corrected_crop = perspective_correct_crop(raw_crop)

        # ── Debug: save perspective-corrected crop ─────────────────────────────
        if debug_dir is not None:
            persp_crop_path = debug_dir / f"plate_{image_id:04d}_{region_idx:02d}_perspective.jpg"
            try:
                cv2.imwrite(str(persp_crop_path), corrected_crop)
                logger.info(f"[OCR] Saved perspective-corrected crop → {persp_crop_path}")
            except Exception as e:
                logger.warning(f"[OCR] Could not save perspective crop: {e}")

        # ── Preprocess the corrected crop ──────────────────────────────────────
        try:
            processed_crop = preprocess_plate_crop(corrected_crop)
        except Exception as e:
            logger.warning(f"[OCR] Preprocessing failed for region {region_idx}: {e}")
            # Fall back to corrected crop upscaled
            scale = max(1.0, 200 / max(corrected_crop.shape[1], 1))
            processed_crop = cv2.resize(corrected_crop, None, fx=scale, fy=scale,
                                        interpolation=cv2.INTER_CUBIC)

        # ── Debug: save preprocessed crop ─────────────────────────────────────
        if debug_dir is not None:
            proc_crop_path = debug_dir / f"plate_{image_id:04d}_{region_idx:02d}_processed.jpg"
            try:
                cv2.imwrite(str(proc_crop_path), processed_crop)
                logger.info(f"[OCR] Saved processed crop → {proc_crop_path}")
            except Exception as e:
                logger.warning(f"[OCR] Could not save processed crop: {e}")

        # ── Run OCR on PREPROCESSED CROP ONLY ─────────────────────────────────
        ocr_segments = []
        ocr_engine_used = "EasyOCR"
        
        # Try PaddleOCR first if configured
        from app.config import settings
        if settings.OCR_PRIMARY_ENGINE == "paddleocr":
            paddle_reader = get_paddle_reader()
            if paddle_reader is not None:
                try:
                    logger.info(
                        f"[OCR] Running PaddleOCR on region {region_idx} "
                        f"(source={region.get('source','?')}, "
                        f"size={processed_crop.shape[1]}×{processed_crop.shape[0]}px)..."
                    )
                    processed_bgr = cv2.cvtColor(processed_crop, cv2.COLOR_GRAY2BGR)
                    ocr_res = paddle_reader.ocr(processed_bgr, cls=True)
                    if ocr_res and len(ocr_res) > 0 and ocr_res[0] is not None:
                        for line in ocr_res[0]:
                            text, conf = line[1]
                            ocr_segments.append((None, text, conf))
                        ocr_engine_used = "PaddleOCR"
                except Exception as e:
                    logger.warning(f"[OCR] PaddleOCR failed on region {region_idx}: {e}. Falling back to EasyOCR.")
        
        # Fall back to EasyOCR if PaddleOCR not used or returned nothing
        if not ocr_segments:
            logger.info(
                f"[OCR] Running EasyOCR on region {region_idx} "
                f"(source={region.get('source','?')}, "
                f"size={processed_crop.shape[1]}×{processed_crop.shape[0]}px)..."
            )
            try:
                ocr_output = reader.readtext(
                    processed_crop,
                    allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
                    detail=1,
                )
                if ocr_output:
                    ocr_segments = ocr_output
                    ocr_engine_used = "EasyOCR"
            except Exception as e:
                logger.warning(f"[OCR] EasyOCR failed on region {region_idx}: {e}", exc_info=True)

        if not ocr_segments:
            logger.info(f"[OCR] Region {region_idx} — OCR returned no text. "
                        f"Plate could not be read (blur, occlusion, low resolution, or glare).")
            continue

        logger.info(f"[OCR] Region {region_idx} — {len(ocr_segments)} text segment(s) found.")

        for (_, text, conf) in ocr_segments:
            # ── Log EXACT raw OCR output ───────────────────────────────────────
            logger.info(
                f"[OCR]   EXACT {ocr_engine_used} output: text='{text}' | conf={conf:.4f} | "
                f"source={region.get('source','?')}"
            )

            if conf < 0.25:      # very low-confidence segments — skip
                logger.info(
                    f"[OCR]   Skipped (conf {conf:.4f} < 0.25 minimum) — "
                    f"plate could not be read confidently."
                )
                continue

            # ── Preserve EXACT raw OCR text ────────────────────────────────────
            # raw_ocr_text = EXACTLY what OCR returned (character-for-character)
            raw_ocr_text = text

            # plate_text = only strip whitespace and uppercase — NO other modifications
            # Do NOT replace '?' or any uncertain character
            # Do NOT auto-complete partial plates
            plate_text = raw_ocr_text.strip().upper()

            if len(plate_text) < 4:
                logger.info(
                    f"[OCR]   Skipped '{plate_text}' (length {len(plate_text)} < 4) — "
                    f"too short to be a valid plate."
                )
                continue

            if plate_text in seen_texts:
                logger.info(f"[OCR]   Skipped '{plate_text}' (duplicate in this image).")
                continue

            seen_texts.add(plate_text)

            # ── Format validation (REPORT ONLY — never modifies OCR output) ────
            validation = validate_plate_format(raw_ocr_text)

            # Save the successfully-OCR'd raw crop as the plate crop result
            crop_filename = f"plate_{image_id}_{len(results)}.jpg"
            crop_path_out = evidence_dir / crop_filename
            try:
                cv2.imwrite(str(crop_path_out), raw_crop)
            except Exception:
                crop_path_out = None

            logger.info(
                f"[OCR] ✓ Plate recognized — "
                f"raw_ocr_text='{raw_ocr_text}' | "
                f"plate_text='{plate_text}' | "
                f"ocr_confidence={conf:.4f} ({conf:.1%}) | "
                f"format_valid={validation['valid_format']} | "
                f"source={region.get('source','?')}"
            )

            results.append({
                # EXACT OCR output — NEVER modified, completed, or fabricated
                "raw_ocr_text":    raw_ocr_text,
                # Case-normalized only — same characters, no substitutions
                "plate_text":      plate_text,
                # DIRECT from OCR — never invented, never randomized
                "ocr_confidence":  round(float(conf), 4),
                # Format validation for reporting only
                "format_valid":    validation["valid_format"],
                "format_reason":   validation["reason"],
                # Location data
                "bbox":            {"x1": float(x1), "y1": float(y1),
                                    "x2": float(x2), "y2": float(y2)},
                "vehicle_idx":     region.get("vehicle_idx"),
                "plate_crop_path": str(crop_path_out) if crop_path_out else None,
                "source":          region.get("source", "unknown"),
                "ocr_engine":      ocr_engine_used,
            })

    duration_ms = (time.perf_counter() - t0) * 1000

    if results:
        logger.info(
            f"[OCR] Complete — {len(results)} plate(s) recognized in {duration_ms:.1f}ms: "
            + ", ".join(
                f"'{r['raw_ocr_text']}' (conf={r['ocr_confidence']:.1%}, "
                f"format_valid={r['format_valid']})"
                for r in results
            )
        )
    else:
        logger.info(
            f"[OCR] Complete — No license plate text recognized in {duration_ms:.1f}ms. "
            f"Reason: EasyOCR found no text meeting confidence/length thresholds "
            f"in any of the {len(search_regions)} region(s). "
            f"Possible causes: blur, low resolution, occlusion, glare, angle, or poor lighting."
        )

    return results

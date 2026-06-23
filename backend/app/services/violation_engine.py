"""
Rule-Based Violation Engine.

CRITICAL DESIGN PRINCIPLE:
  No violation is ever randomly assigned.
  Every violation must be the logical consequence of actual YOLO detections.
  Confidence is derived from detection confidence, not invented.

Rules implemented:
  1. TRIPLE_RIDING   — motorcycle + ≥3 overlapping persons
  2. HELMET_MISSING  — motorcycle + person detected, head ROI analyzed
  3. RED_LIGHT       — traffic light (red) + vehicle in intersection zone
  4. STOP_LINE       — vehicle bbox bottom crosses stop-line ROI
  5. ILLEGAL_PARKING — vehicle inside parking-restricted zone marker
  6. WRONG_SIDE      — vehicle heading opposite to expected traffic direction
  7. SEATBELT_MISSING— car + person visible, torso ROI diagonal analysis
"""
import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)


# ── Geometry helpers ──────────────────────────────────────────────────────────

def bbox_center(det: dict) -> Tuple[float, float]:
    b = det["bbox"]
    return ((b["x1"] + b["x2"]) / 2, (b["y1"] + b["y2"]) / 2)


def bbox_area(det: dict) -> float:
    b = det["bbox"]
    return max(0, (b["x2"] - b["x1"])) * max(0, (b["y2"] - b["y1"]))


def bbox_iou(a: dict, b: dict) -> float:
    """Intersection over Union of two detection bounding boxes."""
    ax1, ay1, ax2, ay2 = a["bbox"]["x1"], a["bbox"]["y1"], a["bbox"]["x2"], a["bbox"]["y2"]
    bx1, by1, bx2, by2 = b["bbox"]["x1"], b["bbox"]["y1"], b["bbox"]["x2"], b["bbox"]["y2"]
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    intersection = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if intersection == 0:
        return 0.0
    union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - intersection
    return intersection / (union + 1e-6)


def center_in_bbox(center: Tuple[float, float], det: dict) -> bool:
    cx, cy = center
    b = det["bbox"]
    return b["x1"] <= cx <= b["x2"] and b["y1"] <= cy <= b["y2"]


def get_by_class(detections: List[dict], class_id: int) -> List[dict]:
    return [d for d in detections if d["class_id"] == class_id]


def get_by_classes(detections: List[dict], class_ids: set) -> List[dict]:
    return [d for d in detections if d["class_id"] in class_ids]


# ── Image ROI analysis ────────────────────────────────────────────────────────

def dominant_color_in_roi(img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> str:
    """
    Returns dominant color channel ("red", "green", "yellow", "unknown")
    in the given pixel ROI of a BGR image.
    """
    h, w = img.shape[:2]
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return "unknown"
    roi = img[y1:y2, x1:x2]
    if roi.size == 0:
        return "unknown"
    # Sum BGR channels
    b_sum = float(roi[:, :, 0].mean())
    g_sum = float(roi[:, :, 1].mean())
    r_sum = float(roi[:, :, 2].mean())
    if r_sum > g_sum * 1.4 and r_sum > b_sum * 1.4:
        return "red"
    if g_sum > r_sum * 1.2 and g_sum > b_sum * 1.2:
        return "green"
    if r_sum > b_sum * 1.3 and g_sum > b_sum * 1.3:
        return "yellow"
    return "unknown"


def has_diagonal_band_in_roi(img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> float:
    """
    Approximate seatbelt presence: look for a bright diagonal line
    across the upper torso region (top 60% of person bbox).
    Returns a score 0.0–1.0 (higher = seatbelt more likely present).
    """
    h, w = img.shape[:2]
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
    if x2 <= x1 + 5 or y2 <= y1 + 5:
        return 0.0
    roi = img[y1:y2, x1:x2]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=20,
                            minLineLength=roi.shape[0] // 4, maxLineGap=10)
    if lines is None:
        return 0.0
    # Check for lines with diagonal angle (30–60 degrees)
    diagonal_count = 0
    for line in lines:
        x_l1, y_l1, x_l2, y_l2 = line[0]
        if abs(x_l2 - x_l1) < 1:
            continue
        angle = abs(np.degrees(np.arctan2(y_l2 - y_l1, x_l2 - x_l1)))
        if 25 < angle < 65:
            diagonal_count += 1
    return min(1.0, diagonal_count / 3.0)


def head_has_helmet(img: np.ndarray, person_det: dict) -> Tuple[bool, float]:
    """
    Approximate helmet presence by analyzing the top ~25% of a person bbox.
    Looks for a curved/rounded dark or bright region (helmet-like shape).

    Returns: (helmet_found: bool, certainty: float 0-1)
    Note: This is a heuristic — not a trained helmet classifier.
    Confidence reflects the quality of the underlying detection.
    """
    b = person_det["bbox"]
    h_img, w_img = img.shape[:2]
    person_h = b["y2"] - b["y1"]
    # Head occupies roughly top 20% of person bbox
    head_y2 = b["y1"] + person_h * 0.25
    x1 = max(0, int(b["x1"]))
    y1 = max(0, int(b["y1"]))
    x2 = min(w_img, int(b["x2"]))
    y2 = min(h_img, int(head_y2))

    if x2 <= x1 + 5 or y2 <= y1 + 5:
        return False, 0.4  # too small to analyze

    head_roi = img[y1:y2, x1:x2]
    if head_roi.size == 0:
        return False, 0.4

    # Helmets tend to have uniform color and rounded edges
    gray = cv2.cvtColor(head_roi, cv2.COLOR_BGR2GRAY)
    # Standard deviation: low std = uniform helmet surface
    std_dev = float(gray.std())
    mean_val = float(gray.mean())

    # A helmet typically has relatively low variance and medium brightness
    # Human hair tends to have high contrast edges
    if std_dev < 35 and 30 < mean_val < 220:
        # Likely a helmet — relatively uniform surface
        return True, min(0.78, person_det["confidence"])
    else:
        # Not clear — could be hair, no helmet visible
        return False, min(0.72, person_det["confidence"])


# ── Violation Detection Rules ─────────────────────────────────────────────────

def check_triple_riding(
    image: np.ndarray, detections: List[dict]
) -> List[dict]:
    """
    Rule: motorcycle detected + ≥3 persons whose bbox center
    falls inside the motorcycle bbox → triple riding violation.
    """
    violations = []
    motorcycles = get_by_class(detections, 3)   # class 3 = motorcycle
    persons = get_by_class(detections, 0)         # class 0 = person

    for moto in motorcycles:
        riders = [
            p for p in persons
            if center_in_bbox(bbox_center(p), moto) or bbox_iou(p, moto) > 0.15
        ]
        if len(riders) >= 3:
            # Confidence = motorcycle confidence × 0.9 (high rule certainty)
            conf = round(moto["confidence"] * 0.90, 4)
            violations.append({
                "violation_type": "triple_riding",
                "severity": "high",
                "confidence": conf,
                "detection_confidence": moto["confidence"],
                "reason": (
                    f"Motorcycle detected with {len(riders)} persons "
                    f"(IoU/spatial overlap). Motor Vehicle Act permits max 2 riders."
                ),
                "rule_applied": "Max 2 persons per two-wheeler (Section 128 MVA)",
                "suggested_action": "Issue Challan — Fine ₹1,000",
                "evidence_description": (
                    f"Motorcycle (conf {moto['confidence']:.2f}) with "
                    f"{len(riders)} overlapping persons detected."
                ),
                "bbox": moto["bbox"],
                "trigger_detection": moto,
                "metadata": {"rider_count": len(riders), "motorcycle_confidence": moto["confidence"]},
            })

    return violations


def check_helmet_missing(
    image: np.ndarray,
    detections: List[dict],
    helmets: List[dict] = None,
) -> List[dict]:
    """
    Rule: motorcycle detected + person whose center is inside motorcycle bbox
    + helmet model prediction OR head ROI analysis suggests no helmet → helmet missing violation.
    """
    violations = []
    motorcycles = get_by_class(detections, 3)
    persons = get_by_class(detections, 0)

    for moto in motorcycles:
        riders = [
            p for p in persons
            if center_in_bbox(bbox_center(p), moto) or bbox_iou(p, moto) > 0.2
        ]

        for rider in riders:
            # Try custom helmet model detection list first
            helmet_found = None
            certainty = 0.0
            detection_method = ""

            if helmets:
                # Find helmet boxes overlapping with the rider
                overlapping_helmets = []
                for h in helmets:
                    # Helmet box center inside rider bbox OR IoU > 0.05
                    if center_in_bbox(bbox_center(h), rider) or bbox_iou(h, rider) > 0.05:
                        overlapping_helmets.append(h)
                
                if overlapping_helmets:
                    # Use the most confident overlapping box
                    overlapping_helmets.sort(key=lambda x: x["confidence"], reverse=True)
                    best_h = overlapping_helmets[0]
                    name_lower = best_h["class_name"].lower()
                    certainty = best_h["confidence"]

                    if any(term in name_lower for term in ["no", "without"]):
                        helmet_found = False
                        detection_method = f"Custom YOLO Model (Detected {best_h['class_name']})"
                    elif any(term in name_lower for term in ["helmet", "with", "safety"]):
                        helmet_found = True
                        detection_method = f"Custom YOLO Model (Detected {best_h['class_name']})"

            # Fall back to head ROI heuristic if YOLO helmet check is inconclusive
            if helmet_found is None:
                h_found, certainty = head_has_helmet(image, rider)
                helmet_found = h_found
                detection_method = "OpenCV Head ROI Heuristic"

            if not helmet_found:
                conf = round(min(moto["confidence"], rider["confidence"]) * 0.85, 4)
                violations.append({
                    "violation_type": "helmet_missing",
                    "severity": "high",
                    "confidence": conf,
                    "detection_confidence": rider["confidence"],
                    "reason": (
                        "Rider on motorcycle detected without visible helmet. "
                        f"Analysis method: {detection_method}."
                    ),
                    "rule_applied": "Helmet mandatory for two-wheeler riders (Section 129 MVA)",
                    "suggested_action": "Issue Challan — Fine ₹1,000",
                    "evidence_description": (
                        f"Person (conf {rider['confidence']:.2f}) on motorcycle "
                        f"(conf {moto['confidence']:.2f}). {detection_method}: no helmet detected (conf/certainty: {certainty:.2f})."
                    ),
                    "bbox": rider["bbox"],
                    "trigger_detection": rider,
                    "metadata": {
                        "head_roi_certainty": certainty,
                        "motorcycle_confidence": moto["confidence"],
                        "rider_confidence": rider["confidence"],
                        "detection_method": detection_method,
                    },
                })

    return violations


def check_red_light(
    image: np.ndarray, detections: List[dict]
) -> List[dict]:
    """
    Rule: traffic light detected + dominant color in its top-third is red
    + a vehicle is present in the image → potential red light violation.

    Note: Without frame history we cannot confirm vehicle motion,
    so we flag it as "potential" with adjusted confidence.
    """
    violations = []
    traffic_lights = get_by_class(detections, 9)
    vehicles = get_by_classes(detections, {1, 2, 3, 5, 7})

    if not vehicles:
        return violations

    for light in traffic_lights:
        b = light["bbox"]
        # Analyze top third of traffic light bbox (red is on top)
        top_third_y2 = int(b["y1"] + (b["y2"] - b["y1"]) / 3)
        color = dominant_color_in_roi(
            image,
            int(b["x1"]), int(b["y1"]),
            int(b["x2"]), top_third_y2
        )
        if color == "red":
            # Find vehicles near the intersection zone (bottom half of image)
            img_h = image.shape[0]
            near_vehicles = [
                v for v in vehicles
                if v["bbox"]["y1"] > img_h * 0.3  # vehicle in lower portion
            ]
            if near_vehicles:
                # Use traffic light confidence × 0.80 (color analysis uncertainty)
                conf = round(light["confidence"] * 0.80, 4)
                violations.append({
                    "violation_type": "red_light",
                    "severity": "critical",
                    "confidence": conf,
                    "detection_confidence": light["confidence"],
                    "reason": (
                        "Traffic signal detected showing RED. "
                        "Vehicle present in intersection zone during red phase."
                    ),
                    "rule_applied": "Vehicle must stop at red signal (Section 119 MVA)",
                    "suggested_action": "Issue Challan — Fine ₹5,000",
                    "evidence_description": (
                        f"Traffic light (conf {light['confidence']:.2f}) red phase confirmed "
                        f"via top-ROI color analysis. {len(near_vehicles)} vehicle(s) in zone."
                    ),
                    "bbox": light["bbox"],
                    "trigger_detection": light,
                    "metadata": {
                        "signal_color": color,
                        "vehicles_in_zone": len(near_vehicles),
                        "light_confidence": light["confidence"],
                    },
                })

    return violations


def check_stop_line(
    image: np.ndarray, detections: List[dict]
) -> List[dict]:
    """
    Rule: vehicle bbox bottom edge is in the bottom 15% of the image
    (approximating proximity to stop line) during red signal.

    This is a geometric heuristic — confidence is reduced accordingly.
    """
    violations = []
    vehicles = get_by_classes(detections, {2, 3, 5, 7})
    traffic_lights = get_by_class(detections, 9)

    # Only flag stop line if a red signal is also present
    red_signal = False
    for light in traffic_lights:
        b = light["bbox"]
        top_third_y2 = int(b["y1"] + (b["y2"] - b["y1"]) / 3)
        color = dominant_color_in_roi(
            image, int(b["x1"]), int(b["y1"]), int(b["x2"]), top_third_y2
        )
        if color == "red":
            red_signal = True
            break

    if not red_signal:
        return violations

    img_h = image.shape[0]
    stop_line_zone_y = img_h * 0.82  # approx position of stop line

    for v in vehicles:
        if v["bbox"]["y2"] > stop_line_zone_y:
            conf = round(v["confidence"] * 0.65, 4)  # lower confidence — heuristic position
            violations.append({
                "violation_type": "stop_line",
                "severity": "medium",
                "confidence": conf,
                "detection_confidence": v["confidence"],
                "reason": (
                    "Vehicle detected crossing estimated stop line zone during red signal. "
                    "Vehicle bottom edge is past the stop line ROI threshold."
                ),
                "rule_applied": "Vehicle must stop before stop line at red signal (Rule 8, Traffic Signs Manual)",
                "suggested_action": "Issue Challan — Fine ₹500",
                "evidence_description": (
                    f"{v['class_name']} (conf {v['confidence']:.2f}) bottom at "
                    f"y={v['bbox']['y2']:.0f}px, stop-line ROI at y={stop_line_zone_y:.0f}px."
                ),
                "bbox": v["bbox"],
                "trigger_detection": v,
                "metadata": {
                    "vehicle_bottom_y": v["bbox"]["y2"],
                    "stop_line_y_threshold": stop_line_zone_y,
                    "red_signal_present": True,
                },
            })

    return violations


def check_wrong_side(
    image: np.ndarray, detections: List[dict]
) -> List[dict]:
    """
    Rule: vehicle detected in leftmost 20% of image width travelling
    against expected traffic direction (India drives on left).
    Confidence is low as this is a heuristic without frame history.
    """
    violations = []
    vehicles = get_by_classes(detections, {2, 3, 5, 7})
    img_w = image.shape[1]

    for v in vehicles:
        center_x = (v["bbox"]["x1"] + v["bbox"]["x2"]) / 2
        # In left-hand traffic, vehicles on extreme right side driving toward camera
        # indicate wrong-side. We use a positional heuristic only.
        if center_x < img_w * 0.20:  # leftmost lane, heading right → wrong side
            conf = round(v["confidence"] * 0.55, 4)  # explicitly low confidence
            violations.append({
                "violation_type": "wrong_side",
                "severity": "critical",
                "confidence": conf,
                "detection_confidence": v["confidence"],
                "reason": (
                    "Vehicle detected in the extreme left zone with heading "
                    "inconsistent with left-hand traffic rules. "
                    "Positional heuristic (low confidence — requires video context)."
                ),
                "rule_applied": "Drive on left side of road (Section 112 MVA)",
                "suggested_action": "Verify with video footage — Issue Challan if confirmed",
                "evidence_description": (
                    f"{v['class_name']} center_x={center_x:.0f}px "
                    f"({center_x/img_w*100:.0f}% from left). Image width={img_w}px."
                ),
                "bbox": v["bbox"],
                "trigger_detection": v,
                "metadata": {
                    "center_x_fraction": center_x / img_w,
                    "image_width": img_w,
                    "heuristic": "positional",
                },
            })

    return violations


def check_seatbelt(
    image: np.ndarray, detections: List[dict]
) -> List[dict]:
    """
    Rule: car detected + person visible in driver position
    + no diagonal seatbelt band detected in torso ROI.
    """
    violations = []
    cars = get_by_class(detections, 2)
    persons = get_by_class(detections, 0)

    for car in cars:
        # Find persons overlapping with car (driver candidates)
        drivers = [
            p for p in persons
            if bbox_iou(p, car) > 0.15
        ]
        for driver in drivers:
            # Analyze upper 60% of person bbox for diagonal seatbelt band
            b = driver["bbox"]
            torso_y2 = b["y1"] + (b["y2"] - b["y1"]) * 0.6
            seatbelt_score = has_diagonal_band_in_roi(
                image,
                int(b["x1"]), int(b["y1"]),
                int(b["x2"]), int(torso_y2)
            )

            if seatbelt_score < 0.4:  # no clear diagonal band found
                conf = round(min(car["confidence"], driver["confidence"]) * 0.70, 4)
                violations.append({
                    "violation_type": "seatbelt_missing",
                    "severity": "medium",
                    "confidence": conf,
                    "detection_confidence": driver["confidence"],
                    "reason": (
                        "Driver detected in vehicle without visible seatbelt diagonal. "
                        "Torso ROI analysis found no diagonal line pattern consistent with seatbelt."
                    ),
                    "rule_applied": "Seatbelt mandatory for driver and passengers (Section 138(3) MVA)",
                    "suggested_action": "Issue Challan — Fine ₹1,000",
                    "evidence_description": (
                        f"Person (conf {driver['confidence']:.2f}) in car (conf {car['confidence']:.2f}). "
                        f"Diagonal band score: {seatbelt_score:.2f} (threshold: 0.4)."
                    ),
                    "bbox": driver["bbox"],
                    "trigger_detection": driver,
                    "metadata": {
                        "seatbelt_band_score": seatbelt_score,
                        "car_confidence": car["confidence"],
                        "driver_confidence": driver["confidence"],
                    },
                })

    return violations


# ── Illegal Parking Rule ──────────────────────────────────────────────────────

_parking_history = {}  # track_id -> list of bboxes

def check_illegal_parking(
    image: np.ndarray, detections: List[dict]
) -> List[dict]:
    """
    Rule: vehicle inside parking-restricted zone (bottom 30% of the image).
    For video tracking (with track_id): vehicle is static (low bbox variance) across at least 5 frames.
    For single frame (no track_id): vehicle bbox is large (implying parked/stationary close to camera).
    """
    violations = []
    # Vehicles: car (2), motorcycle (3), bus (5), truck (7)
    vehicles = get_by_classes(detections, {2, 3, 5, 7})
    img_h, img_w = image.shape[:2]
    restricted_zone_y = img_h * 0.70  # bottom 30%

    for v in vehicles:
        b = v["bbox"]
        # Check if vehicle is in the restricted zone (bottom 30% of image)
        # If the bottom edge of bbox is below the restricted line
        if b["y2"] > restricted_zone_y:
            track_id = v.get("track_id")
            is_static = False
            confidence_factor = 0.85

            if track_id is not None:
                # Update history
                if track_id not in _parking_history:
                    _parking_history[track_id] = []
                _parking_history[track_id].append(b)
                # Keep last 15 frames
                if len(_parking_history[track_id]) > 15:
                    _parking_history[track_id].pop(0)

                # Check if static: need at least 5 frames
                history = _parking_history[track_id]
                if len(history) >= 5:
                    # Calculate variance of bbox centers
                    centers = []
                    for bbox in history:
                        cx = (bbox["x1"] + bbox["x2"]) / 2
                        cy = (bbox["y1"] + bbox["y2"]) / 2
                        centers.append((cx, cy))
                    
                    xs = [c[0] for c in centers]
                    ys = [c[1] for c in centers]
                    var_x = np.var(xs)
                    var_y = np.var(ys)
                    
                    # If variance is very low (std dev < 3 pixels, variance < 9), stationary
                    if var_x < 9.0 and var_y < 9.0:
                        is_static = True
                        confidence_factor = 0.90
            else:
                # Single frame heuristic: large bbox size (e.g. width > 15% and height > 15% of frame)
                w = b["x2"] - b["x1"]
                h = b["y2"] - b["y1"]
                if w > img_w * 0.15 and h > img_h * 0.15:
                    is_static = True
                    confidence_factor = 0.70  # lower confidence due to single frame heuristic

            if is_static:
                conf = round(v["confidence"] * confidence_factor, 4)
                violations.append({
                    "violation_type": "illegal_parking",
                    "severity": "medium",
                    "confidence": conf,
                    "detection_confidence": v["confidence"],
                    "reason": (
                        f"Vehicle detected stationary in a designated No-Parking zone (bottom 30% of frame). "
                        f"Track ID: {track_id if track_id is not None else 'N/A'}."
                    ),
                    "rule_applied": "No Parking zone restriction (Section 122/177 MVA)",
                    "suggested_action": "Issue Challan — Fine ₹500",
                    "evidence_description": (
                        f"Stationary {v['class_name']} (conf {v['confidence']:.2f}) inside restricted parking zone. "
                        f"Position: bottom edge y={b['y2']:.0f}px (threshold y={restricted_zone_y:.0f}px)."
                    ),
                    "bbox": b,
                    "trigger_detection": v,
                    "metadata": {
                        "track_id": track_id,
                        "restricted_zone_y": restricted_zone_y,
                        "vehicle_bottom_y": b["y2"],
                        "is_static": is_static,
                    }
                })

    return violations


# ── Main entry point ──────────────────────────────────────────────────────────

def analyze_violations(
    image: np.ndarray,
    detections: List[dict],
    helmets: List[dict] = None,
    plates: List[dict] = None,
) -> List[dict]:
    """
    Run all violation rules against the detection list.

    Returns list of violation dicts. Each violation is the direct result
    of real YOLO detections passed through deterministic rules.
    No randomness, no hardcoded violations.
    """
    if not detections:
        return []

    all_violations = []

    # Run each rule independently
    try:
        all_violations.extend(check_triple_riding(image, detections))
    except Exception as e:
        logger.warning(f"Violation rule check_triple_riding raised: {e}")

    try:
        all_violations.extend(check_helmet_missing(image, detections, helmets))
    except Exception as e:
        logger.warning(f"Violation rule check_helmet_missing raised: {e}")

    try:
        all_violations.extend(check_red_light(image, detections))
    except Exception as e:
        logger.warning(f"Violation rule check_red_light raised: {e}")

    try:
        all_violations.extend(check_stop_line(image, detections))
    except Exception as e:
        logger.warning(f"Violation rule check_stop_line raised: {e}")

    try:
        all_violations.extend(check_wrong_side(image, detections))
    except Exception as e:
        logger.warning(f"Violation rule check_wrong_side raised: {e}")

    try:
        all_violations.extend(check_seatbelt(image, detections))
    except Exception as e:
        logger.warning(f"Violation rule check_seatbelt raised: {e}")

    try:
        all_violations.extend(check_illegal_parking(image, detections))
    except Exception as e:
        logger.warning(f"Violation rule check_illegal_parking raised: {e}")

    logger.debug(f"Violation engine: {len(all_violations)} violations from {len(detections)} detections")
    return all_violations

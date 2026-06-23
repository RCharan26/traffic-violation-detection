"""
Detect router — coordinates the entire computer vision pipeline and saves results to the database.

ANPR POLICY:
  - license_plate values stored in DB come EXCLUSIVELY from EasyOCR inference on real plate crops.
  - No registration number is ever fabricated, guessed, or auto-completed.
  - If OCR cannot read the plate, the record stores NULL and reports OCR failure honestly.
"""
import time
import logging
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.config import settings
from app.routers.auth import get_current_user
from app.models.image import Image
from app.models.vehicle import Vehicle, LicensePlate
from app.models.violation import Violation
from app.schemas.analytics import DetectionPipelineResult

# Import services
from app.services import preprocessing
from app.services.detection import DetectionService
from app.services import ocr_service
from app.services import violation_engine
from app.services import evidence_service

router = APIRouter(prefix="/detect", tags=["detect"])
logger = logging.getLogger(__name__)


@router.post("/{image_id}", response_model=DetectionPipelineResult)
async def process_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Triggers the complete detection pipeline on an already uploaded image.
    This runs synchronously for direct feedback, executing all models and rules.
    """
    # 1. Fetch image from DB
    result = await db.execute(select(Image).where(Image.id == image_id))
    img_record = result.scalar_one_or_none()

    if not img_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image with ID {image_id} not found",
        )

    # If already processed, return stored results from database
    if img_record.status == "completed":
        # Get vehicles, violations, license_plates
        v_res = await db.execute(select(Vehicle).where(Vehicle.image_id == image_id))
        vehicles = v_res.scalars().all()

        viol_res = await db.execute(select(Violation).where(Violation.image_id == image_id))
        violations = viol_res.scalars().all()

        lp_res = await db.execute(select(LicensePlate).where(LicensePlate.image_id == image_id))
        plates = lp_res.scalars().all()

        return DetectionPipelineResult(
            image_id=image_id,
            status=img_record.status,
            vehicles_detected=len(vehicles),
            violations_found=len(violations),
            processing_time_ms=img_record.processing_time_ms or 0.0,
            vehicles=[{"class_id": v.yolo_class_id, "class_name": v.yolo_class_name, "confidence": v.confidence, "bbox": {"x1": v.bbox_x1, "y1": v.bbox_y1, "x2": v.bbox_x2, "y2": v.bbox_y2}} for v in vehicles],
            violations=[
                {
                    "id": vl.id,
                    "violation_type": vl.violation_type,
                    "severity": vl.severity,
                    "reason": vl.reason,
                    "rule_applied": vl.rule_applied,
                    "suggested_action": vl.suggested_action,
                    "confidence": vl.confidence,
                    "license_plate": vl.license_plate,
                    "evidence_image_path": vl.evidence_image_path,
                }
                for vl in violations
            ],
            license_plates=[
                {
                    "plate_text":      lp.plate_text,
                    "raw_ocr_text":    lp.raw_ocr_text,
                    "ocr_confidence":  lp.ocr_confidence,
                    "plate_crop_path": lp.plate_crop_path,
                    "ocr_engine":      "EasyOCR", # default for legacy DB records
                }
                for lp in plates
            ],
            detection_ms=img_record.detection_ms or 0.0,
            ocr_ms=img_record.ocr_ms or 0.0,
            preprocessing_ms=img_record.preprocessing_ms or 0.0,
            evidence_ms=img_record.evidence_ms or 0.0,
        )

    t_start = time.perf_counter()

    try:
        # Mark as processing
        img_record.status = "processing"
        await db.commit()
        await db.refresh(img_record)
        logger.info(f"[PIPELINE] Image {image_id} — status → processing")

        # ── Stage 1: OpenCV Preprocessing ────────────────────────────────────
        logger.info(f"[PIPELINE] Stage 1 — OpenCV preprocessing | file: {img_record.file_path}")
        prep_results = preprocessing.preprocess(img_record.file_path)
        enhanced_image = prep_results["enhanced_image"]
        original_image = prep_results["original_image"]
        logger.info(
            f"[PIPELINE] Stage 1 done — "
            f"{prep_results['width']}×{prep_results['height']}px | "
            f"steps: {prep_results['steps_applied']} | "
            f"{prep_results['duration_ms']:.1f}ms"
        )

        img_record.preprocessing_ms = prep_results["duration_ms"]
        img_record.width = prep_results["width"]
        img_record.height = prep_results["height"]

        # ── Stage 2: YOLO Inference ───────────────────────────────────────────
        logger.info(f"[PIPELINE] Stage 2 — Multi-model YOLO inference...")
        det_results = DetectionService.run_inference(enhanced_image)
        detections  = det_results["detections"]
        img_record.detection_ms = det_results["duration_ms"]
        logger.info(
            f"[PIPELINE] Stage 2 done — "
            f"{len(detections)} objects | "
            f"model_version: {det_results['model_version']} | "
            f"{det_results['duration_ms']:.1f}ms"
        )

        # ── Stage 3: Save vehicle detections to DB ────────────────────────────
        logger.info(f"[PIPELINE] Stage 3 — Saving {len(detections)} vehicle detections to DB...")
        db_vehicles = []
        for det in detections:
            v_model = Vehicle(
                image_id=image_id,
                yolo_class_id=det["class_id"],
                yolo_class_name=det["class_name"],
                confidence=det["confidence"],
                bbox_x1=det["bbox"]["x1"],
                bbox_y1=det["bbox"]["y1"],
                bbox_x2=det["bbox"]["x2"],
                bbox_y2=det["bbox"]["y2"],
                vehicle_category=det["vehicle_category"],
            )
            db.add(v_model)
            db_vehicles.append(v_model)

        await db.flush()  # to assign IDs
        logger.info(f"[PIPELINE] Stage 3 done — {len(db_vehicles)} vehicle rows written.")

        # ── Stage 4: EasyOCR License Plate Recognition ────────────────────────
        logger.info(
            f"[PIPELINE] Stage 4 — EasyOCR plate recognition | "
            f"YOLO plate regions available: {len(det_results.get('plates', []))}"
        )
        ocr_start    = time.perf_counter()
        ocr_results = ocr_service.extract_plates(
            enhanced_image,
            detections,
            det_results.get("plates"),
            settings.EVIDENCE_DIR,
            image_id,
        )
        img_record.ocr_ms = (time.perf_counter() - ocr_start) * 1000
        logger.info(
            f"[PIPELINE] Stage 4 done — "
            f"{len(ocr_results)} plate(s) recognized | "
            f"{img_record.ocr_ms:.1f}ms"
        )

        db_plates = []
        for plate in ocr_results:
            # plate_text = raw_ocr_text stripped and uppercased ONLY (no char substitutions)
            # raw_ocr_text = EXACT EasyOCR output, never modified
            # ocr_confidence = DIRECT from EasyOCR, never fabricated
            p_model = LicensePlate(
                image_id=image_id,
                plate_text=plate["plate_text"],        # case/whitespace only normalization
                raw_ocr_text=plate["raw_ocr_text"],    # EXACT EasyOCR string
                ocr_confidence=plate["ocr_confidence"], # DIRECT from EasyOCR
                bbox_x1=plate["bbox"]["x1"],
                bbox_y1=plate["bbox"]["y1"],
                bbox_x2=plate["bbox"]["x2"],
                bbox_y2=plate["bbox"]["y2"],
                plate_crop_path=plate["plate_crop_path"],
            )
            # Find matching vehicle based on vehicle_idx mapping if exists
            v_idx = plate.get("vehicle_idx")
            if v_idx is not None and v_idx < len(db_vehicles):
                p_model.vehicle_id = db_vehicles[v_idx].id

            db.add(p_model)
            db_plates.append(p_model)

        await db.flush()
        logger.info(f"[PIPELINE] Stage 4 — {len(db_plates)} plate row(s) written to DB.")

        # Find most confident plate text as fallback for the violations
        primary_plate = None
        if db_plates:
            db_plates.sort(key=lambda p: p.ocr_confidence or 0.0, reverse=True)
            primary_plate = db_plates[0].plate_text
            logger.info(f"[PIPELINE] Primary plate text for violation records: '{primary_plate}'")
        else:
            logger.info(
                "[PIPELINE] No plate text recognized — "
                "violation records will have license_plate=None."
            )

        # ── Stage 5: Rule-Based Violation Engine ─────────────────────────────
        logger.info(f"[PIPELINE] Stage 5 — Running violation engine...")
        violations = violation_engine.analyze_violations(
            enhanced_image,
            detections,
            det_results.get("helmets"),
            det_results.get("plates"),
        )
        logger.info(
            f"[PIPELINE] Stage 5 done — "
            f"{len(violations)} violation(s) detected: "
            + (', '.join(v['violation_type'] for v in violations) if violations else 'none')
        )

        # ── Stage 6: Annotated Evidence Image ────────────────────────────────
        logger.info(f"[PIPELINE] Stage 6 — Generating annotated evidence image...")
        ev_start = time.perf_counter()
        evidence_path = evidence_service.generate_evidence_image(
            original_image=original_image,
            detections=detections,
            violations=violations,
            plates=ocr_results,
            image_id=image_id,
            evidence_dir=settings.EVIDENCE_DIR,
            timestamp=img_record.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        )
        img_record.evidence_ms = (time.perf_counter() - ev_start) * 1000
        logger.info(
            f"[PIPELINE] Stage 6 done — evidence saved to {evidence_path} | "
            f"{img_record.evidence_ms:.1f}ms"
        )

        # ── Stage 7: Save violations to DB ───────────────────────────────────
        logger.info(f"[PIPELINE] Stage 7 — Saving {len(violations)} violation(s) to DB...")
        db_violations = []
        for viol in violations:
            # Match plate number to triggering vehicle if possible
            plate_number = primary_plate
            v_id = None
            if viol.get("trigger_detection") and viol["trigger_detection"].get("class_id") in {1, 2, 3, 5, 7}:
                # Find matching db vehicle id by overlapping bounding boxes
                trigger = viol["trigger_detection"]
                for db_v in db_vehicles:
                    if (
                        abs(db_v.bbox_x1 - trigger["bbox"]["x1"]) < 1.0
                        and abs(db_v.bbox_y1 - trigger["bbox"]["y1"]) < 1.0
                    ):
                        v_id = db_v.id
                        # Check if vehicle has plate
                        plate_res = await db.execute(
                            select(LicensePlate).where(LicensePlate.vehicle_id == v_id)
                        )
                        associated_plate = plate_res.scalar_one_or_none()
                        if associated_plate:
                            plate_number = associated_plate.plate_text
                        break

            viol_model = Violation(
                image_id=image_id,
                vehicle_id=v_id,
                violation_type=viol["violation_type"],
                severity=viol["severity"],
                reason=viol["reason"],
                rule_applied=viol["rule_applied"],
                suggested_action=viol["suggested_action"],
                evidence_description=viol["evidence_description"],
                confidence=viol["confidence"],
                detection_confidence=viol["detection_confidence"],
                bbox_x1=viol["bbox"]["x1"],
                bbox_y1=viol["bbox"]["y1"],
                bbox_x2=viol["bbox"]["x2"],
                bbox_y2=viol["bbox"]["y2"],
                license_plate=plate_number,
                evidence_image_path=evidence_path,
                metadata_=viol.get("metadata", {}),
                status="pending",
            )
            db.add(viol_model)
            db_violations.append(viol_model)

        # ── Stage 8: Finalize and commit ─────────────────────────────────────
        t_duration = (time.perf_counter() - t_start) * 1000
        img_record.processing_time_ms = t_duration
        img_record.status = "completed"
        img_record.processed_at = datetime.utcnow()

        logger.info(
            f"[PIPELINE] COMPLETE — image_id={image_id} | "
            f"vehicles={len(db_vehicles)} | "
            f"plates={len(db_plates)} | "
            f"violations={len(db_violations)} | "
            f"total_time={t_duration:.1f}ms"
        )

        await db.commit()

        # Refresh to populate generated IDs
        for v in db_violations:
            await db.refresh(v)

        return DetectionPipelineResult(
            image_id=image_id,
            status=img_record.status,
            vehicles_detected=len(db_vehicles),
            violations_found=len(db_violations),
            processing_time_ms=t_duration,
            vehicles=[{"class_id": v.yolo_class_id, "class_name": v.yolo_class_name, "confidence": v.confidence, "bbox": {"x1": v.bbox_x1, "y1": v.bbox_y1, "x2": v.bbox_x2, "y2": v.bbox_y2}} for v in db_vehicles],
            violations=[
                {
                    "id": vl.id,
                    "violation_type": vl.violation_type,
                    "severity": vl.severity,
                    "reason": vl.reason,
                    "rule_applied": vl.rule_applied,
                    "suggested_action": vl.suggested_action,
                    "confidence": vl.confidence,
                    "license_plate": vl.license_plate,
                    "evidence_image_path": vl.evidence_image_path,
                }
                for vl in db_violations
            ],
            # raw_ocr_text = EXACT OCR output (authoritative display field)
            # plate_text   = uppercase/whitespace normalized (same characters)
            # ocr_confidence = DIRECT from OCR, never fabricated
            license_plates=[
                {
                    "plate_text":     lp.plate_text,
                    "raw_ocr_text":   lp.raw_ocr_text,
                    "ocr_confidence": lp.ocr_confidence,
                    "plate_crop_path": lp.plate_crop_path,
                    "ocr_engine":     ocr_results[i]["ocr_engine"] if i < len(ocr_results) else "EasyOCR",
                }
                for i, lp in enumerate(db_plates)
            ],
            detection_ms=det_results["duration_ms"],
            ocr_ms=img_record.ocr_ms or 0.0,
            preprocessing_ms=img_record.preprocessing_ms or 0.0,
            evidence_ms=img_record.evidence_ms or 0.0,
        )

    except Exception as e:
        logger.error(f"Detection pipeline failed for image {image_id}: {e}", exc_info=True)
        img_record.status = "failed"
        img_record.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection pipeline execution failed: {e}",
        )


@router.get("/anpr/{image_id}")
async def get_anpr_result(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Returns the ANPR result for a processed image in the spec-compliant JSON format.

    All license plate text comes exclusively from EasyOCR inference.
    No registration numbers are ever fabricated, guessed, or auto-completed.

    Response schema:
      If plate detected AND OCR succeeded:
        { plate_detected: true, ocr_success: true, license_plate: "...", raw_ocr_text: "...",
          ocr_confidence: 0.978, plate_image_path: "...", timestamp: "..." }

      If plate detected BUT OCR failed:
        { plate_detected: true, ocr_success: false, license_plate: null,
          message: "OCR could not recognize the license plate." }

      If no plate detected:
        { plate_detected: false, license_plate: null,
          message: "No license plate detected." }
    """
    # Fetch image record
    result = await db.execute(select(Image).where(Image.id == image_id))
    img_record = result.scalar_one_or_none()

    if not img_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image with ID {image_id} not found",
        )

    if img_record.status not in ("completed", "failed"):
        return {
            "plate_detected": False,
            "license_plate": None,
            "message": f"Image has not been processed yet (status: {img_record.status}).",
        }

    # Fetch license plate records from DB
    lp_res = await db.execute(
        select(LicensePlate).where(LicensePlate.image_id == image_id)
    )
    plates = lp_res.scalars().all()

    # Check whether a YOLO plate bbox was detected (at least one plate region found)
    # If plates list is non-empty, at least one region produced OCR output
    if not plates:
        # Check if any vehicles were detected (which would have triggered OCR attempts)
        v_res = await db.execute(select(Vehicle).where(Vehicle.image_id == image_id))
        vehicles = v_res.scalars().all()

        if vehicles:
            # Vehicles found but no plate OCR succeeded
            return {
                "plate_detected": True,
                "ocr_success": False,
                "license_plate": None,
                "message": (
                    "License Plate Detected. "
                    "Status: OCR Failed. "
                    "Reason: Plate could not be read due to blur, low resolution, "
                    "occlusion, glare, angle, or poor lighting."
                ),
            }
        else:
            return {
                "plate_detected": False,
                "license_plate": None,
                "message": "No license plate detected.",
            }

    # Return the most confident plate result
    best_plate = max(plates, key=lambda p: p.ocr_confidence or 0.0)

    return {
        "plate_detected": True,
        "ocr_success": True,
        # raw_ocr_text = EXACT EasyOCR output, character-for-character
        "license_plate": best_plate.raw_ocr_text,
        "plate_text_normalized": best_plate.plate_text,
        # DIRECT from EasyOCR — never fabricated
        "ocr_confidence": best_plate.ocr_confidence,
        "plate_image_path": best_plate.plate_crop_path,
        "timestamp": img_record.processed_at.isoformat() if img_record.processed_at else None,
        "image_id": image_id,
    }

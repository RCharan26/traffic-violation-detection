"""
Evidence Generation Service.

Takes the original image + detections + violations,
draws bounding boxes and labels using OpenCV,
and saves the annotated evidence image to disk.
"""
import cv2
import numpy as np
import time
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# ── Color palette (BGR) ───────────────────────────────────────────────────────
COLORS = {
    "vehicle":    (59,  130, 246),   # blue — vehicle box
    "person":     (16,  185, 129),   # green — person
    "signal":     (245, 158, 11),    # amber — traffic light
    "violation":  (239, 68,  68),    # red — violation highlight
    "plate":      (168, 85,  247),   # purple — license plate
}

VIOLATION_COLORS = {
    "helmet_missing":   (239, 68,  68),
    "seatbelt_missing": (249, 115, 22),
    "triple_riding":    (236, 72,  153),
    "wrong_side":       (220, 38,  38),
    "red_light":        (239, 68,  68),
    "stop_line":        (251, 146, 60),
    "illegal_parking":  (234, 179, 8),
}

SEVERITY_COLORS = {
    "critical": (220, 38,  38),
    "high":     (239, 68,  68),
    "medium":   (245, 158, 11),
    "low":      (34,  197, 94),
}


def _draw_bbox(
    img: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    color: tuple,
    label: str,
    confidence: float,
    thickness: int = 2,
):
    """Draw a bounding box with label and confidence on the image."""
    cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

    label_text = f"{label} {confidence:.0%}"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.5
    font_thickness = 1
    (text_w, text_h), baseline = cv2.getTextSize(label_text, font, font_scale, font_thickness)

    # Label background
    label_y = max(y1 - 5, text_h + 4)
    cv2.rectangle(
        img,
        (x1, label_y - text_h - 4),
        (x1 + text_w + 4, label_y + baseline),
        color,
        -1,
    )
    cv2.putText(
        img, label_text,
        (x1 + 2, label_y - 2),
        font, font_scale,
        (255, 255, 255),
        font_thickness,
        cv2.LINE_AA,
    )


def _add_watermark(img: np.ndarray, image_id: int, timestamp: str):
    """Add TrafficVision AI watermark and metadata bar at bottom."""
    h, w = img.shape[:2]
    bar_h = 36
    bar = np.zeros((bar_h, w, 3), dtype=np.uint8)
    bar[:] = (15, 23, 42)  # dark navy

    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(bar, f"TrafficVision AI — Image #{image_id} — {timestamp}",
                (8, 24), font, 0.5, (148, 163, 184), 1, cv2.LINE_AA)
    cv2.putText(bar, "EVIDENCE", (w - 100, 24), font, 0.5, (239, 68, 68), 1, cv2.LINE_AA)

    return np.vstack([img, bar])


def generate_evidence_image(
    original_image: np.ndarray,
    detections: List[Dict[str, Any]],
    violations: List[Dict[str, Any]],
    plates: List[Dict[str, Any]],
    image_id: int,
    evidence_dir: Path,
    timestamp: str = "",
) -> str:
    """
    Annotate the image with all detections and violations,
    save to evidence_dir, return the saved file path.
    """
    t0 = time.perf_counter()
    img = original_image.copy()

    # Draw vehicle/person/signal detections
    for det in detections:
        b = det["bbox"]
        cid = det["class_id"]
        if cid == 0:
            color = COLORS["person"]
        elif cid == 9:
            color = COLORS["signal"]
        else:
            color = COLORS["vehicle"]
        _draw_bbox(
            img,
            int(b["x1"]), int(b["y1"]), int(b["x2"]), int(b["y2"]),
            color,
            det["class_name"],
            det["confidence"],
            thickness=2,
        )

    # Draw license plates
    for plate in plates:
        b = plate.get("bbox", {})
        if not b:
            continue
        _draw_bbox(
            img,
            int(b.get("x1", 0)), int(b.get("y1", 0)),
            int(b.get("x2", 0)), int(b.get("y2", 0)),
            COLORS["plate"],
            plate.get("plate_text", "PLATE"),
            plate.get("ocr_confidence", 0.0),
            thickness=2,
        )

    # Draw violations (thicker, red-ish)
    for violation in violations:
        b = violation.get("bbox", {})
        if not b:
            continue
        color = VIOLATION_COLORS.get(violation["violation_type"], (239, 68, 68))
        sev_color = SEVERITY_COLORS.get(violation.get("severity", "medium"), (245, 158, 11))
        _draw_bbox(
            img,
            int(b.get("x1", 0)), int(b.get("y1", 0)),
            int(b.get("x2", 0)), int(b.get("y2", 0)),
            color,
            f"⚠ {violation['violation_type'].replace('_', ' ').upper()}",
            violation["confidence"],
            thickness=3,
        )

    # Watermark
    img = _add_watermark(img, image_id, timestamp)

    # Save
    evidence_filename = f"evidence_{image_id}.jpg"
    evidence_path = evidence_dir / evidence_filename
    cv2.imwrite(str(evidence_path), img, [cv2.IMWRITE_JPEG_QUALITY, 92])

    duration_ms = (time.perf_counter() - t0) * 1000
    logger.debug(f"Evidence image saved to {evidence_path} in {duration_ms:.1f}ms")

    return str(evidence_path)

"""
YOLOv11 Detection Service.

Wraps Ultralytics YOLO for vehicle, person, helmet, and license plate detection.
All detection results come from real model inference — no mock values.

COCO classes we care about (vehicle_model):
  0  person
  1  bicycle
  2  car
  3  motorcycle
  5  bus
  7  truck
  9  traffic light
  11 stop sign
  12 parking meter
"""
import time
import logging
import shutil
import numpy as np
from pathlib import Path
from app.config import settings, PROJECT_ROOT

logger = logging.getLogger(__name__)

# COCO class IDs that represent vehicles / road objects we care about
VEHICLE_CLASS_IDS = {0, 1, 2, 3, 5, 7, 9, 11, 12}

VEHICLE_CATEGORY_MAP = {
    0:  "pedestrian",
    1:  "two-wheeler",      # bicycle
    2:  "four-wheeler",     # car
    3:  "two-wheeler",      # motorcycle
    5:  "heavy",            # bus
    7:  "heavy",            # truck
    9:  "signal",           # traffic light
    11: "sign",             # stop sign
    12: "sign",             # parking meter
}

YOLO_CLASS_NAMES = {
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle",
    5: "bus", 7: "truck", 9: "traffic light", 11: "stop sign", 12: "parking meter",
}


class DetectionService:
    """
    Singleton wrapper around Ultralytics YOLO models:
    - Vehicle / general object detection (yolo11n.pt)   [REQUIRED — auto-downloads]
    - Custom helmet detection (helmet.pt)               [OPTIONAL — falls back to OpenCV ROI]
    - Custom license plate detection (license_plate.pt) [OPTIONAL — falls back to EasyOCR contour]

    Model resolution order for yolo11n.pt:
      1. backend/data/models/yolo11n.pt
      2. <project_root>/yolo11n.pt   (bundled with the repo)
      3. Ultralytics auto-download
    """
    _vehicle_model = None
    _helmet_model = None
    _plate_model = None

    # Track which actual file was loaded for status reporting
    _vehicle_model_path: str = "unknown"
    _helmet_model_path: str = "unknown"
    _plate_model_path: str = "unknown"

    # Sentinel flags — set to True once we confirm a model is absent
    _HELMET_UNAVAILABLE = False
    _PLATE_UNAVAILABLE = False

    # ── Vehicle Model (REQUIRED) ──────────────────────────────────────────────

    @classmethod
    def get_vehicle_model(cls):
        if cls._vehicle_model is None:
            try:
                from ultralytics import YOLO

                # Resolution order:
                #   1. Custom-trained trafficvision_vehicle.pt (training/weights or models_dir)
                #   2. Custom-trained in project root
                #   3. Legacy yolo11n.pt in models_dir
                #   4. Legacy yolo11n.pt in project root
                #   5. Ultralytics auto-download
                training_weights = PROJECT_ROOT / "training" / "weights"
                candidates = [
                    settings.MODELS_DIR / settings.YOLO_VEHICLE_CUSTOM_MODEL,
                    training_weights / settings.YOLO_VEHICLE_CUSTOM_MODEL,
                    settings.MODELS_DIR / settings.YOLO_MODEL_NAME,
                    PROJECT_ROOT / settings.YOLO_MODEL_NAME,
                ]

                loaded_path = None
                for candidate in candidates:
                    if candidate.exists():
                        logger.info(f"[MODEL] Loading Vehicle YOLO from {candidate}")
                        cls._vehicle_model = YOLO(str(candidate))
                        loaded_path = candidate
                        break

                if cls._vehicle_model is None:
                    logger.info(
                        f"[MODEL] No vehicle weights found locally. "
                        f"Triggering Ultralytics auto-download ({settings.YOLO_MODEL_NAME})..."
                    )
                    cls._vehicle_model = YOLO(settings.YOLO_MODEL_NAME)
                    loaded_path = Path(settings.YOLO_MODEL_NAME)
                    # Cache the downloaded model
                    try:
                        dest = settings.MODELS_DIR / settings.YOLO_MODEL_NAME
                        src = Path(settings.YOLO_MODEL_NAME)
                        if src.exists() and not dest.exists():
                            shutil.copy(src, dest)
                            logger.info(f"[MODEL] Cached {settings.YOLO_MODEL_NAME} to {dest}")
                    except Exception:
                        pass

                cls._vehicle_model_path = str(loaded_path) if loaded_path else "auto-downloaded"
                logger.info(f"[MODEL] Vehicle YOLO model ready: {cls._vehicle_model_path}")

            except Exception as e:
                logger.error(f"[MODEL] CRITICAL — Failed to load vehicle YOLO model: {e}", exc_info=True)
                raise RuntimeError(f"Vehicle YOLO model unavailable: {e}") from e
        return cls._vehicle_model

    # ── Helmet Model (OPTIONAL) ───────────────────────────────────────────────

    @classmethod
    def get_helmet_model(cls):
        """Load helmet model if available; return None and warn if weights are missing."""
        if cls._HELMET_UNAVAILABLE:
            return None
        if cls._helmet_model is None:
            from ultralytics import YOLO
            training_weights = PROJECT_ROOT / "training" / "weights"
            # Resolution order: custom-trained → training weights → legacy name
            candidates = [
                settings.MODELS_DIR / settings.YOLO_HELMET_CUSTOM_MODEL,
                training_weights / settings.YOLO_HELMET_CUSTOM_MODEL,
                settings.MODELS_DIR / settings.YOLO_HELMET_MODEL_NAME,
            ]

            loaded_path = None
            for candidate in candidates:
                if candidate.exists():
                    loaded_path = candidate
                    break

            if loaded_path is None:
                logger.warning(
                    f"[MODEL] OPTIONAL — Helmet weights not found. "
                    f"Checked: {[str(c) for c in candidates]}. "
                    f"Violation engine will use OpenCV head-ROI heuristic as fallback. "
                    f"To enable: run python train_helmet.py"
                )
                cls._HELMET_UNAVAILABLE = True
                return None

            try:
                cls._helmet_model = YOLO(str(loaded_path))
                cls._helmet_model_path = str(loaded_path)
                logger.info(f"[MODEL] Helmet detection model loaded from {loaded_path}")
            except Exception as e:
                logger.warning(
                    f"[MODEL] Failed to load helmet model '{loaded_path}': {e}. "
                    f"Falling back to OpenCV head-ROI heuristic."
                )
                cls._HELMET_UNAVAILABLE = True
                return None
        return cls._helmet_model

    # ── Plate Model (OPTIONAL) ────────────────────────────────────────────────

    @classmethod
    def get_plate_model(cls):
        """Load plate model if available; return None and warn if weights are missing."""
        if cls._PLATE_UNAVAILABLE:
            return None
        if cls._plate_model is None:
            from ultralytics import YOLO
            training_weights = PROJECT_ROOT / "training" / "weights"
            # Resolution order: custom-trained → training weights → legacy name
            candidates = [
                settings.MODELS_DIR / settings.YOLO_PLATE_CUSTOM_MODEL,
                training_weights / settings.YOLO_PLATE_CUSTOM_MODEL,
                settings.MODELS_DIR / settings.YOLO_PLATE_MODEL_NAME,
            ]

            loaded_path = None
            for candidate in candidates:
                if candidate.exists():
                    loaded_path = candidate
                    break

            if loaded_path is None:
                logger.warning(
                    f"[MODEL] OPTIONAL — License plate weights not found. "
                    f"Checked: {[str(c) for c in candidates]}. "
                    f"OCR service will use EasyOCR + contour-based region detection as fallback. "
                    f"To enable: run python train_plate.py"
                )
                cls._PLATE_UNAVAILABLE = True
                return None

            try:
                cls._plate_model = YOLO(str(loaded_path))
                cls._plate_model_path = str(loaded_path)
                logger.info(f"[MODEL] License plate detection model loaded from {loaded_path}")
            except Exception as e:
                logger.warning(
                    f"[MODEL] Failed to load plate model '{loaded_path}': {e}. "
                    f"Falling back to EasyOCR contour-based detection."
                )
                cls._PLATE_UNAVAILABLE = True
                return None
        return cls._plate_model

    @classmethod
    def get_model_status(cls):
        """Get loading status and paths for all YOLO models."""
        try:
            cls.get_vehicle_model()
        except Exception:
            pass
        cls.get_helmet_model()
        cls.get_plate_model()

        return {
            "vehicle": {
                "loaded": cls._vehicle_model is not None,
                "path": cls._vehicle_model_path,
                "name": Path(cls._vehicle_model_path).name if cls._vehicle_model_path != "unknown" else "unknown",
            },
            "helmet": {
                "loaded": cls._helmet_model is not None,
                "path": cls._helmet_model_path,
                "name": Path(cls._helmet_model_path).name if cls._helmet_model_path != "unknown" else "unknown",
            },
            "plate": {
                "loaded": cls._plate_model is not None,
                "path": cls._plate_model_path,
                "name": Path(cls._plate_model_path).name if cls._plate_model_path != "unknown" else "unknown",
            },
        }

    # ── Main Inference ────────────────────────────────────────────────────────

    @classmethod
    def run_inference(cls, image: np.ndarray) -> dict:
        """
        Run multi-stage YOLO inference on a BGR numpy array.

        Custom helmet/plate models are OPTIONAL — if weights are absent the service
        logs a WARNING and returns empty lists, allowing the downstream services to
        use their OpenCV / EasyOCR fallbacks.

        Returns:
            dict with keys:
                detections          — vehicle/person/signal detection dicts
                helmets             — helmet detection dicts (empty if model absent)
                plates              — license plate bbox dicts (empty if model absent)
                duration_ms         — total inference time
                model_version       — string describing which models ran
                image_shape         — (H, W, C)
                helmet_model_active — bool
                plate_model_active  — bool
        """
        t0 = time.perf_counter()
        logger.info("[INFERENCE] Starting multi-model YOLO inference...")

        # ── Load models ───────────────────────────────────────────────────────
        vehicle_model = cls.get_vehicle_model()                 # raises on failure
        helmet_model  = cls.get_helmet_model()                  # None if weights absent
        plate_model   = cls.get_plate_model()                   # None if weights absent

        helmet_mode = "YOLO" if helmet_model is not None else "OpenCV-heuristic"
        plate_mode  = "YOLO" if plate_model  is not None else "EasyOCR-contour"
        logger.info(
            f"[INFERENCE] Models active — "
            f"vehicle: yolo11n | helmet: {helmet_mode} | plate: {plate_mode}"
        )

        # ── Stage 1: Vehicle / Object Detection ───────────────────────────────
        logger.info("[INFERENCE] Stage 1 — Running vehicle/object detection (yolo11n.pt)...")
        v_results = vehicle_model.predict(
            source=image,
            conf=settings.YOLO_CONFIDENCE_THRESHOLD,
            iou=settings.YOLO_IOU_THRESHOLD,
            max_det=settings.YOLO_MAX_DETECTIONS,
            verbose=False,
        )

        vehicle_detections = []
        if v_results and len(v_results) > 0:
            result = v_results[0]
            if result.boxes is not None:
                for box in result.boxes:
                    class_id = int(box.cls[0].item())
                    if class_id not in VEHICLE_CLASS_IDS:
                        continue  # skip irrelevant COCO classes

                    confidence = float(box.conf[0].item())
                    x1, y1, x2, y2 = box.xyxy[0].tolist()

                    vehicle_detections.append({
                        "class_id": class_id,
                        "class_name": YOLO_CLASS_NAMES.get(class_id, f"class_{class_id}"),
                        "confidence": round(confidence, 4),
                        "bbox": {
                            "x1": round(x1, 2),
                            "y1": round(y1, 2),
                            "x2": round(x2, 2),
                            "y2": round(y2, 2),
                        },
                        "vehicle_category": VEHICLE_CATEGORY_MAP.get(class_id, "unknown"),
                    })

        # Structured per-class count log (INFO level — always visible)
        vehicles   = sum(1 for d in vehicle_detections if d["class_id"] in {1, 2, 3, 5, 7})
        persons    = sum(1 for d in vehicle_detections if d["class_id"] == 0)
        motos      = sum(1 for d in vehicle_detections if d["class_id"] == 3)
        signals    = sum(1 for d in vehicle_detections if d["class_id"] == 9)
        logger.info(
            f"[DETECTION] Stage 1 Results — "
            f"Total objects: {len(vehicle_detections)} | "
            f"Vehicles: {vehicles} | Persons: {persons} | "
            f"Motorcycles: {motos} | Traffic signals: {signals}"
        )

        # ── Stage 2: Helmet Detection (OPTIONAL YOLO) ─────────────────────────
        helmet_detections = []
        if helmet_model is not None:
            logger.info("[INFERENCE] Stage 2 — Running helmet detection (helmet.pt)...")
            h_results = helmet_model.predict(
                source=image,
                conf=settings.YOLO_CONFIDENCE_THRESHOLD,
                iou=settings.YOLO_IOU_THRESHOLD,
                verbose=False,
            )
            if h_results and len(h_results) > 0:
                result = h_results[0]
                if result.boxes is not None:
                    for box in result.boxes:
                        class_id   = int(box.cls[0].item())
                        class_name = helmet_model.names.get(class_id, f"class_{class_id}")
                        confidence = float(box.conf[0].item())
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        helmet_detections.append({
                            "class_id": class_id,
                            "class_name": class_name,
                            "confidence": round(confidence, 4),
                            "bbox": {
                                "x1": round(x1, 2),
                                "y1": round(y1, 2),
                                "x2": round(x2, 2),
                                "y2": round(y2, 2),
                            }
                        })
            logger.info(f"[DETECTION] Stage 2 Results — Helmet detections (YOLO): {len(helmet_detections)}")
        else:
            logger.info(
                "[INFERENCE] Stage 2 — Helmet YOLO model not loaded. "
                "Violation engine will run OpenCV head-ROI heuristic per rider."
            )

        # ── Stage 3: License Plate Detection (OPTIONAL YOLO) ─────────────────
        plate_detections = []
        if plate_model is not None:
            logger.info("[INFERENCE] Stage 3 — Running license plate detection (license_plate.pt)...")
            p_results = plate_model.predict(
                source=image,
                conf=settings.YOLO_CONFIDENCE_THRESHOLD,
                iou=settings.YOLO_IOU_THRESHOLD,
                verbose=False,
            )
            if p_results and len(p_results) > 0:
                result = p_results[0]
                if result.boxes is not None:
                    for box in result.boxes:
                        class_id   = int(box.cls[0].item())
                        class_name = plate_model.names.get(class_id, f"class_{class_id}")
                        confidence = float(box.conf[0].item())
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        plate_detections.append({
                            "class_id": class_id,
                            "class_name": class_name,
                            "confidence": round(confidence, 4),
                            "bbox": {
                                "x1": round(x1, 2),
                                "y1": round(y1, 2),
                                "x2": round(x2, 2),
                                "y2": round(y2, 2),
                            }
                        })
            logger.info(
                f"[DETECTION] Stage 3 Results — "
                f"License plate detections (YOLO): {len(plate_detections)}"
            )
            if len(plate_detections) == 0:
                logger.info(
                    "[DETECTION] Stage 3 — YOLO plate model found no plates. "
                    "OCR service will use EasyOCR with vehicle-region contour fallback."
                )
        else:
            logger.info(
                "[INFERENCE] Stage 3 — License plate YOLO model not loaded. "
                "OCR service will use EasyOCR with contour-based region search."
            )

        # ── Summary ───────────────────────────────────────────────────────────
        duration_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            f"[INFERENCE] Complete — "
            f"Objects: {len(vehicle_detections)} | "
            f"Helmet detections: {len(helmet_detections)} ({helmet_mode}) | "
            f"Plate detections: {len(plate_detections)} ({plate_mode}) | "
            f"Time: {duration_ms:.1f}ms"
        )

        return {
            "detections":           vehicle_detections,
            "helmets":              helmet_detections,
            "plates":               plate_detections,
            "duration_ms":          duration_ms,
            "model_version": (
                f"{cls._vehicle_model_path} "
                f"| helmet:{helmet_mode} "
                f"| plate:{plate_mode}"
            ),
            "image_shape":          image.shape,
            "helmet_model_active":  helmet_model is not None,
            "plate_model_active":   plate_model  is not None,
            # Loaded model file names for status reporting
            "vehicle_model_file":   cls._vehicle_model_path,
            "helmet_model_file":    cls._helmet_model_path if helmet_model is not None else None,
            "plate_model_file":     cls._plate_model_path  if plate_model  is not None else None,
        }

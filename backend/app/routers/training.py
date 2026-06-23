from fastapi import APIRouter
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

from app.config import settings, PROJECT_ROOT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/training", tags=["training"])

def get_file_info(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {
            "exists": False,
            "size_bytes": 0,
            "modified_at": None
        }
    try:
        stat = path.stat()
        return {
            "exists": True,
            "size_bytes": stat.st_size,
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        }
    except Exception as e:
        logger.warning(f"Error checking file info for {path}: {e}")
        return {
            "exists": False,
            "size_bytes": 0,
            "modified_at": None
        }

def load_metrics(path: Path) -> Optional[Dict[str, Any]]:
    if path.exists():
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading metrics from {path}: {e}")
    return None

@router.get("/status", response_model=Dict[str, Any])
async def get_training_status():
    """
    Returns training status of custom models, datasets presence, and evaluation results.
    """
    weights_dir = PROJECT_ROOT / "training" / "weights"
    eval_dir = PROJECT_ROOT / "training" / "evaluation"
    datasets_dir = PROJECT_ROOT / "datasets"
    
    vehicle_model_path = weights_dir / settings.YOLO_VEHICLE_CUSTOM_MODEL
    helmet_model_path = weights_dir / settings.YOLO_HELMET_CUSTOM_MODEL
    plate_model_path = weights_dir / settings.YOLO_PLATE_CUSTOM_MODEL
    
    vehicle_eval_path = eval_dir / "vehicle_metrics.json"
    helmet_eval_path = eval_dir / "helmet_metrics.json"
    plate_eval_path = eval_dir / "plate_metrics.json"
    benchmark_eval_path = eval_dir / "benchmark_results.json"
    
    dataset_info = {}
    for ds_key, folder_name in [("vehicle", "vehicle"), ("helmet", "helmet"), ("plate", "license_plate")]:
        ds_path = datasets_dir / folder_name
        if not ds_path.exists():
            dataset_info[ds_key] = {"exists": False, "splits": {}}
            continue
            
        splits = {}
        for split in ["train", "valid", "test"]:
            img_dir = ds_path / split / "images"
            lbl_dir = ds_path / split / "labels"
            
            img_count = 0
            if img_dir.exists():
                try:
                    img_count = len([f for f in img_dir.iterdir() if f.is_file()])
                except Exception:
                    pass
                    
            lbl_count = 0
            if lbl_dir.exists():
                try:
                    lbl_count = len([f for f in lbl_dir.iterdir() if f.is_file()])
                except Exception:
                    pass
            splits[split] = {"images": img_count, "labels": lbl_count}
            
        dataset_info[ds_key] = {
            "exists": True,
            "splits": splits
        }
        
    return {
        "models": {
            "vehicle": {
                "file": get_file_info(vehicle_model_path),
                "metrics": load_metrics(vehicle_eval_path)
            },
            "helmet": {
                "file": get_file_info(helmet_model_path),
                "metrics": load_metrics(helmet_eval_path)
            },
            "plate": {
                "file": get_file_info(plate_model_path),
                "metrics": load_metrics(plate_eval_path)
            }
        },
        "benchmark": load_metrics(benchmark_eval_path),
        "datasets": dataset_info
    }

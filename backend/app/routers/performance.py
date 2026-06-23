from fastapi import APIRouter, Depends, HTTPException
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/performance", tags=["performance"])

@router.get("", response_model=Dict[str, Any])
async def get_performance():
    """
    Reads model evaluation and benchmark metrics from training/evaluation/ json files.
    If no files exist (no models trained yet), returns has_data=False.
    """
    eval_dir = Path(settings.TRAINING_EVAL_DIR)
    
    result = {
        "has_data": False,
        "vehicle": None,
        "helmet": None,
        "plate": None,
        "benchmark": None,
    }
    
    if not eval_dir.exists() or not eval_dir.is_dir():
        return result
        
    try:
        vehicle_path = eval_dir / "vehicle_metrics.json"
        if vehicle_path.exists():
            with open(vehicle_path, "r") as f:
                result["vehicle"] = json.load(f)
                result["has_data"] = True
                
        helmet_path = eval_dir / "helmet_metrics.json"
        if helmet_path.exists():
            with open(helmet_path, "r") as f:
                result["helmet"] = json.load(f)
                result["has_data"] = True
                
        plate_path = eval_dir / "plate_metrics.json"
        if plate_path.exists():
            with open(plate_path, "r") as f:
                result["plate"] = json.load(f)
                result["has_data"] = True
                
        benchmark_path = eval_dir / "benchmark_results.json"
        if benchmark_path.exists():
            with open(benchmark_path, "r") as f:
                result["benchmark"] = json.load(f)
                result["has_data"] = True
                
    except Exception as e:
        logger.error(f"Error reading performance files: {e}", exc_info=True)
        
    return result

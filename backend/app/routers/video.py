import sys
import uuid
import logging
import aiofiles
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks

from app.config import settings, PROJECT_ROOT
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video", tags=["video"])

# In-memory dictionary to store task progress/status
video_tasks: Dict[str, Dict[str, Any]] = {}

def run_video_pipeline(task_id: str, video_path: Path, output_dir: Path):
    """Executes the predict_video pipeline in a background thread."""
    # Ensure project root is in python path
    sys.path.insert(0, str(PROJECT_ROOT))
    from predict_video import process_video

    try:
        video_tasks[task_id]["status"] = "processing"
        logger.info(f"[VIDEO PIPELINE] Starting background processing for task {task_id}")
        
        # Run at 2 FPS and skip OCR frames to speed up prototype demo
        report = process_video(
            video_path=video_path,
            output_dir=output_dir,
            sample_fps=2.0,
            conf=0.30,
            camera_id="uploaded_video",
            ocr_every_n=4
        )
        
        video_tasks[task_id]["status"] = "completed"
        video_tasks[task_id]["result"] = report
        # Annotated output video file is stored in evidence dir
        annotated_filename = f"{video_path.stem}_annotated.mp4"
        video_tasks[task_id]["annotated_video_url"] = f"http://localhost:8000/evidence/{annotated_filename}"
        logger.info(f"[VIDEO PIPELINE] Completed task {task_id} successfully.")
    except Exception as e:
        logger.error(f"[VIDEO PIPELINE] Failed task {task_id}: {e}", exc_info=True)
        video_tasks[task_id]["status"] = "failed"
        video_tasks[task_id]["error"] = str(e)

@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    _user=Depends(get_current_user)
):
    """
    Accepts video file, stores it locally, and launches the processing pipeline in the background.
    """
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported video format: {ext}. Allowed: mp4, avi, mov, mkv"
        )
        
    task_id = str(uuid.uuid4())
    stored_name = f"{task_id}{ext}"
    dest_path = settings.UPLOAD_DIR / stored_name
    
    # Save the file asynchronously
    try:
        async with aiofiles.open(dest_path, "wb") as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        logger.error(f"Failed to write uploaded video file to disk: {e}")
        raise HTTPException(status_code=500, detail="Failed to save video upload.")

    # Initialize status
    video_tasks[task_id] = {
        "status": "pending",
        "filename": file.filename,
        "stored_filename": stored_name,
        "result": None,
        "error": None
    }
    
    # Run the processing job
    background_tasks.add_task(run_video_pipeline, task_id, dest_path, settings.EVIDENCE_DIR)
    
    return {"task_id": task_id, "status": "pending"}

@router.get("/status/{task_id}")
async def get_video_status(task_id: str):
    """Polls the status or retrieves the final report of a video processing task."""
    if task_id not in video_tasks:
        raise HTTPException(status_code=404, detail="Video task not found.")
    return video_tasks[task_id]

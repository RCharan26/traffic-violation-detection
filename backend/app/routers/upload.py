"""Upload router — saves image to disk, creates DB record, returns image_id."""
import uuid
import aiofiles
import logging
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image as PILImage
import io

from app.database import get_db
from app.models.image import Image
from app.schemas.image import ImageUploadResponse
from app.config import settings
from app.routers.auth import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])
logger = logging.getLogger(__name__)


@router.post("", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    location_label: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    # Validate mime type
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed: {', '.join(settings.ALLOWED_IMAGE_TYPES)}",
        )

    # Read and size-check
    content = await file.read()
    if len(content) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_IMAGE_SIZE_MB}MB",
        )

    # Get image dimensions
    width, height = None, None
    try:
        pil_img = PILImage.open(io.BytesIO(content))
        width, height = pil_img.size
    except Exception:
        raise HTTPException(status_code=422, detail="Cannot read image file — it may be corrupted.")

    # Save to disk
    ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = settings.UPLOAD_DIR / stored_name

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(content)

    # DB record
    img_record = Image(
        filename=stored_name,
        original_filename=file.filename or stored_name,
        file_path=str(dest_path),
        file_size=len(content),
        mime_type=file.content_type,
        width=width,
        height=height,
        location_label=location_label.strip() or None,
        status="uploaded",
        created_at=datetime.utcnow(),
    )
    db.add(img_record)
    await db.commit()
    await db.refresh(img_record)

    logger.info(f"Uploaded image {img_record.id}: {stored_name} ({len(content)//1024}KB)")
    return img_record

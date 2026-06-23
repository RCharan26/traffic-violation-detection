"""
History router — provides a log of all uploaded/processed images.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.image import Image
from app.schemas.image import PaginatedImages, ImageDetailOut

router = APIRouter(prefix="/history", tags=["history"])
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedImages)
async def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    location_label: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Returns a paginated list of images and their processing pipeline outputs.
    """
    # Base query loading relationships to avoid N+1 queries
    query = (
        select(Image)
        .options(
            selectinload(Image.vehicles),
            selectinload(Image.license_plates),
        )
    )

    # Filters
    if status_filter:
        query = query.where(Image.status == status_filter)
    if location_label:
        query = query.where(Image.location_label.ilike(f"%{location_label}%"))

    # Order by newest
    query = query.order_by(Image.created_at.desc())

    # Count total
    count_query = select(func.count(Image.id))
    if status_filter:
        count_query = count_query.where(Image.status == status_filter)
    if location_label:
        count_query = count_query.where(Image.location_label.ilike(f"%{location_label}%"))

    total = await db.scalar(count_query) or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    images = result.scalars().all()

    # Cast to Output models
    items = [ImageDetailOut.model_validate(img) for img in images]

    return PaginatedImages(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/{image_id}", response_model=ImageDetailOut)
async def get_image_details(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Retrieves full processing details for a single image."""
    query = (
        select(Image)
        .options(
            selectinload(Image.vehicles),
            selectinload(Image.license_plates),
        )
        .where(Image.id == image_id)
    )
    result = await db.execute(query)
    img = result.scalar_one_or_none()

    if not img:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image record with ID {image_id} not found",
        )

    return ImageDetailOut.model_validate(img)


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image_record(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Deletes an image record from the database.
    DB CASCADE removes associated vehicles, violations, and plates.
    """
    result = await db.execute(select(Image).where(Image.id == image_id))
    img = result.scalar_one_or_none()

    if not img:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image record with ID {image_id} not found",
        )

    # Delete local files if possible
    try:
        file_path = Path(img.file_path)
        if file_path.exists():
            file_path.unlink()

        # Delete any associated plate crops or evidence files
        # (Usually cleaned up by cascade triggers or service scripts)
    except Exception as e:
        logger.warning(f"Failed to delete disk files for image {image_id}: {e}")

    await db.execute(delete(Image).where(Image.id == image_id))
    await db.commit()
    logger.info(f"Deleted image record {image_id}")
    return

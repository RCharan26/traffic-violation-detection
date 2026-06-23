"""
Violations router — queries, filters, updates status, and deletes violations.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.violation import Violation
from app.models.image import Image
from app.models.vehicle import LicensePlate
from app.schemas.violation import PaginatedViolations, ViolationOut, ViolationStatusUpdate

router = APIRouter(prefix="/violations", tags=["violations"])
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedViolations)
async def get_violations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    violation_type: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    license_plate: Optional[str] = Query(default=None),
    image_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Returns a paginated list of traffic violations matching filters.
    Includes joins to retrieve the original filename and location label.
    """
    # Base query
    query = (
        select(Violation, Image.original_filename, Image.location_label, LicensePlate.plate_crop_path)
        .join(Image, Violation.image_id == Image.id)
        .outerjoin(LicensePlate, (Violation.image_id == LicensePlate.image_id) & (Violation.license_plate == LicensePlate.plate_text))
    )

    # Filters
    if violation_type:
        query = query.where(Violation.violation_type == violation_type)
    if severity:
        query = query.where(Violation.severity == severity)
    if status_filter:
        query = query.where(Violation.status == status_filter)
    if license_plate:
        query = query.where(Violation.license_plate.ilike(f"%{license_plate}%"))
    if image_id:
        query = query.where(Violation.image_id == image_id)

    # Order by newest
    query = query.order_by(Violation.created_at.desc())

    # Count total matching records
    count_query = select(func.count(Violation.id)).join(Image, Violation.image_id == Image.id)
    if violation_type:
        count_query = count_query.where(Violation.violation_type == violation_type)
    if severity:
        count_query = count_query.where(Violation.severity == severity)
    if status_filter:
        count_query = count_query.where(Violation.status == status_filter)
    if license_plate:
        count_query = count_query.where(Violation.license_plate.ilike(f"%{license_plate}%"))
    if image_id:
        count_query = count_query.where(Violation.image_id == image_id)

    total = await db.scalar(count_query) or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for viol, orig_fn, loc_lbl, plate_crop in rows:
        # Construct output dictionary
        item = ViolationOut.model_validate(viol)
        item.original_filename = orig_fn
        item.location_label = loc_lbl
        item.metadata = viol.metadata_
        item.plate_crop_path = plate_crop
        items.append(item)

    return PaginatedViolations(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/{violation_id}", response_model=ViolationOut)
async def get_violation(
    violation_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Fetch details of a single violation by ID."""
    query = (
        select(Violation, Image.original_filename, Image.location_label, LicensePlate.plate_crop_path)
        .join(Image, Violation.image_id == Image.id)
        .outerjoin(LicensePlate, (Violation.image_id == LicensePlate.image_id) & (Violation.license_plate == LicensePlate.plate_text))
        .where(Violation.id == violation_id)
    )
    result = await db.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Violation with ID {violation_id} not found",
        )

    viol, orig_fn, loc_lbl, plate_crop = row
    item = ViolationOut.model_validate(viol)
    item.original_filename = orig_fn
    item.location_label = loc_lbl
    item.metadata = viol.metadata_
    item.plate_crop_path = plate_crop
    return item


@router.patch("/{violation_id}/status", response_model=ViolationOut)
async def update_violation_status(
    violation_id: int,
    status_update: ViolationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Updates the status of a violation (e.g. pending, reviewed, dismissed, challenged).
    """
    allowed_statuses = {"pending", "reviewed", "dismissed", "challenged"}
    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(allowed_statuses)}",
        )

    result = await db.execute(select(Violation).where(Violation.id == violation_id))
    viol = result.scalar_one_or_none()

    if not viol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Violation with ID {violation_id} not found",
        )

    viol.status = status_update.status
    await db.commit()
    await db.refresh(viol)

    # Re-fetch with join to return complete schema
    query = (
        select(Violation, Image.original_filename, Image.location_label, LicensePlate.plate_crop_path)
        .join(Image, Violation.image_id == Image.id)
        .outerjoin(LicensePlate, (Violation.image_id == LicensePlate.image_id) & (Violation.license_plate == LicensePlate.plate_text))
        .where(Violation.id == violation_id)
    )
    res = await db.execute(query)
    viol_updated, orig_fn, loc_lbl, plate_crop = res.first()

    item = ViolationOut.model_validate(viol_updated)
    item.original_filename = orig_fn
    item.location_label = loc_lbl
    item.metadata = viol_updated.metadata_
    item.plate_crop_path = plate_crop
    return item


@router.delete("/{violation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_violation(
    violation_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Delete a violation record."""
    result = await db.execute(select(Violation).where(Violation.id == violation_id))
    viol = result.scalar_one_or_none()

    if not viol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Violation with ID {violation_id} not found",
        )

    await db.execute(delete(Violation).where(Violation.id == violation_id))
    await db.commit()
    logger.info(f"Deleted violation record {violation_id}")
    return

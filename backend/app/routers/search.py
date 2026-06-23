"""
Search router — parses custom multi-parameter search requests and runs queries on violations.
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.violation import Violation
from app.models.image import Image
from app.schemas.violation import SearchRequest, PaginatedViolations, ViolationOut

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)


@router.post("", response_model=PaginatedViolations)
async def search_violations(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Search violations using a JSON body.
    Supports plate numbers, violation types, severities, date ranges, status and generic queries.
    """
    logger.info(f"Processing violation search: {request.model_dump(exclude_none=True)}")

    # Base query
    query = (
        select(Violation, Image.original_filename, Image.location_label)
        .join(Image, Violation.image_id == Image.id)
    )

    # Count base query
    count_query = select(func.count(Violation.id)).join(Image, Violation.image_id == Image.id)

    # ── Apply filters ───────────────────────────────────────────────

    # Generic search query (searches plate, reason, rules, file name, location)
    if request.query:
        search_filter = or_(
            Violation.license_plate.ilike(f"%{request.query}%"),
            Violation.reason.ilike(f"%{request.query}%"),
            Violation.rule_applied.ilike(f"%{request.query}%"),
            Image.original_filename.ilike(f"%{request.query}%"),
            Image.location_label.ilike(f"%{request.query}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Specific filters
    if request.violation_type:
        query = query.where(Violation.violation_type == request.violation_type)
        count_query = count_query.where(Violation.violation_type == request.violation_type)

    if request.severity:
        query = query.where(Violation.severity == request.severity)
        count_query = count_query.where(Violation.severity == request.severity)

    if request.status:
        query = query.where(Violation.status == request.status)
        count_query = count_query.where(Violation.status == request.status)

    if request.license_plate:
        query = query.where(Violation.license_plate.ilike(f"%{request.license_plate}%"))
        count_query = count_query.where(Violation.license_plate.ilike(f"%{request.license_plate}%"))

    if request.date_from:
        query = query.where(Violation.created_at >= request.date_from)
        count_query = count_query.where(Violation.created_at >= request.date_from)

    if request.date_to:
        query = query.where(Violation.created_at <= request.date_to)
        count_query = count_query.where(Violation.created_at <= request.date_to)

    # Order newest first
    query = query.order_by(Violation.created_at.desc())

    # Calculate total
    total = await db.scalar(count_query) or 0

    # Paginate
    offset = (request.page - 1) * request.page_size
    query = query.offset(offset).limit(request.page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for viol, orig_fn, loc_lbl in rows:
        item = ViolationOut.model_validate(viol)
        item.original_filename = orig_fn
        item.location_label = loc_lbl
        items.append(item)

    return PaginatedViolations(
        total=total,
        page=request.page,
        page_size=request.page_size,
        items=items,
    )

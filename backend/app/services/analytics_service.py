"""
Analytics Service — all queries hit the real database.
No values are hardcoded or estimated.
If no data exists, methods return has_data=False.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

from app.models.image import Image
from app.models.vehicle import Vehicle, LicensePlate
from app.models.violation import Violation

logger = logging.getLogger(__name__)


async def get_dashboard_summary(db: AsyncSession) -> Dict[str, Any]:
    """Query real DB aggregates for the dashboard KPI cards."""
    # Total processed images
    total_images = await db.scalar(
        select(func.count(Image.id)).where(Image.status == "completed")
    ) or 0

    if total_images == 0:
        return {
            "has_data": False,
            "total_images_processed": 0,
            "total_vehicles_detected": 0,
            "total_violations": 0,
            "helmet_violations": 0,
            "seatbelt_violations": 0,
            "triple_riding": 0,
            "wrong_side": 0,
            "red_light": 0,
            "stop_line": 0,
            "illegal_parking": 0,
            "avg_processing_time_ms": None,
            "avg_detection_confidence": None,
        }

    total_vehicles = await db.scalar(select(func.count(Vehicle.id))) or 0
    total_violations = await db.scalar(select(func.count(Violation.id))) or 0

    # Per-type violation counts
    def vtype_count(vtype: str):
        return db.scalar(
            select(func.count(Violation.id)).where(Violation.violation_type == vtype)
        )

    helmet       = await vtype_count("helmet_missing") or 0
    seatbelt     = await vtype_count("seatbelt_missing") or 0
    triple       = await vtype_count("triple_riding") or 0
    wrong_side   = await vtype_count("wrong_side") or 0
    red_light    = await vtype_count("red_light") or 0
    stop_line    = await vtype_count("stop_line") or 0
    parking      = await vtype_count("illegal_parking") or 0

    # Average processing time (from real pipeline timings)
    avg_time = await db.scalar(
        select(func.avg(Image.processing_time_ms)).where(
            Image.status == "completed",
            Image.processing_time_ms.is_not(None),
        )
    )
    avg_conf = await db.scalar(
        select(func.avg(Violation.confidence)).where(Violation.confidence.is_not(None))
    )

    return {
        "has_data": True,
        "total_images_processed": total_images,
        "total_vehicles_detected": total_vehicles,
        "total_violations": total_violations,
        "helmet_violations": helmet,
        "seatbelt_violations": seatbelt,
        "triple_riding": triple,
        "wrong_side": wrong_side,
        "red_light": red_light,
        "stop_line": stop_line,
        "illegal_parking": parking,
        "avg_processing_time_ms": round(float(avg_time), 1) if avg_time else None,
        "avg_detection_confidence": round(float(avg_conf), 4) if avg_conf else None,
    }


async def get_trend_data(db: AsyncSession, days: int = 30) -> Dict[str, Any]:
    """Daily, weekly, monthly violation counts from DB."""
    since = datetime.utcnow() - timedelta(days=days)

    rows = await db.execute(
        select(
            func.date(Violation.created_at).label("day"),
            func.count(Violation.id).label("count"),
        )
        .where(Violation.created_at >= since)
        .group_by(func.date(Violation.created_at))
        .order_by(func.date(Violation.created_at))
    )
    daily_rows = rows.fetchall()

    if not daily_rows:
        return {
            "has_data": False,
            "daily": [],
            "weekly": [],
            "monthly": [],
        }

    daily = [{"label": str(r.day), "count": r.count} for r in daily_rows]

    # Weekly aggregation from daily data
    weekly: Dict[str, int] = {}
    for row in daily_rows:
        d = datetime.strptime(str(row.day), "%Y-%m-%d")
        week_label = f"W{d.isocalendar()[1]} {d.year}"
        weekly[week_label] = weekly.get(week_label, 0) + row.count
    weekly_list = [{"label": k, "count": v} for k, v in sorted(weekly.items())]

    # Monthly aggregation
    monthly: Dict[str, int] = {}
    for row in daily_rows:
        d = datetime.strptime(str(row.day), "%Y-%m-%d")
        month_label = d.strftime("%b %Y")
        monthly[month_label] = monthly.get(month_label, 0) + row.count
    monthly_list = [{"label": k, "count": v} for k, v in monthly.items()]

    return {
        "has_data": True,
        "daily": daily,
        "weekly": weekly_list,
        "monthly": monthly_list,
    }


async def get_violation_distribution(db: AsyncSession) -> List[Dict[str, Any]]:
    """Count of violations per type, with percentage."""
    rows = await db.execute(
        select(
            Violation.violation_type,
            func.count(Violation.id).label("count"),
        )
        .group_by(Violation.violation_type)
        .order_by(func.count(Violation.id).desc())
    )
    all_rows = rows.fetchall()
    total = sum(r.count for r in all_rows)
    if total == 0:
        return []
    return [
        {
            "violation_type": r.violation_type,
            "count": r.count,
            "percentage": round(r.count / total * 100, 1),
        }
        for r in all_rows
    ]


async def get_vehicle_categories(db: AsyncSession) -> List[Dict[str, Any]]:
    """Count of detected vehicle categories from real detections."""
    rows = await db.execute(
        select(
            Vehicle.vehicle_category,
            func.count(Vehicle.id).label("count"),
        )
        .where(Vehicle.vehicle_category.is_not(None))
        .group_by(Vehicle.vehicle_category)
        .order_by(func.count(Vehicle.id).desc())
    )
    return [{"category": r.vehicle_category, "count": r.count} for r in rows.fetchall()]


async def get_avg_confidence_by_type(db: AsyncSession) -> Dict[str, float]:
    """Average confidence per violation type — from real detection data."""
    rows = await db.execute(
        select(
            Violation.violation_type,
            func.avg(Violation.confidence).label("avg_conf"),
        )
        .group_by(Violation.violation_type)
    )
    return {
        r.violation_type: round(float(r.avg_conf), 4)
        for r in rows.fetchall()
        if r.avg_conf is not None
    }


async def get_top_locations(db: AsyncSession, limit: int = 5) -> List[Dict[str, Any]]:
    """Top violation locations from user-provided location labels."""
    rows = await db.execute(
        select(
            Image.location_label,
            func.count(Violation.id).label("violation_count"),
        )
        .join(Violation, Violation.image_id == Image.id)
        .where(Image.location_label.is_not(None))
        .group_by(Image.location_label)
        .order_by(func.count(Violation.id).desc())
        .limit(limit)
    )
    return [
        {"location": r.location_label, "violation_count": r.violation_count}
        for r in rows.fetchall()
    ]

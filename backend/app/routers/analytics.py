"""
Analytics router — aggregates and serves database stats for dashboard widgets and charts.
"""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.analytics import (
    AnalyticsSummary,
    DashboardSummary,
    TrendData,
    VehicleCategoryCount,
    ViolationTypeCount,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


@router.get("", response_model=AnalyticsSummary)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Retrieves full aggregated statistics from the database.
    Adheres strictly to the Zero Fake Data policy.
    If no images have been processed, has_data=False is returned.
    """
    logger.info("Aggregating dashboard analytics...")

    # Fetch dashboard summary card data
    summary_data = await analytics_service.get_dashboard_summary(db)

    # If no data exists, return empty analytics response
    if not summary_data.get("has_data", False):
        empty_summary = DashboardSummary(
            has_data=False,
            total_images_processed=0,
            total_vehicles_detected=0,
            total_violations=0,
            helmet_violations=0,
            seatbelt_violations=0,
            triple_riding=0,
            wrong_side=0,
            red_light=0,
            stop_line=0,
            illegal_parking=0,
            avg_processing_time_ms=None,
            avg_detection_confidence=None,
        )
        empty_trend = TrendData(
            has_data=False,
            daily=[],
            weekly=[],
            monthly=[],
        )
        return AnalyticsSummary(
            has_data=False,
            summary=empty_summary,
            trend=empty_trend,
            vehicle_categories=[],
            violation_distribution=[],
            avg_confidence_by_type={},
            top_locations=[],
        )

    # Fetch charts and details
    trend_data = await analytics_service.get_trend_data(db)
    violation_dist = await analytics_service.get_violation_distribution(db)
    categories = await analytics_service.get_vehicle_categories(db)
    confidence_map = await analytics_service.get_avg_confidence_by_type(db)
    locations = await analytics_service.get_top_locations(db)

    # Format values
    summary_obj = DashboardSummary(**summary_data)
    trend_obj = TrendData(
        has_data=trend_data.get("has_data", False),
        daily=trend_data.get("daily", []),
        weekly=trend_data.get("weekly", []),
        monthly=trend_data.get("monthly", []),
    )
    categories_list = [VehicleCategoryCount(**c) for c in categories]
    violation_dist_list = [ViolationTypeCount(**v) for v in violation_dist]

    return AnalyticsSummary(
        has_data=True,
        summary=summary_obj,
        trend=trend_obj,
        vehicle_categories=categories_list,
        violation_distribution=violation_dist_list,
        avg_confidence_by_type=confidence_map,
        top_locations=locations,
    )

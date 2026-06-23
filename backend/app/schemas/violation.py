from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ViolationOut(BaseModel):
    id: int
    image_id: int
    vehicle_id: Optional[int] = None
    violation_type: str
    severity: str
    reason: str
    rule_applied: str
    suggested_action: Optional[str] = None
    evidence_description: Optional[str] = None
    confidence: float
    detection_confidence: Optional[float] = None
    bbox_x1: Optional[float] = None
    bbox_y1: Optional[float] = None
    bbox_x2: Optional[float] = None
    bbox_y2: Optional[float] = None
    license_plate: Optional[str] = None
    evidence_image_path: Optional[str] = None
    status: str
    created_at: datetime
    original_filename: Optional[str] = None  # joined from image
    location_label: Optional[str] = None
    metadata: Optional[dict] = None
    plate_crop_path: Optional[str] = None

    model_config = {"from_attributes": True}


class ViolationStatusUpdate(BaseModel):
    status: str  # pending | reviewed | dismissed | challenged


class PaginatedViolations(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ViolationOut]


class SearchRequest(BaseModel):
    query: Optional[str] = None
    violation_type: Optional[str] = None
    severity: Optional[str] = None
    license_plate: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status: Optional[str] = None
    page: int = 1
    page_size: int = 20

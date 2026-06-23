from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ImageUploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    status: str
    created_at: datetime
    location_label: Optional[str] = None

    model_config = {"from_attributes": True}


class VehicleOut(BaseModel):
    id: int
    yolo_class_id: int
    yolo_class_name: str
    confidence: float
    bbox_x1: float
    bbox_y1: float
    bbox_x2: float
    bbox_y2: float
    vehicle_category: Optional[str] = None

    model_config = {"from_attributes": True}


class LicensePlateOut(BaseModel):
    id: int
    plate_text: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    bbox_x1: Optional[float] = None
    bbox_y1: Optional[float] = None
    bbox_x2: Optional[float] = None
    bbox_y2: Optional[float] = None

    model_config = {"from_attributes": True}


class ImageDetailOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    status: str
    location_label: Optional[str] = None
    processing_time_ms: Optional[float] = None
    preprocessing_ms: Optional[float] = None
    detection_ms: Optional[float] = None
    ocr_ms: Optional[float] = None
    evidence_ms: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    vehicles: List[VehicleOut] = []
    license_plates: List[LicensePlateOut] = []

    model_config = {"from_attributes": True}


class PaginatedImages(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ImageDetailOut]

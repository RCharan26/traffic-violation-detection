from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class DashboardSummary(BaseModel):
    """
    All values queried from DB. If no processed images exist,
    counts are 0 and has_data is False.
    """
    has_data: bool
    total_images_processed: int
    total_vehicles_detected: int
    total_violations: int
    # Per-type violation counts
    helmet_violations: int
    seatbelt_violations: int
    triple_riding: int
    wrong_side: int
    red_light: int
    stop_line: int
    illegal_parking: int
    # Performance (real averages from DB)
    avg_processing_time_ms: Optional[float] = None
    avg_detection_confidence: Optional[float] = None


class TrendDataPoint(BaseModel):
    label: str          # date string e.g. "2024-06-21"
    count: int


class TrendData(BaseModel):
    has_data: bool
    daily: List[TrendDataPoint]
    weekly: List[TrendDataPoint]
    monthly: List[TrendDataPoint]


class VehicleCategoryCount(BaseModel):
    category: str
    count: int


class ViolationTypeCount(BaseModel):
    violation_type: str
    count: int
    percentage: float


class AnalyticsSummary(BaseModel):
    has_data: bool
    summary: DashboardSummary
    trend: TrendData
    vehicle_categories: List[VehicleCategoryCount]
    violation_distribution: List[ViolationTypeCount]
    avg_confidence_by_type: Dict[str, float]
    top_locations: List[Dict[str, Any]]


class DetectionPipelineResult(BaseModel):
    """
    Full result of running the detection pipeline on one image.

    license_plates entries contain:
      - raw_ocr_text:   EXACT EasyOCR output (never modified, never fabricated)
      - plate_text:     raw_ocr_text.strip().upper() (case/whitespace only)
      - ocr_confidence: DIRECT from EasyOCR (never invented)
    """
    image_id: int
    status: str
    vehicles_detected: int
    violations_found: int
    processing_time_ms: float
    violations: List[Dict[str, Any]]
    vehicles: List[Dict[str, Any]]
    license_plates: List[Dict[str, Any]]
    # Real timing measurements from pipeline stages (not estimated percentages)
    detection_ms: Optional[float] = None   # YOLO inference time
    ocr_ms: Optional[float] = None         # EasyOCR time
    preprocessing_ms: Optional[float] = None
    evidence_ms: Optional[float] = None

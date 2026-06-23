from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Violation(Base):
    """
    A detected traffic violation.

    Crucially: violations are NEVER randomly generated.
    Every violation is derived from actual YOLO detections
    via rule-based logic in violation_engine.py.
    The confidence is computed from the underlying detection confidence.
    """
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)

    # Violation classification
    violation_type = Column(String(100), nullable=False, index=True)
    # Possible values:
    # "helmet_missing" | "seatbelt_missing" | "triple_riding"
    # "wrong_side" | "red_light" | "stop_line" | "illegal_parking"

    severity = Column(String(20), nullable=False, default="medium")   # low | medium | high | critical

    # Explainable AI fields — required by problem statement
    reason = Column(Text, nullable=False)            # human-readable explanation
    rule_applied = Column(String(255), nullable=False)  # the rule triggered
    suggested_action = Column(String(255))           # e.g. "Issue Challan"
    evidence_description = Column(Text)              # what visual evidence was used

    # Confidence — derived from underlying YOLO confidence, not random
    confidence = Column(Float, nullable=False)
    detection_confidence = Column(Float)             # raw YOLO confidence of the triggering detection

    # Spatial data
    bbox_x1 = Column(Float)
    bbox_y1 = Column(Float)
    bbox_x2 = Column(Float)
    bbox_y2 = Column(Float)

    # Associated plate
    license_plate = Column(String(50), index=True)

    # Evidence image (annotated)
    evidence_image_path = Column(String(1024))

    # Additional context
    metadata_ = Column("metadata", JSON, default=dict)  # raw geometry, counts, etc.

    # Status
    status = Column(String(20), default="pending")   # pending | reviewed | dismissed | challenged

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    image = relationship("Image", back_populates="violations")
    vehicle = relationship("Vehicle", back_populates="violations")

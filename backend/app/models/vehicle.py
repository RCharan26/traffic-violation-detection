from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Vehicle(Base):
    """Every object detected by YOLO in an image."""
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False, index=True)

    # YOLO output — these values come directly from model inference
    yolo_class_id = Column(Integer, nullable=False)          # COCO class integer
    yolo_class_name = Column(String(100), nullable=False)    # e.g. "motorcycle", "car"
    confidence = Column(Float, nullable=False)               # 0.0–1.0 from YOLO

    # Bounding box — pixel coordinates in original image space
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)

    # Computed / enriched
    vehicle_category = Column(String(50))    # "two-wheeler" | "four-wheeler" | "heavy" | "pedestrian" | "signal"
    tracking_id = Column(String(50))         # future tracking support

    # Optional extra attributes stored as JSON
    attributes = Column(JSON, default=dict)  # e.g. {"color": "red", "heading": "left"}

    # Relationships
    image = relationship("Image", back_populates="vehicles")
    license_plates = relationship("LicensePlate", back_populates="vehicle", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="vehicle")


class LicensePlate(Base):
    """License plate detection and OCR result linked to a vehicle."""
    __tablename__ = "license_plates"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True)

    # Plate bounding box
    bbox_x1 = Column(Float)
    bbox_y1 = Column(Float)
    bbox_x2 = Column(Float)
    bbox_y2 = Column(Float)

    # OCR result — real EasyOCR output
    plate_text = Column(String(50))                  # normalized plate number
    raw_ocr_text = Column(String(200))               # raw OCR before normalization
    ocr_confidence = Column(Float)                   # EasyOCR confidence 0-1
    plate_crop_path = Column(String(1024))           # path to cropped plate image

    vehicle = relationship("Vehicle", back_populates="license_plates")
    image = relationship("Image", back_populates="license_plates")

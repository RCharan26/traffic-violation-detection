from sqlalchemy import Column, Integer, String, Float, DateTime, Text, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False, index=True)           # stored filename (uuid)
    original_filename = Column(String(512), nullable=False)              # user-provided name
    file_path = Column(String(1024), nullable=False)                     # absolute path on disk
    file_size = Column(BigInteger)                                       # bytes
    mime_type = Column(String(100))
    width = Column(Integer)                                              # pixels
    height = Column(Integer)                                             # pixels
    location_label = Column(String(512))                                 # optional user-provided label

    # Pipeline state
    status = Column(String(20), nullable=False, default="uploaded")      # uploaded|processing|completed|failed
    error_message = Column(Text)

    # Timing (real wall-clock measurements)
    processing_time_ms = Column(Float)                                   # total pipeline ms
    preprocessing_ms = Column(Float)
    detection_ms = Column(Float)
    ocr_ms = Column(Float)
    evidence_ms = Column(Float)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_at = Column(DateTime)

    # Relationships
    vehicles = relationship("Vehicle", back_populates="image", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="image", cascade="all, delete-orphan")
    license_plates = relationship("LicensePlate", back_populates="image", cascade="all, delete-orphan")

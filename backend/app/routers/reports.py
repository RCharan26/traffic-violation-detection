"""
Reports router — generates professional PDF challans/reports for violations.
"""
import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt

from app.database import get_db
from app.config import settings
from app.routers.auth import get_current_user
from app.models.violation import Violation
from app.models.image import Image

# ReportLab modules
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


@router.get("/{violation_id}", response_class=FileResponse)
async def generate_violation_report(
    violation_id: int,
    token: Optional[str] = Query(default=None, description="Bearer token for direct browser downloads"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a formal PDF challan for a traffic violation.
    Supports both Authorization header and ?token= query param for direct browser links.
    """
    # Validate token — either from query param or Authorization header
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        if not username or username != settings.ADMIN_USERNAME:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    # 1. Fetch violation and joined image details
    query = (
        select(Violation, Image.original_filename, Image.location_label)
        .join(Image, Violation.image_id == Image.id)
        .where(Violation.id == violation_id)
    )
    result = await db.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Violation with ID {violation_id} not found",
        )

    viol, orig_filename, location = row

    # Path where we'll save the PDF
    pdf_filename = f"violation_report_{violation_id}.pdf"
    pdf_path = settings.REPORTS_DIR / pdf_filename

    # 2. Build PDF Document
    try:
        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        # Custom paragraph styles
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=6,
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=colors.HexColor("#475569"),
            spaceAfter=15,
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=12,
            spaceAfter=6,
            borderPadding=4,
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#334155"),
        )
        bold_body_style = ParagraphStyle(
            "ReportBoldBody",
            parent=body_style,
            fontName="Helvetica-Bold",
        )
        meta_label_style = ParagraphStyle(
            "MetaLabel",
            parent=body_style,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#475569"),
        )

        story = []

        # ── HEADER ──────────────────────────────────────────────────────────
        story.append(Paragraph("TRAFFICVISION AI — VIOLATION DOSSIER", title_style))
        story.append(Paragraph("BENGALURU TRAFFIC POLICE DEPARTMENT — SMART CITY COMMAND CENTER", subtitle_style))

        # Thin dividing line
        divider = Table([[""]], colWidths=[540], rowHeights=[2])
        divider.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
            ("PADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(divider)
        story.append(Spacer(1, 10))

        # ── METADATA TABLE ──────────────────────────────────────────────────
        created_at_str = viol.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        meta_data = [
            [
                Paragraph("Violation ID", meta_label_style),
                Paragraph(f"#{viol.id}", body_style),
                Paragraph("License Plate", meta_label_style),
                Paragraph(viol.license_plate or "UNKNOWN", bold_body_style),
            ],
            [
                Paragraph("Violation Type", meta_label_style),
                Paragraph(viol.violation_type.replace("_", " ").upper(), bold_body_style),
                Paragraph("Severity Class", meta_label_style),
                Paragraph(viol.severity.upper(), bold_body_style),
            ],
            [
                Paragraph("Detection Time", meta_label_style),
                Paragraph(created_at_str, body_style),
                Paragraph("Location Point", meta_label_style),
                Paragraph(location or "CCTV Intersection Camera", body_style),
            ],
            [
                Paragraph("System Confidence", meta_label_style),
                Paragraph(f"{viol.confidence:.2%}", body_style),
                Paragraph("File Source", meta_label_style),
                Paragraph(orig_filename, body_style),
            ]
        ]

        meta_table = Table(meta_data, colWidths=[100, 170, 100, 170])
        meta_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # ── EVIDENCE VISUALS ────────────────────────────────────────────────
        story.append(Paragraph("1. Primary Visual Evidence", section_heading))

        ev_img_path = viol.evidence_image_path
        if ev_img_path and os.path.exists(ev_img_path):
            try:
                # Resize image proportionally to fit width of 520pt
                # Letter width = 612, margins 36 on each side -> 540 max width
                # Let's scale to 500 width, keeping aspect ratio
                # Draw using ReportLab Image
                img_width = 500
                img_height = 280
                rl_img = RLImage(ev_img_path, width=img_width, height=img_height)
                rl_img.hAlign = "CENTER"
                story.append(rl_img)
            except Exception as e:
                logger.error(f"Failed to embed evidence image in PDF: {e}")
                story.append(Paragraph(f"[Evidence Image Render Failed: {e}]", body_style))
        else:
            story.append(Paragraph("[Visual Evidence Image Unavailable or Path Not Found]", body_style))

        story.append(Spacer(1, 12))

        # ── EXPLAINABLE AI ANALYSIS ─────────────────────────────────────────
        story.append(Paragraph("2. Explainable AI (XAI) Violations Context", section_heading))

        xai_data = [
            [
                Paragraph("Triggering Detection Reason", meta_label_style),
                Paragraph(viol.reason, body_style),
            ],
            [
                Paragraph("Motor Vehicles Act Section", meta_label_style),
                Paragraph(viol.rule_applied, bold_body_style),
            ],
            [
                Paragraph("Recommended Enforcement Action", meta_label_style),
                Paragraph(viol.suggested_action or "Issue standard traffic fine", body_style),
            ],
            [
                Paragraph("Evidence Bounding Target", meta_label_style),
                Paragraph(viol.evidence_description or "N/A", body_style),
            ]
        ]

        xai_table = Table(xai_data, colWidths=[160, 380])
        xai_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(xai_table)
        story.append(Spacer(1, 20))

        # ── FOOTER SIGNATURES & QR ──────────────────────────────────────────
        footer_data = [
            [
                Paragraph(
                    "<b>Officer Verification Notes:</b><br/>"
                    "_____________________________________________<br/>"
                    "_____________________________________________<br/>"
                    "Status: <b>PENDING REVIEW</b>",
                    body_style
                ),
                Paragraph(
                    "<b>QR Verification Code:</b><br/>"
                    "[ Verified Authenticity via TV-AI ]<br/>"
                    "ID: " + str(viol.id) + "-" + str(int(viol.created_at.timestamp())),
                    body_style
                ),
                Paragraph(
                    "<b>Authorized Signature:</b><br/><br/>"
                    "_____________________________<br/>"
                    "Traffic Enforcement Officer",
                    body_style
                )
            ]
        ]
        footer_table = Table(footer_data, colWidths=[200, 160, 180])
        footer_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(footer_table)

        # Build PDF
        doc.build(story)
        logger.info(f"Generated PDF report for violation {violation_id} at {pdf_path}")

    except Exception as e:
        logger.error(f"Failed to generate PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile PDF report: {e}",
        )

    # Return file as a download response
    return FileResponse(
        path=str(pdf_path),
        filename=f"challan_{violation_id}.pdf",
        media_type="application/pdf",
    )

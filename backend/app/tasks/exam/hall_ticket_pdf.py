"""
hall_ticket_pdf.py

Synchronous (non-Celery) hall ticket PDF generation using ReportLab.
Called directly from hall_ticket_endpoints for immediate download response.
"""

import io
from uuid import UUID
import zipfile

from fastapi import HTTPException, status
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_model import Exam
from app.models.exam.hall_ticket_model import HallTicketEligibility

# ── Color palette ──────────────────────────────────────────────────────────────
PRIMARY = HexColor("#1a3a6b")
ACCENT = HexColor("#e8f0fe")
BORDER = HexColor("#cccccc")


async def _load_hall_ticket_data(db: AsyncSession, exam_id: UUID, student_id: UUID) -> dict:
    """Load all data needed to render a hall ticket."""
    # Hall ticket eligibility row
    ht = (
        await db.execute(
            select(HallTicketEligibility).where(
                HallTicketEligibility.exam_id == exam_id,
                HallTicketEligibility.student_id == student_id,
            )
        )
    ).scalar_one_or_none()

    if not ht:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hall ticket not found. Run compute first.",
        )
    if not ht.is_eligible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student is not eligible for a hall ticket.",
        )

    # Exam
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()

    # Student info via raw SQL (cross-module)
    student_row = (
        await db.execute(
            text("""
        SELECT
            s.id,
            COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '') AS student_name,
            sa.admission_number,
            c.name AS class_name,
            sec.name AS section_name
        FROM students s
        JOIN student_admissions sa ON sa.student_id = s.id
        JOIN classes c ON c.id = sa.current_class_id
        LEFT JOIN sections sec ON sec.id = sa.current_section_id
        WHERE s.id = :sid
        LIMIT 1
    """),
            {"sid": str(student_id)},
        )
    ).fetchone()

    if not student_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student {student_id} not found.",
        )

    # Exam dates for student's class
    dates_rows = (
        await db.execute(
            text("""
        SELECT
            ed.exam_date,
            ed.start_time,
            ed.end_time,
            ed.venue,
            sub.name AS subject_name
        FROM exam_dates ed
        JOIN subjects sub ON sub.id = ed.subject_id
        WHERE ed.exam_id = :eid
          AND ed.class_id = :cid
          AND (CAST(:sec_id AS uuid) IS NULL OR ed.section_id = CAST(:sec_id AS uuid) OR ed.section_id IS NULL)
        ORDER BY ed.exam_date, ed.start_time
    """),
            {
                "eid": str(exam_id),
                "cid": str(ht.class_id),
                "sec_id": str(ht.section_id) if ht.section_id else None,
            },
        )
    ).fetchall()

    # School name: try organizations table, fall back to generic label
    school_row = (await db.execute(text("SELECT name FROM organizations LIMIT 1"))).fetchone()
    school_name = school_row[0] if school_row and school_row[0] else "School"

    return {
        "hall_ticket_number": ht.hall_ticket_number,
        "exam_name": exam.exam_name if exam else "Examination",
        "student_name": student_row[1].strip(),
        "admission_number": student_row[2] or "N/A",
        "class_name": student_row[3] or "",
        "section_name": student_row[4] or "",
        "school_name": school_name,
        "dates": [
            {
                "subject": row[4],
                "date": row[0].strftime("%d-%m-%Y") if row[0] else "",
                "start_time": str(row[1])[:5] if row[1] else "",
                "end_time": str(row[2])[:5] if row[2] else "",
                "venue": row[3] or "Main Hall",
            }
            for row in dates_rows
        ],
    }


def _build_pdf(data: dict) -> bytes:
    """Generate PDF bytes from hall ticket data using ReportLab."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    getSampleStyleSheet()
    h1 = ParagraphStyle("h1", fontSize=16, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=4)
    h2 = ParagraphStyle("h2", fontSize=12, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=4)
    normal = ParagraphStyle("normal", fontSize=10, alignment=TA_LEFT, spaceAfter=4)
    label = ParagraphStyle("label", fontSize=9, textColor=HexColor("#555555"), alignment=TA_LEFT)

    story = []

    # Header
    story.append(Paragraph(data["school_name"], h1))
    story.append(Paragraph("<b>HALL TICKET</b>", h2))
    story.append(Paragraph(data["exam_name"], h2))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY))
    story.append(Spacer(1, 0.4 * cm))

    # Student info table
    info_data = [
        ["Hall Ticket No.", data["hall_ticket_number"] or "—"],
        ["Student Name", data["student_name"]],
        ["Admission No.", data["admission_number"]],
        ["Class & Section", f"{data['class_name']} — {data['section_name']}"],
    ]
    info_table = Table(info_data, colWidths=[5 * cm, 12 * cm])
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), ACCENT),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 0.6 * cm))

    # Exam schedule
    story.append(Paragraph("<b>Examination Schedule</b>", h2))
    story.append(Spacer(1, 0.3 * cm))

    if data["dates"]:
        sched_header = [["Subject", "Date", "Start", "End", "Venue"]]
        sched_rows = [
            [
                d["subject"],
                d["date"],
                d["start_time"],
                d["end_time"],
                d["venue"],
            ]
            for d in data["dates"]
        ]
        sched_table = Table(
            sched_header + sched_rows,
            colWidths=[6 * cm, 3 * cm, 2 * cm, 2 * cm, 4 * cm],
        )
        sched_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                    ("TEXTCOLOR", (0, 0), (-1, 0), white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, ACCENT]),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(sched_table)
    else:
        story.append(Paragraph("No exam dates configured yet.", normal))

    story.append(Spacer(1, 0.8 * cm))

    # Instructions
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 0.3 * cm))
    instructions = [
        "1. Report to the examination hall 30 minutes before the start time.",
        "2. Carry this hall ticket to every examination session.",
        "3. Mobile phones and electronic devices are NOT permitted in the hall.",
        "4. Candidates found using unfair means will be disqualified.",
    ]
    for instr in instructions:
        story.append(Paragraph(instr, label))

    story.append(Spacer(1, 1 * cm))
    sig_data = [["Principal's Signature", "", "Invigilator's Signature"]]
    sig_table = Table(sig_data, colWidths=[6 * cm, 5 * cm, 6 * cm])
    sig_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (0, 0), "LEFT"),
                ("ALIGN", (2, 0), (2, 0), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 30),
                ("LINEABOVE", (0, 0), (0, 0), 1, black),
                ("LINEABOVE", (2, 0), (2, 0), 1, black),
            ]
        )
    )
    story.append(sig_table)

    doc.build(story)
    return buf.getvalue()


async def generate_hall_ticket_pdf(db: AsyncSession, exam_id: UUID, student_id: UUID) -> bytes:
    """Entry point called from hall_ticket_endpoints."""
    data = await _load_hall_ticket_data(db, exam_id, student_id)
    return _build_pdf(data)


async def generate_all_hall_tickets_zip(db: AsyncSession, exam_id: UUID) -> bytes:
    """Generate ZIP of all eligible students' hall tickets."""
    from app.service.exam.hall_ticket_service import get_eligible_students

    eligible = await get_eligible_students(db, exam_id)
    if not eligible:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No eligible students found. Run compute first.",
        )

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for row in eligible:
            try:
                sid = row["student_id"]
                ht_num = row.get("hall_ticket_number") or sid
                pdf_bytes = await generate_hall_ticket_pdf(db, exam_id, sid)
                filename = f"hall-ticket-{ht_num}.pdf"
                zf.writestr(filename, pdf_bytes)
            except Exception:
                pass  # Skip students with missing data

    return zip_buf.getvalue()

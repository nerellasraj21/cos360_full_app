from datetime import datetime
import hashlib
import io
import json
import logging as log
from decimal import Decimal
from datetime import datetime as _dt
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth.user_model import User
from app.models.fee.fee_receipt_model import FeeReceipt
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.fee.fee_type_model import FeeType
from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.designations_model import Designation
from app.models.masters.sections_model import Section
from app.models.masters.staff_model import Staff
from app.models.student.student_model import Student
from app.schemas.fee import FeeReceiptRead, ReceiptContent, ReceiptItemDetail

log = log.getLogger("fee.receipt_service")


class FeeReceiptService:
    """Service for handling receipt generation and management"""

    @staticmethod
    async def generate_receipt_number(db: AsyncSession) -> str:
        """Generate unique receipt number: REC-YYMM-XXXX, sequential per tenant per month."""
        now = datetime.now()
        prefix = f"REC-{now.strftime('%y%m')}-"

        # Get the highest sequence for this month's prefix
        result = await db.execute(
            select(FeeReceipt.receipt_number)
            .where(FeeReceipt.receipt_number.like(f"{prefix}%"))
            .order_by(FeeReceipt.receipt_number.desc())
            .limit(1)
        )
        last_number = result.scalar_one_or_none()

        if last_number:
            seq = int(last_number.split("-")[-1]) + 1
        else:
            seq = 1

        receipt_number = f"{prefix}{seq:04d}"

        # Safety: uniqueness check
        dup_result = await db.execute(
            select(FeeReceipt.id).where(FeeReceipt.receipt_number == receipt_number)
        )
        if dup_result.scalar_one_or_none():
            receipt_number = f"{prefix}{seq + 1:04d}"

        return receipt_number

    @staticmethod
    def _json_default(obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, _dt):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    @staticmethod
    def generate_content_hash(receipt_content: dict) -> str:
        """Generate SHA-256 hash for receipt content integrity"""
        content_string = json.dumps(receipt_content, sort_keys=True, default=FeeReceiptService._json_default)
        return hashlib.sha256(content_string.encode()).hexdigest()

    @staticmethod
    async def get_receipt_content(db: AsyncSession, transaction_id: UUID) -> ReceiptContent:
        """Get complete receipt content for PDF generation"""
        try:
            # Get transaction with all details
            result = await db.execute(
                select(FeeTransaction)
                .options(selectinload(FeeTransaction.transaction_items))
                .where(FeeTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()

            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction with ID {transaction_id} not found"
                )

            # Get admission record
            adm_result = await db.execute(
                select(Admission).where(
                    and_(
                        Admission.student_id == transaction.student_id,
                        Admission.admission_number == transaction.student_admission_num,
                    )
                )
            )
            admission = adm_result.scalar_one_or_none()

            if not admission:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student admission not found")

            # Resolve student name
            stu_result = await db.execute(
                select(Student.first_name, Student.last_name).where(Student.id == transaction.student_id)
            )
            stu_row = stu_result.one_or_none()
            student_name = f"{stu_row.first_name} {stu_row.last_name}" if stu_row else "Unknown"

            # Resolve class + section names
            cls_result = await db.execute(select(Class.name).where(Class.id == admission.current_class_id))
            class_name = cls_result.scalar_one_or_none() or ""
            sec_result = await db.execute(select(Section.name).where(Section.id == admission.current_section_id))
            section_name = sec_result.scalar_one_or_none() or ""

            # Resolve academic year title
            ay_result = await db.execute(select(AcademicYear.title).where(AcademicYear.id == transaction.academic_year_id))
            ay_title = ay_result.scalar_one_or_none() or ""

            # Resolve collecting staff name and designation
            collected_by_name = "Staff"
            collected_by_designation = None
            if transaction.collected_by_user_id:
                staff_result = await db.execute(
                    select(Staff.first_name, Staff.last_name, Staff.designation_id)
                    .where(Staff.user_id == transaction.collected_by_user_id)
                )
                staff_row = staff_result.one_or_none()
                if staff_row:
                    last = staff_row.last_name or ""
                    collected_by_name = f"{staff_row.first_name} {last}".strip()
                    if staff_row.designation_id:
                        desig_result = await db.execute(
                            select(Designation.title).where(Designation.id == staff_row.designation_id)
                        )
                        collected_by_designation = desig_result.scalar_one_or_none()

            # Build receipt items with fee type and term names
            receipt_items = []
            for item in transaction.transaction_items:
                fee_type_result = await db.execute(select(FeeType.type_name).where(FeeType.id == item.fee_type_id))
                fee_type_name = fee_type_result.scalar_one_or_none() or "Unknown Fee Type"

                fee_term_result = await db.execute(select(FeeTerm.term_name).where(FeeTerm.id == item.fee_term_id))
                fee_term_name = fee_term_result.scalar_one_or_none() or "Unknown Term"

                receipt_items.append(
                    ReceiptItemDetail(
                        fee_type_name=fee_type_name, fee_term_name=fee_term_name, amount_paid=item.amount_paid
                    )
                )

            # Build payment reference based on method
            payment_reference = None
            if transaction.payment_method == "upi":
                payment_reference = transaction.upi_reference
            elif transaction.payment_method == "cheque":
                payment_reference = f"Cheque: {transaction.cheque_number}"
            elif transaction.payment_method == "dd":
                payment_reference = f"DD: {transaction.cheque_number}"
            elif transaction.payment_method == "bank_transfer":
                payment_reference = transaction.bank_reference

            return ReceiptContent(
                receipt_number="",  # Will be set during receipt creation
                transaction_number=transaction.transaction_number,
                student_name=student_name,
                student_admission_num=admission.admission_number,
                class_section=f"{class_name} - {section_name}" if section_name else class_name,
                academic_year=ay_title,
                payment_method=transaction.payment_method,
                payment_reference=payment_reference,
                total_amount=transaction.total_amount,
                transaction_date=transaction.transaction_date,
                collected_by_user=collected_by_name,
                collected_by_designation=collected_by_designation,
                receipt_items=receipt_items,
                remarks=transaction.remarks,
                school_name="School Name",  # TODO: Get from tenant settings
                school_address="School Address",  # TODO: Get from tenant settings
            )

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            log.error(f"Error getting receipt content: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Receipt content error: {str(e)}",
            )

    @staticmethod
    async def create_receipt(db: AsyncSession, transaction_id: UUID, generated_by_user_id: UUID) -> FeeReceiptRead:
        """Create receipt for transaction"""
        try:
            # Check if transaction exists and is completed
            result = await db.execute(select(FeeTransaction).where(FeeTransaction.id == transaction_id))
            transaction = result.scalar_one_or_none()

            if not transaction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction with ID {transaction_id} not found"
                )

            if transaction.status != "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot generate receipt for non-completed transaction",
                )

            # Check if receipt already exists
            existing_receipt = await db.execute(
                select(FeeReceipt).where(FeeReceipt.fee_transaction_id == transaction_id)
            )
            if existing_receipt.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt already exists for this transaction"
                )

            # Get receipt content
            receipt_content = await FeeReceiptService.get_receipt_content(db, transaction_id)

            # Generate receipt number
            receipt_number = await FeeReceiptService.generate_receipt_number(db)
            receipt_content.receipt_number = receipt_number

            # Generate content hash
            content_hash = FeeReceiptService.generate_content_hash(receipt_content.dict())

            # Create receipt record
            db_receipt = FeeReceipt(
                receipt_number=receipt_number,
                fee_transaction_id=transaction_id,
                student_name=receipt_content.student_name,
                student_admission_num=receipt_content.student_admission_num,
                class_section=receipt_content.class_section,
                academic_year=receipt_content.academic_year,
                content_hash=content_hash,
                generated_by_user_id=generated_by_user_id,
            )

            db.add(db_receipt)

            # Update transaction receipt status
            transaction.receipt_generated = True
            transaction.receipt_hash = content_hash

            await db.commit()
            await db.refresh(db_receipt)

            return db_receipt

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error creating receipt: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while creating receipt"
            )

    @staticmethod
    async def _enrich_receipt_fields(db: AsyncSession, receipt: FeeReceipt) -> FeeReceiptRead:
        """
        Convert ORM receipt to FeeReceiptRead, back-filling class_section / academic_year
        for legacy receipts that were stored with empty strings.
        Never mutates the ORM object (avoids SQLAlchemy autoflush side-effects).
        """
        academic_year = receipt.academic_year or ""
        class_section = receipt.class_section or ""

        if not academic_year or not class_section:
            try:
                tx_result = await db.execute(
                    select(FeeTransaction).where(FeeTransaction.id == receipt.fee_transaction_id)
                )
                transaction = tx_result.scalar_one_or_none()

                if transaction:
                    if not academic_year and transaction.academic_year_id:
                        ay_result = await db.execute(
                            select(AcademicYear.title).where(AcademicYear.id == transaction.academic_year_id)
                        )
                        academic_year = ay_result.scalar_one_or_none() or ""

                    if not class_section:
                        adm_result = await db.execute(
                            select(Admission).where(
                                and_(
                                    Admission.student_id == transaction.student_id,
                                    Admission.admission_number == transaction.student_admission_num,
                                )
                            )
                        )
                        admission = adm_result.scalar_one_or_none()
                        if admission:
                            cls_result = await db.execute(
                                select(Class.name).where(Class.id == admission.current_class_id)
                            )
                            class_name = cls_result.scalar_one_or_none() or ""
                            sec_result = await db.execute(
                                select(Section.name).where(Section.id == admission.current_section_id)
                            )
                            section_name = sec_result.scalar_one_or_none() or ""
                            class_section = f"{class_name} - {section_name}" if section_name else class_name
            except Exception:
                pass  # Best-effort enrichment; fall through with whatever we have

        return FeeReceiptRead(
            id=receipt.id,
            receipt_number=receipt.receipt_number,
            fee_transaction_id=receipt.fee_transaction_id,
            student_name=receipt.student_name,
            student_admission_num=receipt.student_admission_num,
            class_section=class_section,
            academic_year=academic_year,
            content_hash=receipt.content_hash,
            pdf_file_path=receipt.pdf_file_path,
            is_reprinted=receipt.is_reprinted,
            reprint_count=receipt.reprint_count,
            generated_by_user_id=receipt.generated_by_user_id,
            remarks=receipt.remarks,
            generated_at=receipt.generated_at,
            created_at=receipt.created_at,
            updated_at=receipt.updated_at,
        )

    @staticmethod
    async def get_receipt_by_id(db: AsyncSession, receipt_id: UUID) -> FeeReceiptRead:
        """Get receipt by ID"""
        try:
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.id == receipt_id))
            receipt = result.scalar_one_or_none()

            if not receipt:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Receipt with ID {receipt_id} not found"
                )

            receipt = await FeeReceiptService._enrich_receipt_fields(db, receipt)
            return receipt

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting receipt: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving receipt"
            )

    @staticmethod
    async def get_receipt_by_number(db: AsyncSession, receipt_number: str) -> FeeReceiptRead:
        """Get receipt by receipt number"""
        try:
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.receipt_number == receipt_number))
            receipt = result.scalar_one_or_none()

            if not receipt:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Receipt with number {receipt_number} not found"
                )

            receipt = await FeeReceiptService._enrich_receipt_fields(db, receipt)
            return receipt

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting receipt by number: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving receipt"
            )

    @staticmethod
    async def reprint_receipt(db: AsyncSession, receipt_id: UUID, user_id: UUID) -> FeeReceiptRead:
        """Mark receipt as reprinted and increment count"""
        try:
            result = await db.execute(select(FeeReceipt).where(FeeReceipt.id == receipt_id))
            receipt = result.scalar_one_or_none()

            if not receipt:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Receipt with ID {receipt_id} not found"
                )

            # Update reprint information
            receipt.is_reprinted = True
            current_count = receipt.reprint_count if isinstance(receipt.reprint_count, int) else 0
            receipt.reprint_count = current_count + 1

            await db.commit()
            await db.refresh(receipt)

            log.info(f"Receipt {receipt.receipt_number} reprinted by user {user_id}")

            return receipt

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error reprinting receipt: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while reprinting receipt"
            )

    @staticmethod
    async def verify_receipt_integrity(db: AsyncSession, receipt_id: UUID) -> dict:
        """Verify receipt content integrity using hash"""
        try:
            receipt = await FeeReceiptService.get_receipt_by_id(db, receipt_id)

            # Get current transaction content
            current_content = await FeeReceiptService.get_receipt_content(db, receipt.fee_transaction_id)
            current_content.receipt_number = receipt.receipt_number

            # Generate current hash
            current_hash = FeeReceiptService.generate_content_hash(current_content.dict())

            is_valid = current_hash == receipt.content_hash

            return {
                "receipt_id": receipt_id,
                "receipt_number": receipt.receipt_number,
                "is_valid": is_valid,
                "stored_hash": receipt.content_hash,
                "current_hash": current_hash,
                "verification_date": datetime.now(),
            }

        except Exception as e:
            log.error(f"Error verifying receipt integrity: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while verifying receipt integrity",
            )

    @staticmethod
    async def search_receipts(
        db: AsyncSession,
        student_id: UUID | None = None,
        receipt_number: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[FeeReceiptRead]:
        """Search receipts with filters"""
        try:
            query = select(FeeReceipt)

            conditions = []
            if student_id:
                # Join with transaction to filter by student
                query = query.join(FeeTransaction, FeeReceipt.fee_transaction_id == FeeTransaction.id)
                conditions.append(FeeTransaction.student_id == student_id)

            if receipt_number:
                conditions.append(FeeReceipt.receipt_number.ilike(f"%{receipt_number}%"))

            if date_from:
                conditions.append(FeeReceipt.generated_at >= date_from)

            if date_to:
                conditions.append(FeeReceipt.generated_at <= date_to)

            if conditions:
                query = query.where(and_(*conditions))

            query = query.order_by(FeeReceipt.generated_at.desc())
            query = query.offset(offset).limit(limit)

            result = await db.execute(query)
            receipts = result.scalars().all()

            enriched = []
            for receipt in receipts:
                enriched.append(await FeeReceiptService._enrich_receipt_fields(db, receipt))

            return enriched

        except Exception as e:
            log.error(f"Error searching receipts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while searching receipts"
            )

    @staticmethod
    def generate_receipt_pdf(content) -> bytes:
        """Generate PDF bytes from ReceiptContent using reportlab."""
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=15 * mm)
        styles = getSampleStyleSheet()
        elements = []

        # Title: School name
        title_style = ParagraphStyle("ReceiptTitle", parent=styles["Title"], fontSize=16, spaceAfter=4)
        elements.append(Paragraph(content.school_name, title_style))
        elements.append(Paragraph(content.school_address, styles["Normal"]))
        elements.append(Spacer(1, 8 * mm))

        # Receipt header
        header_style = ParagraphStyle("ReceiptHeader", parent=styles["Heading2"], fontSize=13, alignment=1)
        elements.append(Paragraph("FEE RECEIPT", header_style))
        elements.append(Spacer(1, 4 * mm))

        # Student info table
        txn_date = content.transaction_date.strftime("%d-%b-%Y") if content.transaction_date else ""
        info_data = [
            ["Receipt No:", content.receipt_number, "Date:", txn_date],
            ["Student:", content.student_name, "Admission No:", content.student_admission_num],
            ["Class / Section:", content.class_section, "Academic Year:", content.academic_year],
            ["Payment Mode:", content.payment_method.upper(), "Reference:", content.payment_reference or "-"],
        ]
        info_table = Table(info_data, colWidths=[90, 170, 90, 170])
        info_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 6 * mm))

        # Fee items table
        item_header = ["S.No", "Fee Type", "Term", "Amount"]
        item_rows = [item_header]
        for idx, item in enumerate(content.receipt_items, 1):
            item_rows.append([
                str(idx),
                item.fee_type_name,
                item.fee_term_name,
                f"{item.amount_paid:,.2f}",
            ])
        item_rows.append(["", "", "Total", f"{content.total_amount:,.2f}"])

        item_table = Table(item_rows, colWidths=[40, 200, 120, 100])
        item_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (2, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
            ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
        ]))
        elements.append(item_table)
        elements.append(Spacer(1, 6 * mm))

        # Remarks
        if content.remarks:
            elements.append(Paragraph(f"Remarks: {content.remarks}", styles["Normal"]))
            elements.append(Spacer(1, 4 * mm))

        # Footer — Collecting staff name, designation, and signature line
        elements.append(Spacer(1, 12 * mm))
        staff_label = content.collected_by_user
        if content.collected_by_designation:
            staff_label += f" ({content.collected_by_designation})"
        footer_data = [
            [f"Collected by: {staff_label}", "Authorized Signature"],
            ["", ""],
            ["_________________________", "_________________________"],
            ["Staff Signature", "Principal / Management"],
        ]
        footer_table = Table(footer_data, colWidths=[260, 260])
        footer_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("TOPPADDING", (0, 2), (-1, 2), 15),
            ("FONTSIZE", (0, 3), (-1, 3), 7),
            ("TEXTCOLOR", (0, 3), (-1, 3), colors.grey),
        ]))
        elements.append(footer_table)

        doc.build(elements)
        return buf.getvalue()

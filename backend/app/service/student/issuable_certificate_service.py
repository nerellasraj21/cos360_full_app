"""
Issuable Certificate Service — Business logic for templates and certificate generation
"""

import re
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student.issuable_certificate_model import (
    GeneratedCertificate,
    IssuableCertificateTemplate,
)
from app.models.student.student_model import Student
from app.schemas.student.issuable_certificate_schema import (
    GenerateCertificateRequest,
    GeneratedCertificateRead,
    IssuableCertificateTemplateCreate,
    IssuableCertificateTemplateRead,
    IssuableCertificateTemplateUpdate,
)


# ============================================================================
# TEMPLATE OPERATIONS
# ============================================================================


async def get_all_templates(db: AsyncSession) -> list[IssuableCertificateTemplateRead]:
    """Get all active certificate templates"""
    query = select(IssuableCertificateTemplate).where(func.lower(IssuableCertificateTemplate.is_active) == "true")
    result = await db.execute(query)
    templates = result.scalars().all()
    return [IssuableCertificateTemplateRead.from_orm(t) for t in templates]


async def get_template_by_id(db: AsyncSession, template_id: UUID) -> IssuableCertificateTemplateRead:
    """Get a single certificate template by ID"""
    query = select(IssuableCertificateTemplate).where(
        IssuableCertificateTemplate.id == template_id
    )
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    return IssuableCertificateTemplateRead.from_orm(template)


async def create_template(
    db: AsyncSession,
    data: IssuableCertificateTemplateCreate,
) -> IssuableCertificateTemplateRead:
    """Create a new certificate template"""
    # Extract variables from HTML template ({{variable_name}})
    variables = extract_variables(data.html_template)
    variables_json = ",".join(variables) if variables else None

    template = IssuableCertificateTemplate(
        id=uuid.uuid4(),
        name=data.name,
        html_template=data.html_template,
        color_theme=data.color_theme,
        variables_used=variables_json,
        is_active="True",
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    return IssuableCertificateTemplateRead.from_orm(template)


async def update_template(
    db: AsyncSession,
    template_id: UUID,
    data: IssuableCertificateTemplateUpdate,
) -> IssuableCertificateTemplateRead:
    """Update an existing certificate template"""
    # Get existing template
    query = select(IssuableCertificateTemplate).where(
        IssuableCertificateTemplate.id == template_id
    )
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Update fields if provided
    if data.name is not None:
        template.name = data.name
    if data.html_template is not None:
        template.html_template = data.html_template
        # Re-extract variables
        variables = extract_variables(data.html_template)
        template.variables_used = ",".join(variables) if variables else None
    if data.color_theme is not None:
        template.color_theme = data.color_theme
    if data.is_active is not None:
        template.is_active = data.is_active

    await db.commit()
    await db.refresh(template)

    return IssuableCertificateTemplateRead.from_orm(template)


async def delete_template(db: AsyncSession, template_id: UUID) -> None:
    """Delete a certificate template (soft delete via is_active)"""
    query = select(IssuableCertificateTemplate).where(
        IssuableCertificateTemplate.id == template_id
    )
    result = await db.execute(query)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Soft delete
    template.is_active = "False"
    await db.commit()


# ============================================================================
# CERTIFICATE GENERATION
# ============================================================================


async def generate_certificate(
    db: AsyncSession,
    request_data: GenerateCertificateRequest,
    issued_by_id: UUID,
) -> GeneratedCertificateRead:
    """Generate and save a certificate from a template"""
    # Get template
    template_query = select(IssuableCertificateTemplate).where(
        IssuableCertificateTemplate.id == request_data.template_id
    )
    template_result = await db.execute(template_query)
    template = template_result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    if str(template.is_active).lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template is inactive"
        )

    student_exists = await db.execute(select(Student.id).where(Student.id == request_data.student_id))
    if student_exists.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # Create generated certificate record
    certificate = GeneratedCertificate(
        id=uuid.uuid4(),
        student_id=request_data.student_id,
        template_id=request_data.template_id,
        html_content=request_data.edited_html,
        issued_by=issued_by_id,
        remarks=request_data.remarks,
        is_active="True",
    )

    db.add(certificate)
    await db.flush()
    saved = (
        await db.execute(select(GeneratedCertificate).where(GeneratedCertificate.id == certificate.id))
    ).scalar_one()
    result = GeneratedCertificateRead.from_orm(saved)
    await db.commit()

    return result


async def get_issued_certificates_by_student(
    db: AsyncSession,
    student_id: UUID,
) -> list[GeneratedCertificateRead]:
    """Get all issued certificates for a student"""
    query = select(GeneratedCertificate).where(
        GeneratedCertificate.student_id == student_id,
        func.lower(GeneratedCertificate.is_active) == "true",
    )
    result = await db.execute(query)
    certificates = result.scalars().all()

    return [GeneratedCertificateRead.from_orm(c) for c in certificates]


async def get_issued_certificate_by_id(
    db: AsyncSession,
    certificate_id: UUID,
) -> GeneratedCertificateRead:
    """Get a specific issued certificate"""
    query = select(GeneratedCertificate).where(
        GeneratedCertificate.id == certificate_id
    )
    result = await db.execute(query)
    certificate = result.scalar_one_or_none()

    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )

    return GeneratedCertificateRead.from_orm(certificate)


async def delete_issued_certificate(db: AsyncSession, certificate_id: UUID) -> None:
    """Delete an issued certificate (soft delete)"""
    query = select(GeneratedCertificate).where(
        GeneratedCertificate.id == certificate_id
    )
    result = await db.execute(query)
    certificate = result.scalar_one_or_none()

    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )

    # Soft delete
    certificate.is_active = "False"
    await db.commit()


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================


def extract_variables(html_template: str) -> list[str]:
    """Extract variable names from HTML template ({{variable_name}})"""
    pattern = r'\{\{(\w+)\}\}'
    matches = re.findall(pattern, html_template)
    return list(set(matches))  # Remove duplicates

"""
Issuable Certificate Endpoints — Template management and certificate generation

3 main endpoints:
- GET /issuable-certificates/templates/ → List all templates
- GET /issuable-certificates/templates/{id}/ → Get single template
- POST /issuable-certificates/generate/ → Generate & save certificate
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.student.issuable_certificate_schema import (
    GenerateCertificateRequest,
    GenerateCertificateResponse,
    GeneratedCertificateRead,
    IssuableCertificateTemplateCreate,
    IssuableCertificateTemplateRead,
    IssuableCertificateTemplateUpdate,
)
from app.service.student.issuable_certificate_service import (
    create_template,
    delete_template,
    delete_issued_certificate,
    generate_certificate,
    get_all_templates,
    get_issued_certificate_by_id,
    get_issued_certificates_by_student,
    get_template_by_id,
    update_template,
)
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(
    prefix="/issuable-certificates",
    tags=["Student/Issuable Certificates"]
)


# ============================================================================
# TEMPLATE ENDPOINTS
# ============================================================================


@router.get("/templates/", response_model=list[IssuableCertificateTemplateRead])
async def list_templates(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Get all active certificate templates.

    Returns list of available templates (Bonafide, TC, Conduct, etc.)
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "issuable_certificates", "read"
    )

    return await get_all_templates(db)


@router.get("/templates/{template_id}/", response_model=IssuableCertificateTemplateRead)
async def get_template(
    template_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Get a single certificate template by ID.

    **Permission Required:** `issuable_certificates:read`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "issuable_certificates", "read"
    )

    return await get_template_by_id(db, template_id)


@router.post("/templates/", response_model=IssuableCertificateTemplateRead, status_code=status.HTTP_201_CREATED)
async def create_new_template(
    data: IssuableCertificateTemplateCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Create a new certificate template.

    **Permission Required:** Admin role only
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Admin only
    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can create certificate templates"
        )

    return await create_template(db, data)


@router.put("/templates/{template_id}/", response_model=IssuableCertificateTemplateRead)
async def update_existing_template(
    template_id: UUID,
    data: IssuableCertificateTemplateUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Update an existing certificate template.

    **Permission Required:** Admin role only
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Admin only
    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can update certificate templates"
        )

    return await update_template(db, template_id, data)


@router.delete("/templates/{template_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_template(
    template_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Delete a certificate template.

    **Permission Required:** Admin role only
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Admin only
    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can delete certificate templates"
        )

    await delete_template(db, template_id)
    return None


# ============================================================================
# CERTIFICATE GENERATION ENDPOINTS
# ============================================================================


@router.post("/generate/", response_model=GeneratedCertificateRead, status_code=status.HTTP_201_CREATED)
async def generate_new_certificate(
    request_data: GenerateCertificateRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Generate a new certificate from a template.

    Takes template ID, student ID, and edited HTML.
    Creates and saves the certificate.

    **Permission Required:** Admin role only
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))

    # Admin only
    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can generate certificates"
        )

    return await generate_certificate(db, request_data, user_id)


@router.get("/issued/", response_model=list[GeneratedCertificateRead])
async def list_issued_certificates(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Get all issued certificates for a student.

    **Permission Required:** `issuable_certificates:read`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "issuable_certificates", "read"
    )

    return await get_issued_certificates_by_student(db, student_id)


@router.get("/issued/{certificate_id}/", response_model=GeneratedCertificateRead)
async def get_issued_certificate(
    certificate_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Get a specific issued certificate by ID.

    **Permission Required:** `issuable_certificates:read`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "issuable_certificates", "read"
    )

    return await get_issued_certificate_by_id(db, certificate_id)


@router.delete("/issued/{certificate_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generated_certificate(
    certificate_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Delete an issued certificate.

    **Permission Required:** `issuable_certificates:delete`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "issuable_certificates", "delete"
    )

    await delete_issued_certificate(db, certificate_id)
    return None

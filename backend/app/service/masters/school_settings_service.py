import logging
import os
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.school_settings_model import SchoolSettings
from app.schemas.masters.school_settings_schema import SchoolSettingsUpdate

log = logging.getLogger("masters.school_settings_service")


async def get_settings(db: AsyncSession) -> SchoolSettings | None:
    try:
        result = await db.execute(select(SchoolSettings).limit(1))
        return result.scalar_one_or_none()
    except Exception as e:
        log.error("Error fetching SchoolSettings: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving school settings.",
        )


async def upsert_settings(db: AsyncSession, payload: SchoolSettingsUpdate) -> SchoolSettings:
    try:
        result = await db.execute(select(SchoolSettings).limit(1))
        settings = result.scalar_one_or_none()

        if settings is not None:
            settings.school_name = payload.school_name
            settings.contact_no = payload.contact_no
            settings.alt_contact_no = payload.alt_contact_no
            settings.school_email = payload.school_email
            settings.address = payload.address
            settings.city = payload.city
            settings.state = payload.state
            settings.district = payload.district
            settings.pin_code = payload.pin_code
            settings.country = payload.country
            settings.academic_year = payload.academic_year
            settings.installation_date = payload.installation_date
            settings.school_board = payload.school_board
        else:
            settings = SchoolSettings(
                id=uuid.uuid4(),
                school_name=payload.school_name,
                contact_no=payload.contact_no,
                alt_contact_no=payload.alt_contact_no,
                school_email=payload.school_email,
                address=payload.address,
                city=payload.city,
                state=payload.state,
                district=payload.district,
                pin_code=payload.pin_code,
                country=payload.country,
                academic_year=payload.academic_year,
                installation_date=payload.installation_date,
                school_board=payload.school_board,
            )
            db.add(settings)

        await db.flush()
        return settings

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError upserting SchoolSettings: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A conflict occurred while saving school settings.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error upserting SchoolSettings: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving school settings.",
        )


async def upload_school_image(file: UploadFile, db: AsyncSession) -> SchoolSettings:
    return await _upload_file(file, db, field="image_url", save_dir=os.path.join("media", "school", "images"))


async def upload_school_signature(file: UploadFile, db: AsyncSession) -> SchoolSettings:
    return await _upload_file(file, db, field="principal_signature_url", save_dir=os.path.join("media", "school", "signatures"))


async def _upload_file(file: UploadFile, db: AsyncSession, field: str, save_dir: str) -> SchoolSettings:
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Only jpg, png, webp files are allowed")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must not exceed 2 MB")

    os.makedirs(save_dir, exist_ok=True)
    filename = f"school_{field}{ext}"
    filepath = os.path.join(save_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    result = await db.execute(select(SchoolSettings).limit(1))
    settings = result.scalar_one_or_none()

    url = f"/{save_dir.replace(os.sep, '/')}/{filename}"

    if settings is not None:
        setattr(settings, field, url)
    else:
        kwargs = {"id": uuid.uuid4(), field: url}
        settings = SchoolSettings(**kwargs)
        db.add(settings)

    await db.flush()
    await db.commit()
    await db.refresh(settings)
    return settings

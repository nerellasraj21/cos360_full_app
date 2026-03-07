"""
Recipient resolution for all target_types (FR-201 to FR-204).

Returns (valid_recipients, skipped_recipients).
Each recipient dict contains: name, phone, email, student_name?, class_name?, section_name?
Skipped recipients have reason="missing_contact".
"""
import logging
from typing import Any, Dict, List, Tuple
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

RecipientDict = Dict[str, Any]

# System variables that are auto-resolved per recipient
SYSTEM_VARS = {"name", "student_name", "class_name", "section_name"}


async def resolve_recipients(
    db: AsyncSession,
    target_type: str,
    target_ref: Dict[str, Any],
    channel: str,
) -> Tuple[List[RecipientDict], List[RecipientDict]]:
    """
    Resolve recipients for a given target_type.

    Returns:
        (valid_recipients, skipped_recipients)
        Valid = have required contact for the channel.
        Skipped = missing phone (sms/whatsapp) or missing email (email).
    """
    raw_recipients: List[RecipientDict] = await _resolve_raw(db, target_type, target_ref)
    valid: List[RecipientDict] = []
    skipped: List[RecipientDict] = []

    for r in raw_recipients:
        if channel in ("sms", "whatsapp"):
            if not r.get("phone"):
                r["skip_reason"] = "missing_contact"
                skipped.append(r)
            else:
                valid.append(r)
        elif channel == "email":
            if not r.get("email"):
                r["skip_reason"] = "missing_contact"
                skipped.append(r)
            else:
                valid.append(r)
        else:
            valid.append(r)

    return valid, skipped


async def _resolve_raw(
    db: AsyncSession,
    target_type: str,
    target_ref: Dict[str, Any],
) -> List[RecipientDict]:
    """Route to the correct resolver based on target_type."""
    resolvers = {
        "individual_parent": _resolve_individual_parent,
        "individual_student": _resolve_individual_student,
        "individual_staff": _resolve_individual_staff,
        "class_section_parents": _resolve_class_section_parents,
        "class_section_students": _resolve_class_section_students,
        "all_parents": _resolve_all_parents,
        "all_students": _resolve_all_students,
        "all_staff": _resolve_all_staff,
        "all_users": _resolve_all_users,
        "fee_defaulters": _resolve_fee_defaulters,
        "role_based": _resolve_role_based,
    }
    resolver = resolvers.get(target_type)
    if not resolver:
        raise ValueError(f"Unknown target_type: {target_type!r}")
    return await resolver(db, target_ref)


# ──────────────────────────────────────────────
# Individual resolvers
# ──────────────────────────────────────────────

async def _resolve_individual_parent(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    parent_id = target_ref.get("parent_id")
    if not parent_id:
        return []
    result = await db.execute(
        text("SELECT id, name, phone, email FROM parents WHERE id = :pid"),
        {"pid": parent_id},
    )
    rows = result.fetchall()
    return [{"name": r.name, "phone": r.phone, "email": r.email} for r in rows]


async def _resolve_individual_student(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    """Resolve student → linked parents (contact via parent)."""
    student_id = target_ref.get("student_id")
    if not student_id:
        return []
    result = await db.execute(
        text("""
            SELECT p.name, p.phone, p.email,
                   s.first_name AS student_first_name,
                   s.last_name AS student_last_name,
                   cl.name AS class_name,
                   sec.name AS section_name
            FROM student_parent_links spl
            JOIN parents p ON spl.parent_id = p.id
            JOIN students s ON spl.student_id = s.id
            LEFT JOIN student_admissions sa ON sa.student_id = s.id
            LEFT JOIN classes cl ON cl.id = sa.current_class_id
            LEFT JOIN sections sec ON sec.id = sa.current_section_id
            WHERE spl.student_id = :sid
        """),
        {"sid": student_id},
    )
    rows = result.fetchall()
    return [
        {
            "name": r.name,
            "phone": r.phone,
            "email": r.email,
            "student_name": f"{r.student_first_name} {r.student_last_name}".strip(),
            "class_name": r.class_name,
            "section_name": r.section_name,
        }
        for r in rows
    ]


async def _resolve_individual_staff(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    staff_id = target_ref.get("staff_id")
    if not staff_id:
        return []
    result = await db.execute(
        text("SELECT id, first_name, last_name, phone, email FROM staff WHERE id = :sid"),
        {"sid": staff_id},
    )
    rows = result.fetchall()
    return [
        {
            "name": f"{r.first_name} {r.last_name or ''}".strip(),
            "phone": r.phone,
            "email": r.email,
        }
        for r in rows
    ]


# ──────────────────────────────────────────────
# Group resolvers
# ──────────────────────────────────────────────

async def _resolve_class_section_parents(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    class_id = target_ref.get("class_id")
    section_id = target_ref.get("section_id")
    if not class_id:
        return []

    section_filter = "AND sa.current_section_id = :sec_id" if section_id else ""
    params: dict = {"cls_id": class_id}
    if section_id:
        params["sec_id"] = section_id

    result = await db.execute(
        text(f"""
            SELECT DISTINCT p.name, p.phone, p.email,
                   s.first_name AS student_first_name,
                   s.last_name AS student_last_name,
                   cl.name AS class_name,
                   sec.name AS section_name
            FROM student_admissions sa
            JOIN students s ON s.id = sa.student_id
            JOIN student_parent_links spl ON spl.student_id = s.id
            JOIN parents p ON p.id = spl.parent_id
            LEFT JOIN classes cl ON cl.id = sa.current_class_id
            LEFT JOIN sections sec ON sec.id = sa.current_section_id
            WHERE sa.current_class_id = :cls_id
              {section_filter}
        """),
        params,
    )
    rows = result.fetchall()
    return [
        {
            "name": r.name,
            "phone": r.phone,
            "email": r.email,
            "student_name": f"{r.student_first_name} {r.student_last_name or ''}".strip(),
            "class_name": r.class_name,
            "section_name": r.section_name,
        }
        for r in rows
    ]


async def _resolve_class_section_students(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    """Same as class_section_parents — students are contacted via their parents."""
    return await _resolve_class_section_parents(db, target_ref)


async def _resolve_all_parents(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    result = await db.execute(text("SELECT name, phone, email FROM parents"))
    rows = result.fetchall()
    return [{"name": r.name, "phone": r.phone, "email": r.email} for r in rows]


async def _resolve_all_students(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    """All students — contacted via parent links."""
    result = await db.execute(
        text("""
            SELECT DISTINCT p.name, p.phone, p.email,
                   s.first_name AS student_first_name,
                   s.last_name AS student_last_name,
                   cl.name AS class_name,
                   sec.name AS section_name
            FROM student_parent_links spl
            JOIN parents p ON p.id = spl.parent_id
            JOIN students s ON s.id = spl.student_id
            LEFT JOIN student_admissions sa ON sa.student_id = s.id
            LEFT JOIN classes cl ON cl.id = sa.current_class_id
            LEFT JOIN sections sec ON sec.id = sa.current_section_id
        """)
    )
    rows = result.fetchall()
    return [
        {
            "name": r.name,
            "phone": r.phone,
            "email": r.email,
            "student_name": f"{r.student_first_name} {r.student_last_name or ''}".strip(),
            "class_name": r.class_name,
            "section_name": r.section_name,
        }
        for r in rows
    ]


async def _resolve_all_staff(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    result = await db.execute(
        text("SELECT first_name, last_name, phone, email FROM staff WHERE is_active = true")
    )
    rows = result.fetchall()
    return [
        {
            "name": f"{r.first_name} {r.last_name or ''}".strip(),
            "phone": r.phone,
            "email": r.email,
        }
        for r in rows
    ]


async def _resolve_all_users(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    """
    Parents UNION active staff — deduplicated by phone (FR-204).
    If same phone appears in both, only one message is sent.
    """
    parents_result = await db.execute(
        text("SELECT name, phone, email FROM parents")
    )
    staff_result = await db.execute(
        text("SELECT first_name || ' ' || COALESCE(last_name, '') AS name, phone, email FROM staff WHERE is_active = true")
    )

    combined: List[RecipientDict] = []
    seen_phones: set = set()
    seen_emails: set = set()

    for row in parents_result.fetchall():
        key = (row.phone or "").strip().lower()
        ekey = (row.email or "").strip().lower()
        if key and key in seen_phones:
            continue
        if ekey and ekey in seen_emails:
            continue
        combined.append({"name": row.name, "phone": row.phone, "email": row.email})
        if key:
            seen_phones.add(key)
        if ekey:
            seen_emails.add(ekey)

    for row in staff_result.fetchall():
        key = (row.phone or "").strip().lower()
        ekey = (row.email or "").strip().lower()
        if key and key in seen_phones:
            continue
        if ekey and ekey in seen_emails:
            continue
        combined.append({"name": row.name.strip(), "phone": row.phone, "email": row.email})
        if key:
            seen_phones.add(key)
        if ekey:
            seen_emails.add(ekey)

    return combined


async def _resolve_fee_defaulters(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    """
    Parents whose student has total_fee > 0 in fee_student_mappings.
    NOTE: fee_student_mappings has no balance_due column; total_fee > 0 is used as proxy.
    """
    result = await db.execute(
        text("""
            SELECT DISTINCT p.name, p.phone, p.email,
                   s.first_name AS student_first_name,
                   s.last_name AS student_last_name,
                   cl.name AS class_name,
                   sec.name AS section_name
            FROM fee_student_mappings fsm
            JOIN students s ON s.id = fsm.student_id
            JOIN student_parent_links spl ON spl.student_id = s.id
            JOIN parents p ON p.id = spl.parent_id
            LEFT JOIN classes cl ON cl.id = fsm.class_id
            LEFT JOIN sections sec ON sec.id = fsm.section_id
            WHERE fsm.total_fee > 0
        """)
    )
    rows = result.fetchall()
    return [
        {
            "name": r.name,
            "phone": r.phone,
            "email": r.email,
            "student_name": f"{r.student_first_name} {r.student_last_name or ''}".strip(),
            "class_name": r.class_name,
            "section_name": r.section_name,
        }
        for r in rows
    ]


async def _resolve_role_based(db: AsyncSession, target_ref: dict) -> List[RecipientDict]:
    """Staff who hold a specific role (e.g., role='Teacher')."""
    role_name = target_ref.get("role")
    if not role_name:
        return []
    result = await db.execute(
        text("""
            SELECT s.first_name, s.last_name, s.phone, s.email
            FROM staff s
            JOIN users u ON u.id = s.user_id
            JOIN roles r ON r.id = u.role_id
            WHERE r.name = :role_name
              AND s.is_active = true
        """),
        {"role_name": role_name},
    )
    rows = result.fetchall()
    return [
        {
            "name": f"{r.first_name} {r.last_name or ''}".strip(),
            "phone": r.phone,
            "email": r.email,
        }
        for r in rows
    ]

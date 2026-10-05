import hashlib
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_LOCK_SQL = text(
    "SELECT pg_advisory_xact_lock(hashtextextended(coalesce(current_setting('app.tenant_id', true), '') || ':' || :k, 0))"
)


async def lock_student_payments(db: AsyncSession, student_id: UUID) -> None:
    await db.execute(_LOCK_SQL, {"k": f"fee-pay:{student_id}"})


async def lock_receipt_numbering(db: AsyncSession) -> None:
    await db.execute(_LOCK_SQL, {"k": "fee-receipt-number"})


def idempotent_transaction_number(student_id: UUID, idempotency_key: str) -> str:
    digest = hashlib.sha256(f"{student_id}:{idempotency_key.strip()}".encode()).hexdigest()[:32].upper()
    return f"TXK{digest}"

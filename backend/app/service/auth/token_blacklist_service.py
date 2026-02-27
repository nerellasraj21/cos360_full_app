import hashlib
import logging
from datetime import datetime, timezone

from sqlalchemy import text
from fastapi import HTTPException, status

logger = logging.getLogger("token_blacklist_service")

# Lazy flag so we only run CREATE TABLE IF NOT EXISTS once per process lifetime
_table_initialized = False

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS public.token_blacklist (
    token_hash  VARCHAR(64)  PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,
    username    VARCHAR(255),
    client_name VARCHAR(255),
    expires_at  TIMESTAMP    NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT NOW()
)
"""

_CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at
    ON public.token_blacklist (expires_at)
"""


def _hash_token(token: str) -> str:
    """Return SHA-256 hex digest of the raw token string."""
    return hashlib.sha256(token.encode()).hexdigest()


class TokenBlacklistService:

    @staticmethod
    async def _ensure_table(session) -> None:
        """Create the blacklist table and index if they do not exist yet."""
        global _table_initialized
        if not _table_initialized:
            await session.execute(text("SET search_path TO public"))
            await session.execute(text(_CREATE_TABLE_SQL))
            await session.execute(text(_CREATE_INDEX_SQL))
            await session.commit()
            _table_initialized = True

    # ------------------------------------------------------------------
    # Write path – called from the logout endpoint
    # ------------------------------------------------------------------

    @staticmethod
    async def blacklist_token(token: str, payload: dict) -> None:
        """
        Store a token in the blacklist.
        expires_at is taken from the JWT ``exp`` claim so the DB row
        naturally becomes stale after the token would have expired anyway.
        """
        from app.db.tenant_session import PublicAsyncSessionLocal

        token_hash = _hash_token(token)
        exp = payload.get("exp")
        if exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc).replace(tzinfo=None)
        else:
            # Fallback: 24 h from now (matches access-token default)
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(hours=24)

        user_id     = str(payload.get("sub", ""))
        username    = payload.get("username", "")
        client_name = payload.get("client_name", "")

        async with PublicAsyncSessionLocal() as session:
            try:
                await TokenBlacklistService._ensure_table(session)
                await session.execute(
                    text("""
                        INSERT INTO public.token_blacklist
                            (token_hash, user_id, username, client_name, expires_at)
                        VALUES
                            (:token_hash, :user_id, :username, :client_name, :expires_at)
                        ON CONFLICT (token_hash) DO NOTHING
                    """),
                    {
                        "token_hash": token_hash,
                        "user_id":     user_id,
                        "username":    username,
                        "client_name": client_name,
                        "expires_at":  expires_at,
                    },
                )
                await session.commit()
                logger.info(f"Token blacklisted for user '{username}' (expires {expires_at})")

            except Exception as e:
                await session.rollback()
                logger.error(f"Error blacklisting token: {e}")
                raise

    # ------------------------------------------------------------------
    # Read path – called on every authenticated request
    # ------------------------------------------------------------------

    @staticmethod
    async def is_blacklisted(token: str) -> bool:
        """
        Return True if the token has been blacklisted and has not yet
        expired (i.e. the row still exists and expires_at > NOW()).
        Fails *open* on DB errors so a DB outage does not lock everyone out.
        """
        from app.db.tenant_session import PublicAsyncSessionLocal

        token_hash = _hash_token(token)

        async with PublicAsyncSessionLocal() as session:
            try:
                await TokenBlacklistService._ensure_table(session)
                result = await session.execute(
                    text("""
                        SELECT 1
                        FROM   public.token_blacklist
                        WHERE  token_hash = :token_hash
                          AND  expires_at > NOW()
                    """),
                    {"token_hash": token_hash},
                )
                return result.fetchone() is not None

            except Exception as e:
                logger.error(f"Error checking token blacklist: {e}")
                return False  # fail open – don't block requests on DB errors

    # ------------------------------------------------------------------
    # Housekeeping – call periodically to keep the table small
    # ------------------------------------------------------------------

    @staticmethod
    async def cleanup_expired() -> None:
        """Delete rows whose tokens have already expired naturally."""
        from app.db.tenant_session import PublicAsyncSessionLocal

        async with PublicAsyncSessionLocal() as session:
            try:
                await session.execute(text("SET search_path TO public"))
                await session.execute(
                    text("DELETE FROM public.token_blacklist WHERE expires_at <= NOW()")
                )
                await session.commit()
                logger.info("Cleaned up expired blacklist entries")
            except Exception as e:
                await session.rollback()
                logger.error(f"Error cleaning up token blacklist: {e}")

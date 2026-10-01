from datetime import UTC, datetime
import hashlib
import logging

from sqlalchemy import text

logger = logging.getLogger("token_blacklist_service")


def _hash_token(token: str) -> str:
    """Return SHA-256 hex digest of the raw token string."""
    return hashlib.sha256(token.encode()).hexdigest()


class TokenBlacklistService:

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
            expires_at = datetime.fromtimestamp(exp, tz=UTC).replace(tzinfo=None)
        else:
            # Fallback: 24 h from now (matches access-token default)
            from datetime import timedelta

            expires_at = datetime.utcnow() + timedelta(hours=24)

        user_id = str(payload.get("sub", ""))
        username = payload.get("username", "")
        client_name = payload.get("client_name", "")

        async with PublicAsyncSessionLocal() as session:
            try:
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
                        "user_id": user_id,
                        "username": username,
                        "client_name": client_name,
                        "expires_at": expires_at,
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
                await session.execute(text("DELETE FROM public.token_blacklist WHERE expires_at <= NOW()"))
                await session.commit()
                logger.info("Cleaned up expired blacklist entries")
            except Exception as e:
                await session.rollback()
                logger.error(f"Error cleaning up token blacklist: {e}")

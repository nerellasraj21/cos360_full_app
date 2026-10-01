from sqlalchemy import TIMESTAMP, Column, String, func

from app.db.base import BasePublic


class TokenBlacklist(BasePublic):
    __tablename__ = "token_blacklist"

    token_hash = Column(String(64), primary_key=True)
    user_id = Column(String(255), nullable=False)
    username = Column(String(255), nullable=True)
    client_name = Column(String(255), nullable=True)
    expires_at = Column(TIMESTAMP, nullable=False, index=True)
    blacklisted_at = Column(TIMESTAMP, nullable=True, server_default=func.now())

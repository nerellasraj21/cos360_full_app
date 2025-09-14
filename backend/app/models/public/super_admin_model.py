from sqlalchemy import Column, String, Boolean, TIMESTAMP, func, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import BasePublic
import uuid

class SuperAdmin(BasePublic):
    __tablename__ = 'super_admin_users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(TIMESTAMP, nullable=True)
    password_changed_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Security fields
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    account_locked_until = Column(TIMESTAMP, nullable=True)
    requires_password_change = Column(Boolean, nullable=False, default=False)
    
    def __repr__(self):
        return f"<SuperAdmin(id={self.id}, username='{self.username}', email='{self.email}', is_active={self.is_active})>"

class SuperAdminAudit(BasePublic):
    __tablename__ = 'super_admin_audit'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    super_admin_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True)
    tenant_id = Column(String(100), nullable=True)  # When action affects specific tenant
    details = Column(Text, nullable=True)  # JSON details of the action
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, nullable=False, server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<SuperAdminAudit(id={self.id}, action='{self.action}', resource='{self.resource}', timestamp={self.timestamp})>"
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import logging as log
import hashlib
import secrets
import json

from app.models.public.super_admin_model import SuperAdmin, SuperAdminAudit
from app.models.public.tenant_model import Tenant
from app.schemas.public.super_admin_schema import (
    SuperAdminCreate, SuperAdminUpdate, SuperAdminRead, 
    SuperAdminPasswordChange, SuperAdminAuditCreate, SuperAdminAuditRead,
    SystemHealthCheck
)
from app.tools.password_util import hash_password, verify_password
from app.tools.jwt_utils import create_access_token, create_refresh_token

log = log.getLogger("super_admin.service")

class SuperAdminService:
    """Service for Super Admin user management and system operations"""
    
    @staticmethod
    async def create_super_admin(
        db: AsyncSession,
        super_admin_data: SuperAdminCreate
    ) -> SuperAdminRead:
        """Create new Super Admin user"""
        try:
            # Check if username already exists
            existing_user = await db.execute(
                select(SuperAdmin).where(SuperAdmin.username == super_admin_data.username)
            )
            if existing_user.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
            
            # Check if email already exists
            existing_email = await db.execute(
                select(SuperAdmin).where(SuperAdmin.email == super_admin_data.email)
            )
            if existing_email.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
            
            # Hash password
            hashed_password = hash_password(super_admin_data.password)
            
            # Create super admin
            db_super_admin = SuperAdmin(
                username=super_admin_data.username,
                email=super_admin_data.email,
                full_name=super_admin_data.full_name,
                hashed_password=hashed_password,
                is_active=super_admin_data.is_active,
                password_changed_at=func.now()
            )
            
            db.add(db_super_admin)
            await db.commit()
            await db.refresh(db_super_admin)
            
            log.info(f"Super Admin created: {super_admin_data.username}")
            return db_super_admin
            
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error creating Super Admin: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating Super Admin"
            )

    @staticmethod
    async def authenticate_super_admin(
        db: AsyncSession,
        username: str,
        password: str,
        ip_address: str = None
    ) -> tuple[SuperAdminRead, dict]:
        """Authenticate Super Admin and return user + tokens"""
        try:
            # Get super admin by username
            result = await db.execute(
                select(SuperAdmin).where(SuperAdmin.username == username)
            )
            super_admin = result.scalar_one_or_none()
            
            if not super_admin:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            # Check if account is locked
            if super_admin.account_locked_until and super_admin.account_locked_until > datetime.now():
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account is temporarily locked due to multiple failed login attempts"
                )
            
            # Verify password
            if not verify_password(password, super_admin.hashed_password):
                # Increment failed login attempts
                super_admin.failed_login_attempts += 1
                
                # Lock account after 5 failed attempts
                if super_admin.failed_login_attempts >= 5:
                    super_admin.account_locked_until = datetime.now() + timedelta(minutes=30)
                
                await db.commit()
                
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            # Check if user is active
            if not super_admin.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is deactivated"
                )
            
            # Reset failed login attempts on successful login
            super_admin.failed_login_attempts = 0
            super_admin.account_locked_until = None
            super_admin.last_login_at = func.now()
            
            await db.commit()
            await db.refresh(super_admin)
            
            # Generate tokens with ultimate access claims
            token_data = {
                "sub": str(super_admin.id),
                "username": super_admin.username,
                "user_type": "super_admin",
                "is_superadmin": True,
                "bypass_permissions": True,
                "ultimate_access": True,
                "permissions": ["system_admin", "tenant_management", "plan_management"]
            }
            
            access_token = create_access_token(data=token_data)
            refresh_token = create_refresh_token(data={"sub": str(super_admin.id)})
            
            # Log successful login
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=super_admin.id,
                action="LOGIN",
                resource="authentication",
                details={"ip_address": ip_address},
                ip_address=ip_address
            )
            
            tokens = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 24 * 60 * 60,  # 24 hours
                "user_type": "super_admin"
            }
            
            return super_admin, tokens
            
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error authenticating Super Admin: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred during authentication"
            )

    @staticmethod
    async def get_super_admin_by_id(db: AsyncSession, super_admin_id: UUID) -> SuperAdminRead:
        """Get Super Admin by ID"""
        try:
            result = await db.execute(
                select(SuperAdmin).where(SuperAdmin.id == super_admin_id)
            )
            super_admin = result.scalar_one_or_none()
            
            if not super_admin:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Super Admin not found"
                )
            
            return super_admin
            
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error getting Super Admin: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while retrieving Super Admin"
            )

    @staticmethod
    async def update_super_admin(
        db: AsyncSession,
        super_admin_id: UUID,
        update_data: SuperAdminUpdate,
        updated_by_id: UUID
    ) -> SuperAdminRead:
        """Update Super Admin information"""
        try:
            super_admin = await SuperAdminService.get_super_admin_by_id(db, super_admin_id)
            
            # Update fields if provided
            if update_data.email is not None:
                # Check email uniqueness
                existing_email = await db.execute(
                    select(SuperAdmin).where(
                        and_(SuperAdmin.email == update_data.email, SuperAdmin.id != super_admin_id)
                    )
                )
                if existing_email.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists"
                    )
                super_admin.email = update_data.email
            
            if update_data.full_name is not None:
                super_admin.full_name = update_data.full_name
            
            if update_data.is_active is not None:
                super_admin.is_active = update_data.is_active
            
            super_admin.updated_at = func.now()
            
            await db.commit()
            await db.refresh(super_admin)
            
            # Create audit log
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=updated_by_id,
                action="UPDATE",
                resource="super_admin",
                resource_id=str(super_admin_id),
                details=update_data.dict(exclude_unset=True)
            )
            
            return super_admin
            
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error updating Super Admin: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating Super Admin"
            )

    @staticmethod
    async def change_password(
        db: AsyncSession,
        super_admin_id: UUID,
        password_data: SuperAdminPasswordChange
    ) -> dict:
        """Change Super Admin password"""
        try:
            super_admin = await SuperAdminService.get_super_admin_by_id(db, super_admin_id)
            
            # Verify current password
            if not verify_password(password_data.current_password, super_admin.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect"
                )
            
            # Hash new password
            hashed_password = hash_password(password_data.new_password)
            
            # Update password
            super_admin.hashed_password = hashed_password
            super_admin.password_changed_at = func.now()
            super_admin.requires_password_change = False
            super_admin.updated_at = func.now()
            
            await db.commit()
            
            # Create audit log
            await SuperAdminService.create_audit_log(
                db=db,
                super_admin_id=super_admin_id,
                action="PASSWORD_CHANGE",
                resource="authentication",
                details={"action": "password_changed"}
            )
            
            return {"message": "Password changed successfully"}
            
        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            log.error(f"Error changing password: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while changing password"
            )

    @staticmethod
    async def create_audit_log(
        db: AsyncSession,
        super_admin_id: UUID,
        action: str,
        resource: str,
        resource_id: str = None,
        tenant_id: str = None,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Create audit log entry"""
        try:
            audit_entry = SuperAdminAudit(
                super_admin_id=super_admin_id,
                action=action,
                resource=resource,
                resource_id=resource_id,
                tenant_id=tenant_id,
                details=json.dumps(details) if details else None,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            db.add(audit_entry)
            await db.commit()
            
        except Exception as e:
            log.error(f"Error creating audit log: {str(e)}")
            # Don't raise exception for audit logging failures

    @staticmethod
    async def get_system_health(db: AsyncSession) -> SystemHealthCheck:
        """Get system health status"""
        try:
            # Count tenants
            total_tenants_result = await db.execute(select(func.count(Tenant.id)))
            total_tenants = total_tenants_result.scalar()
            
            active_tenants_result = await db.execute(
                select(func.count(Tenant.id)).where(Tenant.is_active == True)
            )
            active_tenants = active_tenants_result.scalar()
            
            return SystemHealthCheck(
                status="healthy",
                database_status="connected",
                redis_status=None,  # TODO: Implement if using Redis
                total_tenants=total_tenants,
                active_tenants=active_tenants,
                system_version="1.0.0",  # TODO: Get from config
                uptime="Unknown",  # TODO: Implement uptime tracking
                timestamp=datetime.now()
            )
            
        except Exception as e:
            log.error(f"Error getting system health: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while checking system health"
            )
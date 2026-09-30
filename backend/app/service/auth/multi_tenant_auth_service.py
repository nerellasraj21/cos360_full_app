import logging
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import TenantService, get_tenant_db
from app.middleware.tenant_middleware import get_client_name_from_request
from app.models.auth.menu_model import Menu
from app.models.auth.permissions_model import RoleMenuPermission
from app.models.auth.resource_permission_model import ResourcePermission
from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.tools.jwt_utils import create_access_token, create_change_password_token, create_refresh_token
from app.tools.password_util import verify_password

logger = logging.getLogger("multi_tenant_auth_service")


class MultiTenantAuthService:
    """Service for multi-tenant authentication and menu management"""

    @staticmethod
    async def _attach_role(db: AsyncSession, user: User) -> User:
        """Fetch and attach the role object to a user."""
        role_result = await db.execute(select(Role).where(Role.id == user.role_id))
        user.role = role_result.scalar_one_or_none()
        return user

    @staticmethod
    async def authenticate_user(db: AsyncSession, identifier: str, password: str) -> User:
        """
        Authenticate a user by username, email, or phone number.

        Lookup order:
        1. users.username == identifier  (covers email-as-username for newly enrolled staff)
        2. users.email == identifier     (explicit email match)
        3. staff.phone JOIN users        (phone number login)

        Args:
            db: Database session (already configured for tenant schema)
            identifier: Email, phone number, or username
            password: Password to verify

        Returns:
            User: Authenticated user with .role attached

        Raises:
            HTTPException 401: If credentials are invalid or user is inactive
        """
        try:
            user = None

            # 1. Try username match
            result = await db.execute(select(User).where(User.username == identifier))
            user = result.scalar_one_or_none()

            # 2. Try email match (if different from username)
            if not user:
                result = await db.execute(select(User).where(User.email == identifier))
                user = result.scalar_one_or_none()

            # 3. Try phone via Staff table
            if not user:
                from app.models.masters.staff_model import Staff

                result = await db.execute(
                    select(User).join(Staff, Staff.user_id == User.id).where(Staff.phone == identifier)
                )
                user = result.scalar_one_or_none()

            if not user:
                logger.warning(f"User not found for identifier: {identifier}")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            if not user.is_active:
                logger.warning(f"Inactive user attempted login: {identifier}")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            if not verify_password(password, user.password_hash):
                logger.warning(f"Invalid password for identifier: {identifier}")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

            await MultiTenantAuthService._attach_role(db, user)
            logger.info(f"User authenticated successfully: {identifier}")
            return user

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during user authentication: {str(e)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error")

    @staticmethod
    async def build_hierarchical_menu(db: AsyncSession, role_id: int, max_depth: int = 4) -> list[dict[str, Any]]:
        """
        Build hierarchical menu structure based on user's role permissions.

        Args:
            db: Database session (already configured for tenant schema)
            role_id: User's role ID
            max_depth: Maximum menu depth to support (default: 4 for L0-L3)

        Returns:
            List[Dict]: Nested menu structure
        """
        try:
            # Get all menus that the role can access
            logger.info(f"DEBUG MENU 1: Starting menu query for role_id: {role_id}")
            try:
                result = await db.execute(
                    select(Menu, RoleMenuPermission.can_view)
                    .join(RoleMenuPermission, Menu.id == RoleMenuPermission.menu_id)
                    .where(RoleMenuPermission.role_id == role_id, RoleMenuPermission.can_view)
                    .order_by(Menu.display_order, Menu.id)
                )
                accessible_menus = result.fetchall()
                logger.info(f"DEBUG MENU 2: Menu query successful, found {len(accessible_menus)} accessible menus")
            except Exception as db_error:
                logger.warning(f"DEBUG MENU 2: Menu query failed (tables may not exist): {str(db_error)}")
                logger.info("DEBUG MENU 3: Returning empty menu for tenant without menu setup")
                return []

            if not accessible_menus:
                logger.warning(f"No accessible menus found for role_id: {role_id}")
                return []

            # Convert to dictionary for easier processing
            menu_dict = {}
            for menu, _can_view in accessible_menus:
                menu_dict[menu.id] = {
                    "id": menu.id,
                    "name": menu.name,
                    "path": menu.url,
                    "parent_id": menu.parent_id,
                    "display_order": menu.display_order,
                    "level": menu.level,
                    "children": [],
                }

            # Build hierarchical structure
            root_menus = []

            # First, organize menus by parent-child relationship
            for _menu_id, menu_data in menu_dict.items():
                if menu_data["parent_id"] is None:
                    # Root level menu
                    root_menus.append(menu_data)
                else:
                    # Child menu - add to parent's children
                    parent_id = menu_data["parent_id"]
                    if parent_id in menu_dict:
                        menu_dict[parent_id]["children"].append(menu_data)

            # Sort menus by display_order at each level
            def sort_menu_recursive(menu_list):
                menu_list.sort(key=lambda x: x["display_order"])
                for menu in menu_list:
                    if menu["children"]:
                        sort_menu_recursive(menu["children"])

            sort_menu_recursive(root_menus)

            # Clean up unnecessary fields for API response
            def clean_menu_structure(menu_list):
                for menu in menu_list:
                    # Remove internal fields
                    menu.pop("parent_id", None)
                    menu.pop("level", None)

                    # Recursively clean children
                    if menu["children"]:
                        clean_menu_structure(menu["children"])
                    # Remove empty children arrays for cleaner response
                    elif "children" in menu:
                        menu.pop("children", None)

            clean_menu_structure(root_menus)

            logger.info(f"Built hierarchical menu with {len(root_menus)} root items for role_id: {role_id}")
            return root_menus

        except Exception as e:
            logger.error(f"Error building hierarchical menu for role_id {role_id}: {str(e)}")
            return []

    @staticmethod
    async def get_user_permissions(db: AsyncSession, role_id: int) -> dict[str, list[str]]:
        """
        Fetch user's resource permissions from tenant schema only.

        Note: The dual-layer permission system (Plan ∩ Role) is only used during
        tenant onboarding. At runtime, users validate against tenant schema only.

        Args:
            db: Database session (already configured for tenant schema)
            role_id: User's role ID

        Returns:
            Dict[str, List[str]]: Resource permissions grouped by resource
            Example: {
                "fee_categories": ["create", "read", "update", "delete", "list"],
                "students": ["read", "list"],
                "academic_years": ["create", "read", "update", "list"]
            }
        """
        try:
            logger.info(f"Fetching tenant permissions for role_id: {role_id}")

            # Query resource permissions for the role from tenant schema
            result = await db.execute(
                select(ResourcePermission.resource, ResourcePermission.action)
                .where(ResourcePermission.role_id == role_id, ResourcePermission.is_granted)
                .order_by(ResourcePermission.resource, ResourcePermission.action)
            )
            permissions = result.fetchall()

            if not permissions:
                logger.warning(f"No permissions found for role_id: {role_id}")
                return {}

            # Group permissions by resource
            grouped_permissions = {}
            for resource, action in permissions:
                if resource not in grouped_permissions:
                    grouped_permissions[resource] = []
                grouped_permissions[resource].append(action)

            # Sort actions within each resource for consistency
            for resource in grouped_permissions:
                grouped_permissions[resource].sort()

            logger.info(f"Found permissions for {len(grouped_permissions)} resources for role_id: {role_id}")
            return grouped_permissions

        except Exception as e:
            logger.error(f"Error fetching permissions for role_id {role_id}: {str(e)}")
            return {}

    @staticmethod
    async def login_user(
        request: Request,
        username: str,
        password: str,
        client_name: str | None = None,
        academic_year_id: UUID | None = None,
    ) -> dict[str, Any]:
        """
        Complete multi-tenant login process.

        Args:
            request: FastAPI request object
            username: User's username
            password: User's password
            client_name: Optional client name override

        Returns:
            Dict: Complete login response with user, role, menu, and tokens

        Raises:
            HTTPException: For various error conditions
        """
        # Use provided client_name or extract from request
        if client_name:
            final_client_name = client_name
        else:
            final_client_name = get_client_name_from_request(request)

        logger.info(f"DEBUG 1: Login attempt for user '{username}' on tenant '{final_client_name}'")

        # Validate tenant exists and is active
        logger.info(f"DEBUG 2: Getting tenant schema for '{final_client_name}'")
        schema_name = await TenantService.get_tenant_schema(final_client_name)
        if not schema_name:
            if final_client_name == "default":
                schema_name = "cos360_masters"  # Backward compatibility
                logger.info(f"DEBUG 3: Using default schema: {schema_name}")
            else:
                logger.warning(f"DEBUG 3: Tenant not found or inactive: {final_client_name}")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid connection")
        else:
            logger.info(f"DEBUG 3: Found tenant schema: {schema_name}")

        # Get tenant database session
        logger.info("DEBUG 4: Getting tenant database session")
        async for db in get_tenant_db(request):
            try:
                logger.info("DEBUG 5: Starting user authentication")
                # Authenticate user
                user = await MultiTenantAuthService.authenticate_user(db, username, password)
                logger.info(f"DEBUG 6: User authenticated successfully, role_id: {user.role_id}")

                # Build hierarchical menu
                logger.info(f"DEBUG 7: Building hierarchical menu for role_id: {user.role_id}")
                menu = await MultiTenantAuthService.build_hierarchical_menu(db, user.role_id)
                logger.info(f"DEBUG 8: Menu built successfully, menu count: {len(menu)}")

                # Get user permissions
                logger.info(f"DEBUG 9: Fetching user permissions for role_id: {user.role_id}")
                permissions = await MultiTenantAuthService.get_user_permissions(db, user.role_id)
                logger.info(f"DEBUG 10: Permissions fetched successfully, resource count: {len(permissions)}")

                # ---- Validate academic year ----
                if academic_year_id is None:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Academic year is required")

                from app.models.masters.academic_year_model import AcademicYear

                ay_result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
                academic_year = ay_result.scalar_one_or_none()
                if not academic_year:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid academic year")
                academic_year_title = academic_year.title

                # ---- First-login check (Staff, Teacher, Student & Parent) ----
                role_name = user.role.name if user.role else ""
                if role_name in ("Staff", "Teacher", "Student", "Parent"):
                    # Check via raw SQL — graceful if column not yet added to DB
                    try:
                        from sqlalchemy import text as _text

                        fl_result = await db.execute(
                            _text("SELECT is_first_login FROM users WHERE id = :id"), {"id": str(user.id)}
                        )
                        is_first_login_val = fl_result.scalar_one_or_none()
                    except Exception:
                        is_first_login_val = None  # column doesn't exist yet

                    if is_first_login_val is True:
                        logger.info(f"First-time login detected for staff user: {user.username}")
                        change_token = create_change_password_token(
                            {
                                "sub": str(user.id),
                                "username": user.username,
                                "role": role_name,
                                "client_name": final_client_name,
                                "academic_year_id": str(academic_year_id),
                                "academic_year_title": academic_year_title,
                            }
                        )
                        return {
                            "requires_password_change": True,
                            "change_password_token": change_token,
                            "message": "Please set a new password to continue",
                            "academic_year_id": academic_year_id,
                            "academic_year_title": academic_year_title,
                        }

                # Determine entity_id based on role (student, parent, else staff record)
                entity_id = await MultiTenantAuthService._resolve_entity_id(db, user.id, role_name)

                # Create access token and refresh token with client information
                token_data = {
                    "sub": str(user.id),
                    "username": user.username,
                    "role": user.role.name,
                    "client_name": final_client_name,
                    "academic_year_id": str(academic_year_id),
                    "academic_year_title": academic_year_title,
                }

                access_token = create_access_token(token_data)
                refresh_token = create_refresh_token(token_data)

                # Prepare response
                response_data = {
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_active": user.is_active,
                    },
                    "role": {"id": user.role.id, "name": user.role.name, "description": user.role.description},
                    "menu": menu,
                    "permissions": permissions,
                    "entity_id": entity_id,
                    "academic_year_id": academic_year_id,
                    "academic_year_title": academic_year_title,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                }

                logger.info(f"Successful login for user '{username}' on tenant '{final_client_name}'")
                return response_data

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Unexpected error during login: {str(e)}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login error")

    @staticmethod
    async def set_password_first_login(
        request: Request,
        change_password_token: str,
        new_password: str,
        client_name: str | None = None,
    ) -> dict[str, Any]:
        """
        Complete the first-time password change flow.

        1. Verifies the change_password_token
        2. Updates the user's password_hash in DB
        3. Clears is_first_login flag
        4. Returns a full login response (menu, permissions, tokens)

        Raises:
            HTTPException 401: Invalid / expired token
            HTTPException 400: Passwords don't meet requirements
        """
        from app.tools.jwt_utils import verify_change_password_token
        from app.tools.password_util import hash_password

        payload = verify_change_password_token(change_password_token)

        user_id = payload.get("sub")
        final_client_name = client_name or payload.get("client_name") or get_client_name_from_request(request)
        academic_year_id_str = payload.get("academic_year_id")
        academic_year_title = payload.get("academic_year_title", "")

        schema_name = await TenantService.get_tenant_schema(final_client_name)
        if not schema_name:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid connection")

        async for db in get_tenant_db(request):
            try:
                from uuid import UUID as _UUID

                result = await db.execute(select(User).where(User.id == _UUID(user_id)))
                user = result.scalar_one_or_none()
                if not user:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

                if not user.is_active:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")

                from sqlalchemy import text as _text

                # The token only works while the user is still in first-login state, so a
                # leaked or reused token cannot reset a password that has already been set.
                try:
                    async with db.begin_nested():
                        is_first_login = (
                            await db.execute(
                                _text("SELECT is_first_login FROM users WHERE id = :id"), {"id": str(user.id)}
                            )
                        ).scalar()
                except Exception:
                    is_first_login = None
                if not is_first_login:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Password has already been set. Please log in with your password.",
                    )

                user.password_hash = hash_password(new_password)
                await db.flush()

                # Clear first-login flag via raw SQL (graceful if column doesn't exist)
                try:
                    await db.execute(
                        _text("UPDATE users SET is_first_login = FALSE WHERE id = :id"), {"id": str(user.id)}
                    )
                except Exception:
                    pass

                # Attach role
                await MultiTenantAuthService._attach_role(db, user)

                menu = await MultiTenantAuthService.build_hierarchical_menu(db, user.role_id)
                permissions = await MultiTenantAuthService.get_user_permissions(db, user.role_id)

                # Resolve entity_id based on role (student, parent, else staff record)
                entity_id = await MultiTenantAuthService._resolve_entity_id(
                    db, user.id, user.role.name if user.role else ""
                )

                token_data = {
                    "sub": str(user.id),
                    "username": user.username,
                    "role": user.role.name if user.role else "",
                    "client_name": final_client_name,
                    "academic_year_id": academic_year_id_str,
                    "academic_year_title": academic_year_title,
                }
                access_token = create_access_token(token_data)
                refresh_token = create_refresh_token(token_data)

                await db.commit()

                return {
                    "message": "Password updated successfully",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_active": user.is_active,
                    },
                    "role": {
                        "id": user.role.id if user.role else None,
                        "name": user.role.name if user.role else "",
                        "description": user.role.description if user.role else None,
                    },
                    "menu": menu,
                    "permissions": permissions,
                    "entity_id": entity_id,
                    "academic_year_id": academic_year_id_str,
                    "academic_year_title": academic_year_title,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                }
            except HTTPException:
                await db.rollback()
                raise
            except Exception as e:
                await db.rollback()
                logger.error(f"Error in set_password_first_login: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update password"
                )

    @staticmethod
    async def _resolve_entity_id(db, user_id, role_name: str) -> str | None:
        """Student or parent record id for those roles; the staff record id for every other role
        (Staff, Teacher, and any Admin or custom role that has one)."""
        from app.models.masters.parent_model import Parent
        from app.models.masters.staff_model import Staff
        from app.models.student.student_model import Student

        model = {"Student": Student, "Parent": Parent}.get(role_name, Staff)
        try:
            async with db.begin_nested():
                result = await db.execute(select(model.id).where(model.user_id == user_id).limit(1))
                entity = result.scalars().first()
        except Exception as e:
            logger.warning(f"Could not resolve entity_id for role {role_name}: {e}")
            return None
        return str(entity) if entity else None

    @staticmethod
    async def validate_tenant(client_name: str) -> bool:
        """
        Validate if tenant exists and is active.

        Args:
            client_name: Client identifier

        Returns:
            bool: True if tenant is valid and active
        """
        try:
            schema_name = await TenantService.get_tenant_schema(client_name)
            return schema_name is not None
        except Exception as e:
            logger.error(f"Error validating tenant '{client_name}': {str(e)}")
            return False


# Import selectinload here to avoid circular imports

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from fastapi import HTTPException, status, Request
from app.models.auth.user_model import User
from app.models.auth.role_model import Role
from app.models.auth.menu_model import Menu
from app.models.auth.permissions_model import RoleMenuPermission
from app.tools.jwt_utils import create_access_token, create_refresh_token
from app.tools.password_util import verify_password
from app.db.tenant_session import get_tenant_db, TenantService
from app.middleware.tenant_middleware import get_client_name_from_request
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger("multi_tenant_auth_service")

class MultiTenantAuthService:
    """Service for multi-tenant authentication and menu management"""
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
        """
        Authenticate user within the current tenant schema.
        
        Args:
            db: Database session (already configured for tenant schema)
            username: User's username
            password: User's password
            
        Returns:
            User: Authenticated user object with role relationship
            
        Raises:
            HTTPException: If credentials are invalid
        """
        try:
            # Query user first (without problematic selectinload)
            result = await db.execute(
                select(User).where(User.username == username)
            )
            user = result.scalar_one_or_none()

            if user:
                # Query role separately and manually attach it
                from app.models.auth.role_model import Role
                role_result = await db.execute(
                    select(Role).where(Role.id == user.role_id)
                )
                role = role_result.scalar_one_or_none()

                # Manually set the role relationship to maintain compatibility
                user.role = role
            
            if not user:
                logger.warning(f"User not found: {username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Credentials"
                )
            
            if not user.is_active:
                logger.warning(f"Inactive user attempted login: {username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Credentials"
                )
            
            if not verify_password(password, user.password_hash):
                logger.warning(f"Invalid password for user: {username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Credentials"
                )
            
            logger.info(f"User authenticated successfully: {username}")
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error during user authentication: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication error"
            )
    
    @staticmethod
    async def build_hierarchical_menu(db: AsyncSession, role_id: int, max_depth: int = 4) -> List[Dict[str, Any]]:
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
                    .where(
                        RoleMenuPermission.role_id == role_id,
                        RoleMenuPermission.can_view == True
                    )
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
            for menu, can_view in accessible_menus:
                menu_dict[menu.id] = {
                    "id": menu.id,
                    "name": menu.name,
                    "path": menu.url,
                    "parent_id": menu.parent_id,
                    "display_order": menu.display_order,
                    "level": menu.level,
                    "children": []
                }
            
            # Build hierarchical structure
            root_menus = []
            
            # First, organize menus by parent-child relationship
            for menu_id, menu_data in menu_dict.items():
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
    async def login_user(request: Request, username: str, password: str, client_name: Optional[str] = None) -> Dict[str, Any]:
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
                schema_name = "cos360_main"  # Backward compatibility
                logger.info(f"DEBUG 3: Using default schema: {schema_name}")
            else:
                logger.warning(f"DEBUG 3: Tenant not found or inactive: {final_client_name}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid connection"
                )
        else:
            logger.info(f"DEBUG 3: Found tenant schema: {schema_name}")
        
        # Get tenant database session
        logger.info(f"DEBUG 4: Getting tenant database session")
        async for db in get_tenant_db(request):
            try:
                logger.info(f"DEBUG 5: Starting user authentication")
                # Authenticate user
                user = await MultiTenantAuthService.authenticate_user(db, username, password)
                logger.info(f"DEBUG 6: User authenticated successfully, role_id: {user.role_id}")

                # Build hierarchical menu
                logger.info(f"DEBUG 7: Building hierarchical menu for role_id: {user.role_id}")
                menu = await MultiTenantAuthService.build_hierarchical_menu(db, user.role_id)
                logger.info(f"DEBUG 8: Menu built successfully, menu count: {len(menu)}")
                
                # Create access token and refresh token with client information
                token_data = {
                    "sub": str(user.id),
                    "username": user.username,
                    "role": user.role.name,
                    "client_name": final_client_name
                }
                
                access_token = create_access_token(token_data)
                refresh_token = create_refresh_token(token_data)
                
                # Prepare response
                response_data = {
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_active": user.is_active
                    },
                    "role": {
                        "id": user.role.id,
                        "name": user.role.name,
                        "description": user.role.description
                    },
                    "menu": menu,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer"
                }
                
                logger.info(f"Successful login for user '{username}' on tenant '{final_client_name}'")
                return response_data
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Unexpected error during login: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Login error"
                )
    
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
from sqlalchemy.orm import selectinload
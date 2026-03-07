import logging

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_public_db
from app.models.auth import ResourcePermission, Role, RoleMenuPermission, User
from app.models.public import Menu, MenuAction, Organization, PermissionTemplate, PlanMenuAccess, RoleTemplate

logger = logging.getLogger("multi_tenant_permission_service")


class MultiTenantPermissionService:
    """
    Comprehensive permission service handling three-layer access control:
    1. Plan Level: What menus are available to the tenant
    2. Role Level: What menus/actions the user's role can access
    3. Resource Level: Fine-grained resource:action permissions
    """

    @staticmethod
    async def check_endpoint_permission(
        user_id: str, resource: str, action: str, tenant_db: AsyncSession, tenant_schema: str
    ) -> bool:
        """
        Main permission check method - validates access at all three layers

        Args:
            user_id: User's UUID
            resource: Resource name (e.g., "fee_categories")
            action: Action name (e.g., "create", "update", "delete")
            tenant_db: Tenant database session
            tenant_schema: Tenant schema name

        Returns:
            bool: True if access granted, False otherwise
        """
        try:
            # Get user and role information
            user_query = select(User).where(User.id == user_id)
            result = await tenant_db.execute(user_query)
            user = result.scalar_one_or_none()

            if not user or not user.is_active:
                logger.warning(f"User {user_id} not found or inactive")
                return False

            # Get user's role with relationships
            role_query = select(Role).where(Role.id == user.role_id)
            result = await tenant_db.execute(role_query)
            role = result.scalar_one_or_none()

            if not role:
                logger.warning(f"Role not found for user {user_id}")
                return False

            # Layer 1: Check plan-level access
            plan_access = await MultiTenantPermissionService._check_plan_access(tenant_schema, resource)
            if not plan_access:
                logger.info(f"Plan-level access denied for {tenant_schema}:{resource}")
                return False

            # Layer 2: Check role-level menu access
            menu_access = await MultiTenantPermissionService._check_menu_access(role.id, resource, action, tenant_db)
            if not menu_access:
                logger.info(f"Menu-level access denied for role {role.name}:{resource}")
                return False

            # Layer 3: Check fine-grained resource:action permission
            resource_access = await MultiTenantPermissionService._check_resource_permission(
                role.id, resource, action, tenant_db
            )
            if not resource_access:
                logger.info(f"Resource-level access denied for {role.name}:{resource}:{action}")
                return False

            logger.debug(f"Access granted for user {user_id}: {resource}:{action}")
            return True

        except Exception as e:
            logger.error(f"Error checking permission for user {user_id}: {str(e)}")
            return False

    @staticmethod
    async def _check_plan_access(tenant_schema: str, resource: str) -> bool:
        """
        Check if the tenant's plan allows access to the resource's menu
        """
        try:
            async with get_public_db() as public_db:
                # Get tenant's organization and plan
                org_query = select(Organization).where(Organization.schema_name == tenant_schema)
                result = await public_db.execute(org_query)
                organization = result.scalar_one_or_none()

                if not organization or not organization.plan_id:
                    logger.warning(f"Organization or plan not found for schema {tenant_schema}")
                    return False

                # Find menu associated with the resource
                menu_query = (
                    select(Menu)
                    .join(MenuAction)
                    .where(and_(MenuAction.resource_name == resource, Menu.is_active))
                    .distinct()
                )
                result = await public_db.execute(menu_query)
                menus = result.scalars().all()

                if not menus:
                    logger.info(f"No menu found for resource {resource}")
                    return True  # Allow if no specific menu restriction

                # Check if plan allows access to any of the menus
                for menu in menus:
                    plan_access_query = select(PlanMenuAccess).where(
                        and_(
                            PlanMenuAccess.plan_id == organization.plan_id,
                            PlanMenuAccess.menu_id == menu.id,
                            PlanMenuAccess.is_active,
                        )
                    )
                    result = await public_db.execute(plan_access_query)
                    plan_access = result.scalar_one_or_none()

                    if plan_access:
                        return True

                return False

        except Exception as e:
            logger.error(f"Error checking plan access: {str(e)}")
            return False

    @staticmethod
    async def _check_menu_access(role_id: str, resource: str, action: str, tenant_db: AsyncSession) -> bool:
        """
        Check role-level menu permissions
        """
        try:
            # Get menu associated with the resource (from tenant schema if custom, fallback to inherited)
            menu_query = select(Menu).where(
                and_(Menu.name.ilike(f"%{resource}%"), Menu.is_active)  # Basic resource-to-menu mapping
            )
            result = await tenant_db.execute(menu_query)
            menu = result.scalar_one_or_none()

            if not menu:
                logger.info(f"Menu not found for resource {resource}")
                return True  # Allow if no specific menu restriction

            # Check role menu permissions
            permission_query = select(RoleMenuPermission).where(
                and_(RoleMenuPermission.role_id == role_id, RoleMenuPermission.menu_id == menu.id)
            )
            result = await tenant_db.execute(permission_query)
            permission = result.scalar_one_or_none()

            if not permission:
                return False

            # Check specific permission based on action
            if action in ["list", "read", "view"]:
                return permission.can_view
            elif action in ["create", "update", "delete", "edit"]:
                return permission.can_edit
            else:
                # For other actions, require edit permission
                return permission.can_edit

        except Exception as e:
            logger.error(f"Error checking menu access: {str(e)}")
            return False

    @staticmethod
    async def _check_resource_permission(role_id: str, resource: str, action: str, tenant_db: AsyncSession) -> bool:
        """
        Check fine-grained resource:action permissions
        """
        try:
            permission_query = select(ResourcePermission).where(
                and_(
                    ResourcePermission.role_id == role_id,
                    ResourcePermission.resource == resource,
                    ResourcePermission.action == action,
                )
            )
            result = await tenant_db.execute(permission_query)
            permission = result.scalar_one_or_none()

            # If no specific permission found, check for wildcard permissions
            if not permission:
                # Check for resource:* (all actions on resource)
                wildcard_query = select(ResourcePermission).where(
                    and_(
                        ResourcePermission.role_id == role_id,
                        ResourcePermission.resource == resource,
                        ResourcePermission.action == "*",
                    )
                )
                result = await tenant_db.execute(wildcard_query)
                permission = result.scalar_one_or_none()

            if not permission:
                # Default to allowing if no specific restriction
                return True

            return permission.is_granted

        except Exception as e:
            logger.error(f"Error checking resource permission: {str(e)}")
            return False

    @staticmethod
    async def get_user_permissions(user_id: str, tenant_db: AsyncSession, tenant_schema: str) -> dict[str, list[str]]:
        """
        Get all permissions for a user (for frontend menu building)

        Returns:
            Dict with structure: {
                "menus": ["menu1", "menu2"],
                "resources": ["resource1:action1", "resource2:action2"]
            }
        """
        try:
            # Get user and role
            user_query = select(User).where(User.id == user_id)
            result = await tenant_db.execute(user_query)
            user = result.scalar_one_or_none()

            if not user:
                return {"menus": [], "resources": []}

            # Get role menu permissions
            menu_permissions_query = (
                select(RoleMenuPermission, Menu).join(Menu).where(RoleMenuPermission.role_id == user.role_id)
            )
            result = await tenant_db.execute(menu_permissions_query)
            menu_permissions = result.all()

            allowed_menus = []
            for perm, menu in menu_permissions:
                if perm.can_view:
                    allowed_menus.append(menu.name)

            # Get resource permissions
            resource_permissions_query = select(ResourcePermission).where(ResourcePermission.role_id == user.role_id)
            result = await tenant_db.execute(resource_permissions_query)
            resource_permissions = result.scalars().all()

            allowed_resources = []
            for perm in resource_permissions:
                if perm.is_granted:
                    allowed_resources.append(f"{perm.resource}:{perm.action}")

            return {"menus": allowed_menus, "resources": allowed_resources}

        except Exception as e:
            logger.error(f"Error getting user permissions: {str(e)}")
            return {"menus": [], "resources": []}

    @staticmethod
    async def create_role_from_template(
        template_id: int, role_name: str, role_description: str, tenant_db: AsyncSession
    ) -> str | None:
        """
        Create a new tenant role based on a public role template

        Returns:
            str: New role ID if successful, None otherwise
        """
        try:
            # Get template from public schema
            async with get_public_db() as public_db:
                template_query = select(RoleTemplate).where(RoleTemplate.id == template_id)
                result = await public_db.execute(template_query)
                template = result.scalar_one_or_none()

                if not template:
                    logger.warning(f"Role template {template_id} not found")
                    return None

                # Get template permissions
                permissions_query = select(PermissionTemplate).where(PermissionTemplate.role_template_id == template_id)
                result = await public_db.execute(permissions_query)
                template_permissions = result.scalars().all()

            # Create role in tenant schema
            new_role = Role(name=role_name, description=role_description, is_system_role=False, is_custom_role=False)
            tenant_db.add(new_role)
            await tenant_db.flush()  # Get the ID

            # Create role inheritance record
            from app.models.auth import RoleInheritance

            role_inheritance = RoleInheritance(tenant_role_id=new_role.id, public_role_template_id=template_id)
            tenant_db.add(role_inheritance)

            # Create menu permissions based on template
            for template_perm in template_permissions:
                role_menu_perm = RoleMenuPermission(
                    role_id=new_role.id,
                    menu_id=template_perm.menu_id,
                    can_view=template_perm.can_view,
                    can_edit=template_perm.can_edit,
                )
                tenant_db.add(role_menu_perm)

            await tenant_db.commit()
            logger.info(f"Created role {role_name} from template {template.name}")
            return str(new_role.id)

        except Exception as e:
            await tenant_db.rollback()
            logger.error(f"Error creating role from template: {str(e)}")
            return None

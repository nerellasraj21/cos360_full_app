import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.service.auth.multi_tenant_permission_service import MultiTenantPermissionService
from app.tools.permission_decorators import PermissionDependency, get_current_user_token
from app.models.auth import User, Role, RoleMenuPermission, ResourcePermission
from app.models.public import Plan, Organization, PlanMenuAccess, Menu

class TestMultiTenantPermissionSystem:
    """
    Test the three-layer permission system:
    1. Plan Level (tenant's plan allows the menu)
    2. Menu Level (role has menu access)  
    3. Resource Level (fine-grained resource:action permission)
    """
    
    @pytest.mark.asyncio
    async def test_full_permission_flow_success(self):
        """Test successful permission check through all three layers"""
        
        # Mock database session
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Mock user and role
        mock_user = User(
            id="user-123",
            username="testuser",
            is_active=True,
            role_id="role-456"
        )
        mock_role = Role(
            id="role-456",
            name="Fee Manager"
        )
        
        # Mock database queries
        mock_db.execute.return_value.scalar_one_or_none.side_effect = [
            mock_user,  # User query
            mock_role,  # Role query
            MagicMock(can_view=True, can_edit=True),  # Menu permission query
            MagicMock(is_granted=True)  # Resource permission query
        ]
        
        # Mock plan access check
        with patch.object(MultiTenantPermissionService, '_check_plan_access', return_value=True):
            # Mock menu access check  
            with patch.object(MultiTenantPermissionService, '_check_menu_access', return_value=True):
                # Mock resource access check
                with patch.object(MultiTenantPermissionService, '_check_resource_permission', return_value=True):
                    
                    result = await MultiTenantPermissionService.check_endpoint_permission(
                        user_id="user-123",
                        resource="fee_categories", 
                        action="create",
                        tenant_db=mock_db,
                        tenant_schema="tenant1_schema"
                    )
                    
                    assert result is True
    
    @pytest.mark.asyncio
    async def test_plan_level_access_denied(self):
        """Test permission denied at plan level"""
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Mock user and role
        mock_user = User(
            id="user-123",
            username="testuser", 
            is_active=True,
            role_id="role-456"
        )
        mock_role = Role(
            id="role-456",
            name="Basic User"
        )
        
        mock_db.execute.return_value.scalar_one_or_none.side_effect = [
            mock_user,  # User query
            mock_role   # Role query
        ]
        
        # Mock plan access denial (Basic plan doesn't allow fee management)
        with patch.object(MultiTenantPermissionService, '_check_plan_access', return_value=False):
            
            result = await MultiTenantPermissionService.check_endpoint_permission(
                user_id="user-123",
                resource="fee_categories",
                action="create", 
                tenant_db=mock_db,
                tenant_schema="basic_tenant_schema"
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_menu_level_access_denied(self):
        """Test permission denied at menu level"""
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Mock user and role
        mock_user = User(
            id="user-123",
            username="testuser",
            is_active=True,
            role_id="role-456"
        )
        mock_role = Role(
            id="role-456",
            name="Student"
        )
        
        mock_db.execute.return_value.scalar_one_or_none.side_effect = [
            mock_user,  # User query
            mock_role   # Role query
        ]
        
        # Mock plan access allowed but menu access denied
        with patch.object(MultiTenantPermissionService, '_check_plan_access', return_value=True):
            with patch.object(MultiTenantPermissionService, '_check_menu_access', return_value=False):
                
                result = await MultiTenantPermissionService.check_endpoint_permission(
                    user_id="user-123",
                    resource="fee_categories",
                    action="create",
                    tenant_db=mock_db,
                    tenant_schema="tenant1_schema"
                )
                
                assert result is False
    
    @pytest.mark.asyncio
    async def test_resource_level_access_denied(self):
        """Test permission denied at resource level"""
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Mock user and role
        mock_user = User(
            id="user-123",
            username="testuser",
            is_active=True,
            role_id="role-456"
        )
        mock_role = Role(
            id="role-456",
            name="Fee Viewer"  # Can view but not create
        )
        
        mock_db.execute.return_value.scalar_one_or_none.side_effect = [
            mock_user,  # User query
            mock_role   # Role query
        ]
        
        # Mock plan and menu access allowed but resource access denied
        with patch.object(MultiTenantPermissionService, '_check_plan_access', return_value=True):
            with patch.object(MultiTenantPermissionService, '_check_menu_access', return_value=True):
                with patch.object(MultiTenantPermissionService, '_check_resource_permission', return_value=False):
                    
                    result = await MultiTenantPermissionService.check_endpoint_permission(
                        user_id="user-123",
                        resource="fee_categories",
                        action="create",
                        tenant_db=mock_db,
                        tenant_schema="tenant1_schema"
                    )
                    
                    assert result is False
    
    @pytest.mark.asyncio
    async def test_permission_dependency_success(self):
        """Test FastAPI permission dependency with successful access"""
        
        # Create permission dependency
        permission_dep = PermissionDependency("fee_categories", "read")
        
        # Mock request and token
        mock_request = MagicMock()
        mock_request.state.schema_name = "tenant1_schema"
        
        mock_token = {
            "sub": "user-123",
            "username": "testuser",
            "role": "Fee Manager"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Mock successful permission check
        with patch.object(MultiTenantPermissionService, 'check_endpoint_permission', return_value=True):
            
            result = await permission_dep(mock_request, mock_db, mock_token)
            assert result is True
    
    @pytest.mark.asyncio 
    async def test_permission_dependency_access_denied(self):
        """Test FastAPI permission dependency with access denied"""
        
        # Create permission dependency
        permission_dep = PermissionDependency("fee_categories", "delete")
        
        # Mock request and token
        mock_request = MagicMock()
        mock_request.state.schema_name = "tenant1_schema"
        
        mock_token = {
            "sub": "user-123",
            "username": "testuser", 
            "role": "Student"
        }
        
        mock_db = AsyncMock(spec=AsyncSession)
        
        # Mock permission denied
        with patch.object(MultiTenantPermissionService, 'check_endpoint_permission', return_value=False):
            
            with pytest.raises(HTTPException) as exc_info:
                await permission_dep(mock_request, mock_db, mock_token)
            
            assert exc_info.value.status_code == 403
            assert "fee_categories:delete" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_role_creation_from_template(self):
        """Test creating tenant role from public template"""
        
        mock_tenant_db = AsyncMock(spec=AsyncSession)
        
        # Mock the template creation process
        with patch('app.service.auth.multi_tenant_permission_service.get_public_db') as mock_public_db:
            mock_public_session = AsyncMock()
            mock_public_db.return_value.__aenter__.return_value = mock_public_session
            
            # Mock role template
            mock_template = MagicMock()
            mock_template.id = 1
            mock_template.name = "Teacher"
            mock_public_session.execute.return_value.scalar_one_or_none.return_value = mock_template
            
            # Mock template permissions
            mock_permissions = [
                MagicMock(menu_id=1, can_view=True, can_edit=True),
                MagicMock(menu_id=2, can_view=True, can_edit=False)
            ]
            mock_public_session.execute.return_value.scalars.return_value.all.return_value = mock_permissions
            
            result = await MultiTenantPermissionService.create_role_from_template(
                template_id=1,
                role_name="Custom Teacher", 
                role_description="Teacher role for this tenant",
                tenant_db=mock_tenant_db
            )
            
            # Should return a role ID
            assert result is not None
            assert isinstance(result, str)
            
            # Should have added role and permissions to tenant DB
            assert mock_tenant_db.add.called
            assert mock_tenant_db.commit.called

class TestPermissionScenarios:
    """Test real-world permission scenarios"""
    
    @pytest.mark.asyncio
    async def test_admin_has_all_permissions(self):
        """Admin user should have access to all resources"""
        # Implementation would test admin role with wildcard permissions
        pass
    
    @pytest.mark.asyncio
    async def test_teacher_limited_permissions(self):
        """Teacher should have limited permissions based on plan and role"""
        # Implementation would test teacher role permissions
        pass
    
    @pytest.mark.asyncio  
    async def test_student_read_only_permissions(self):
        """Student should have read-only access to allowed resources"""
        # Implementation would test student role permissions
        pass
    
    @pytest.mark.asyncio
    async def test_plan_upgrade_adds_permissions(self):
        """Upgrading plan should add new menu/resource access"""
        # Implementation would test plan upgrade scenarios
        pass
    
    @pytest.mark.asyncio
    async def test_custom_tenant_role_extensions(self):
        """Tenant-specific custom roles should work correctly"""
        # Implementation would test tenant role extensions
        pass

# Example usage in integration tests
class TestEndpointProtection:
    """Integration tests for protected endpoints"""
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_with_valid_permissions(self):
        """Test that protected endpoint allows access with valid permissions"""
        # Would use TestClient to test actual endpoint with mocked permissions
        pass
    
    @pytest.mark.asyncio
    async def test_protected_endpoint_denies_insufficient_permissions(self):
        """Test that protected endpoint denies access without permissions"""
        # Would test 403 responses from protected endpoints
        pass
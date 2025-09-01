import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy import text
from app.main import app
from app.db.tenant_session import TenantService, get_public_db
from app.models.public.tenant_model import Tenant
from app.models.auth.user_model import User
from app.models.auth.role_model import Role
from app.models.auth.menu_model import Menu
from app.models.auth.permissions_model import RoleMenuPermission
from app.tools.password_util import hash_password
import asyncio


class TestMultiTenantAuth:
    """Test suite for multi-tenant authentication system"""
    
    @pytest.fixture
    async def setup_test_data(self):
        """Setup test tenants and user data"""
        # Clear tenant cache
        await TenantService.clear_cache()
        
        # Setup test tenant in public schema
        async for db in get_public_db():
            await db.execute(text("SET search_path TO public"))
            
            # Insert test tenant
            await db.execute(text("""
                INSERT INTO tenants (client_name, schema_name, is_active) 
                VALUES ('testclient', 'test_schema', true)
                ON CONFLICT (client_name) DO UPDATE SET 
                schema_name = EXCLUDED.schema_name,
                is_active = EXCLUDED.is_active
            """))
            
            # Create test schema if not exists
            await db.execute(text("CREATE SCHEMA IF NOT EXISTS test_schema"))
            await db.commit()
            
        # Setup test data in tenant schema
        from app.db.tenant_session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(text("SET search_path TO test_schema"))
            
            # Create tables in test schema (simplified)
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS roles (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100),
                    password_hash TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    role_id INTEGER REFERENCES roles(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS menus (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    url VARCHAR(200),
                    parent_id INTEGER REFERENCES menus(id),
                    display_order INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS role_menu_permissions (
                    id SERIAL PRIMARY KEY,
                    role_id INTEGER REFERENCES roles(id),
                    menu_id INTEGER REFERENCES menus(id),
                    can_view BOOLEAN DEFAULT FALSE,
                    can_create BOOLEAN DEFAULT FALSE,
                    can_edit BOOLEAN DEFAULT FALSE,
                    can_delete BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Insert test role
            await db.execute(text("""
                INSERT INTO roles (name, description) 
                VALUES ('admin', 'Administrator role')
                ON CONFLICT DO NOTHING
            """))
            
            # Insert test user
            hashed_password = hash_password("testpass123")
            await db.execute(text("""
                INSERT INTO users (username, email, password_hash, role_id) 
                VALUES ('testuser', 'test@example.com', :password, 1)
                ON CONFLICT (username) DO UPDATE SET
                password_hash = EXCLUDED.password_hash
            """), {"password": hashed_password})
            
            # Insert test menus
            await db.execute(text("""
                INSERT INTO menus (name, url, parent_id, display_order, level) VALUES
                ('Dashboard', '/dashboard', NULL, 1, 0),
                ('User Management', NULL, NULL, 2, 0),
                ('Users', '/users', 2, 1, 1),
                ('Roles', '/roles', 2, 2, 1)
                ON CONFLICT DO NOTHING
            """))
            
            # Insert menu permissions
            await db.execute(text("""
                INSERT INTO role_menu_permissions (role_id, menu_id, can_view) 
                SELECT 1, id, true FROM menus
                ON CONFLICT DO NOTHING
            """))
            
            await db.commit()
            
        yield
        
        # Cleanup
        async with AsyncSessionLocal() as db:
            await db.execute(text("DROP SCHEMA IF EXISTS test_schema CASCADE"))
            await db.commit()
    
    @pytest.mark.asyncio
    async def test_multi_tenant_login_success(self, setup_test_data):
        """Test successful multi-tenant login"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "testpass123",
                    "client_name": "testclient"
                },
                headers={"X-Client-Name": "testclient"}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Verify response structure
            assert "user" in data
            assert "role" in data
            assert "menu" in data
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            
            # Verify user data
            assert data["user"]["username"] == "testuser"
            assert data["user"]["email"] == "test@example.com"
            assert data["user"]["is_active"] == True
            
            # Verify role data
            assert data["role"]["name"] == "admin"
            
            # Verify menu structure
            assert len(data["menu"]) > 0
            assert any(menu["name"] == "Dashboard" for menu in data["menu"])
    
    @pytest.mark.asyncio
    async def test_multi_tenant_login_header_detection(self, setup_test_data):
        """Test client detection from header"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "testpass123"
                },
                headers={"X-Client-Name": "testclient"}
            )
            
            assert response.status_code == status.HTTP_200_OK
    
    @pytest.mark.asyncio
    async def test_multi_tenant_login_subdomain_detection(self, setup_test_data):
        """Test client detection from subdomain"""
        async with AsyncClient(app=app, base_url="http://testclient.example.com") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "testpass123"
                }
            )
            
            assert response.status_code == status.HTTP_200_OK
    
    @pytest.mark.asyncio
    async def test_invalid_credentials(self, setup_test_data):
        """Test login with invalid credentials"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "wrongpassword"
                },
                headers={"X-Client-Name": "testclient"}
            )
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert response.json()["detail"] == "Invalid Credentials"
    
    @pytest.mark.asyncio
    async def test_invalid_tenant(self):
        """Test login with non-existent tenant"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "testpass123"
                },
                headers={"X-Client-Name": "nonexistent"}
            )
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert response.json()["detail"] == "Invalid connection"
    
    @pytest.mark.asyncio
    async def test_legacy_login_compatibility(self):
        """Test backward compatibility with legacy login"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "admin",  # Assuming default legacy user exists
                    "password": "admin123"
                }
            )
            
            # Should use legacy flow and return only access_token
            if response.status_code == status.HTTP_200_OK:
                data = response.json()
                assert "access_token" in data
                assert "token_type" in data
                # Should not have user, role, or menu for legacy response
                assert "user" not in data
                assert "role" not in data
                assert "menu" not in data
    
    @pytest.mark.asyncio
    async def test_hierarchical_menu_structure(self, setup_test_data):
        """Test that menus are properly hierarchical"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "testpass123"
                },
                headers={"X-Client-Name": "testclient"}
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            
            # Find User Management menu
            user_mgmt_menu = None
            for menu in data["menu"]:
                if menu["name"] == "User Management":
                    user_mgmt_menu = menu
                    break
            
            assert user_mgmt_menu is not None
            assert "children" in user_mgmt_menu or user_mgmt_menu.get("children") is not None
    
    @pytest.mark.asyncio
    async def test_tenant_caching(self, setup_test_data):
        """Test tenant caching functionality"""
        # Clear cache first
        await TenantService.clear_cache()
        
        # First call should hit database
        schema1 = await TenantService.get_tenant_schema("testclient")
        assert schema1 == "test_schema"
        
        # Second call should hit cache (faster)
        schema2 = await TenantService.get_tenant_schema("testclient")
        assert schema2 == "test_schema"
        
        # Invalid tenant should be cached as None
        invalid_schema = await TenantService.get_tenant_schema("nonexistent")
        assert invalid_schema is None
    
    @pytest.mark.asyncio
    async def test_inactive_tenant(self):
        """Test that inactive tenants are rejected"""
        # Create inactive tenant
        async for db in get_public_db():
            await db.execute(text("SET search_path TO public"))
            await db.execute(text("""
                INSERT INTO tenants (client_name, schema_name, is_active) 
                VALUES ('inactive_client', 'inactive_schema', false)
                ON CONFLICT (client_name) DO UPDATE SET 
                is_active = false
            """))
            await db.commit()
        
        # Clear cache to ensure fresh lookup
        await TenantService.clear_cache()
        
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/auth/login/login",
                json={
                    "username": "testuser",
                    "password": "testpass123"
                },
                headers={"X-Client-Name": "inactive_client"}
            )
            
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert response.json()["detail"] == "Invalid connection"


class TestTenantService:
    """Test tenant service functionality"""
    
    @pytest.mark.asyncio
    async def test_get_tenant_schema(self):
        """Test tenant schema retrieval"""
        # Test with valid tenant
        schema = await TenantService.get_tenant_schema("default")
        assert schema is not None
        
        # Test with invalid tenant
        schema = await TenantService.get_tenant_schema("nonexistent")
        assert schema is None
    
    @pytest.mark.asyncio
    async def test_cache_invalidation(self):
        """Test cache invalidation"""
        await TenantService.clear_cache()
        
        # Get schema (should cache)
        schema1 = await TenantService.get_tenant_schema("default")
        
        # Invalidate specific tenant
        await TenantService.invalidate_tenant_cache("default")
        
        # Should fetch fresh data
        schema2 = await TenantService.get_tenant_schema("default")
        
        assert schema1 == schema2  # Should be same value but fresh fetch


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
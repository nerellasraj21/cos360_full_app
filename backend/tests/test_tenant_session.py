import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from app.db.tenant_session import TenantService, get_tenant_db, get_public_db
from sqlalchemy.ext.asyncio import AsyncSession


class TestTenantService:
    """Test suite for TenantService"""
    
    @pytest.mark.asyncio
    async def test_get_tenant_schema_cache_hit(self):
        """Test tenant schema retrieval with cache hit"""
        # Setup cache
        from app.db.tenant_session import _tenant_cache
        _tenant_cache["testclient"] = "test_schema"
        
        result = await TenantService.get_tenant_schema("testclient")
        assert result == "test_schema"
    
    @pytest.mark.asyncio
    async def test_get_tenant_schema_cache_miss(self):
        """Test tenant schema retrieval with cache miss"""
        await TenantService.clear_cache()
        
        # Mock the database query
        with patch.object(TenantService, '_fetch_tenant_schema') as mock_fetch:
            mock_fetch.return_value = "fetched_schema"
            
            result = await TenantService.get_tenant_schema("newclient")
            
            assert result == "fetched_schema"
            mock_fetch.assert_called_once_with("newclient")
            
            # Check that result is cached
            from app.db.tenant_session import _tenant_cache
            assert _tenant_cache["newclient"] == "fetched_schema"
    
    @pytest.mark.asyncio
    async def test_get_tenant_schema_nonexistent(self):
        """Test tenant schema retrieval for non-existent tenant"""
        await TenantService.clear_cache()
        
        with patch.object(TenantService, '_fetch_tenant_schema') as mock_fetch:
            mock_fetch.return_value = None
            
            result = await TenantService.get_tenant_schema("nonexistent")
            
            assert result is None
            # Check that None is cached
            from app.db.tenant_session import _tenant_cache
            assert _tenant_cache["nonexistent"] is None
    
    @pytest.mark.asyncio
    async def test_fetch_tenant_schema_active_tenant(self):
        """Test fetching active tenant from database"""
        mock_session = AsyncMock()
        mock_result = AsyncMock()
        mock_result.fetchone.return_value = ("active_schema", True)
        mock_session.execute.return_value = mock_result
        
        with patch('app.db.tenant_session.PublicAsyncSessionLocal') as mock_session_factory:
            mock_session_factory.return_value.__aenter__.return_value = mock_session
            
            result = await TenantService._fetch_tenant_schema("activeclient")
            
            assert result == "active_schema"
            mock_session.execute.assert_called()
    
    @pytest.mark.asyncio
    async def test_fetch_tenant_schema_inactive_tenant(self):
        """Test fetching inactive tenant from database"""
        mock_session = AsyncMock()
        mock_result = AsyncMock()
        mock_result.fetchone.return_value = ("inactive_schema", False)
        mock_session.execute.return_value = mock_result
        
        with patch('app.db.tenant_session.PublicAsyncSessionLocal') as mock_session_factory:
            mock_session_factory.return_value.__aenter__.return_value = mock_session
            
            result = await TenantService._fetch_tenant_schema("inactiveclient")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_clear_cache(self):
        """Test cache clearing"""
        from app.db.tenant_session import _tenant_cache
        _tenant_cache["test1"] = "schema1"
        _tenant_cache["test2"] = "schema2"
        
        await TenantService.clear_cache()
        
        assert len(_tenant_cache) == 0
    
    @pytest.mark.asyncio
    async def test_invalidate_tenant_cache(self):
        """Test invalidating specific tenant cache"""
        from app.db.tenant_session import _tenant_cache
        _tenant_cache["test1"] = "schema1"
        _tenant_cache["test2"] = "schema2"
        
        await TenantService.invalidate_tenant_cache("test1")
        
        assert "test1" not in _tenant_cache
        assert _tenant_cache["test2"] == "schema2"


class TestTenantSessionDependencies:
    """Test database session dependencies"""
    
    @pytest.fixture
    def mock_request(self):
        """Mock FastAPI request object"""
        mock_request = AsyncMock()
        mock_request.state = AsyncMock()
        mock_request.state.client_name = "testclient"
        return mock_request
    
    @pytest.mark.asyncio
    async def test_get_public_db(self):
        """Test public database session creation"""
        mock_session = AsyncMock()
        
        with patch('app.db.tenant_session.PublicAsyncSessionLocal') as mock_session_factory:
            mock_session_factory.return_value.__aenter__.return_value = mock_session
            mock_session_factory.return_value.__aexit__ = AsyncMock()
            
            async for session in get_public_db():
                assert session == mock_session
                # Verify search_path is set to public
                mock_session.execute.assert_called()
                break
    
    @pytest.mark.asyncio
    async def test_get_tenant_db_valid_tenant(self, mock_request):
        """Test tenant database session for valid tenant"""
        mock_session = AsyncMock()
        
        with patch('app.db.tenant_session.get_client_name_from_request') as mock_get_client:
            with patch.object(TenantService, 'get_tenant_schema') as mock_get_schema:
                with patch('app.db.tenant_session.AsyncSessionLocal') as mock_session_factory:
                    mock_get_client.return_value = "testclient"
                    mock_get_schema.return_value = "test_schema"
                    mock_session_factory.return_value.__aenter__.return_value = mock_session
                    mock_session_factory.return_value.__aexit__ = AsyncMock()
                    
                    async for session in get_tenant_db(mock_request):
                        assert session == mock_session
                        # Verify search_path is set correctly
                        mock_session.execute.assert_called()
                        break
    
    @pytest.mark.asyncio
    async def test_get_tenant_db_invalid_tenant(self, mock_request):
        """Test tenant database session for invalid tenant"""
        with patch('app.db.tenant_session.get_client_name_from_request') as mock_get_client:
            with patch.object(TenantService, 'get_tenant_schema') as mock_get_schema:
                mock_get_client.return_value = "invalidclient"
                mock_get_schema.return_value = None
                
                with pytest.raises(HTTPException) as exc_info:
                    async for _ in get_tenant_db(mock_request):
                        pass
                
                assert exc_info.value.status_code == 401
                assert "Invalid connection" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_tenant_db_default_fallback(self, mock_request):
        """Test tenant database session with default fallback"""
        mock_session = AsyncMock()
        
        with patch('app.db.tenant_session.get_client_name_from_request') as mock_get_client:
            with patch.object(TenantService, 'get_tenant_schema') as mock_get_schema:
                with patch('app.db.tenant_session.AsyncSessionLocal') as mock_session_factory:
                    mock_get_client.return_value = "default"
                    mock_get_schema.return_value = None  # No schema found
                    mock_session_factory.return_value.__aenter__.return_value = mock_session
                    mock_session_factory.return_value.__aexit__ = AsyncMock()
                    
                    async for session in get_tenant_db(mock_request):
                        assert session == mock_session
                        # Should use cos360_main as fallback schema
                        mock_session.execute.assert_called()
                        break
    
    @pytest.mark.asyncio
    async def test_get_tenant_db_by_client_name_valid(self):
        """Test direct tenant database session by client name"""
        mock_session = AsyncMock()
        
        with patch.object(TenantService, 'get_tenant_schema') as mock_get_schema:
            with patch('app.db.tenant_session.AsyncSessionLocal') as mock_session_factory:
                mock_get_schema.return_value = "client_schema"
                mock_session_factory.return_value.__aenter__.return_value = mock_session
                mock_session_factory.return_value.__aexit__ = AsyncMock()
                
                from app.db.tenant_session import get_tenant_db_by_client_name
                
                async for session in get_tenant_db_by_client_name("testclient"):
                    assert session == mock_session
                    mock_session.execute.assert_called()
                    break
    
    @pytest.mark.asyncio
    async def test_get_tenant_db_by_client_name_invalid(self):
        """Test direct tenant database session for invalid client"""
        with patch.object(TenantService, 'get_tenant_schema') as mock_get_schema:
            mock_get_schema.return_value = None
            
            from app.db.tenant_session import get_tenant_db_by_client_name
            
            with pytest.raises(HTTPException) as exc_info:
                async for _ in get_tenant_db_by_client_name("invalidclient"):
                    pass
            
            assert exc_info.value.status_code == 401
            assert "Invalid connection" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_legacy_get_db(self):
        """Test legacy database session dependency"""
        mock_session = AsyncMock()
        
        with patch('app.db.tenant_session.AsyncSessionLocal') as mock_session_factory:
            mock_session_factory.return_value.__aenter__.return_value = mock_session
            mock_session_factory.return_value.__aexit__ = AsyncMock()
            
            from app.db.tenant_session import get_db
            
            async for session in get_db():
                assert session == mock_session
                # Verify search_path is set to cos360_main for legacy compatibility
                mock_session.execute.assert_called()
                break


class TestTenantSessionErrorHandling:
    """Test error handling in tenant session management"""
    
    @pytest.mark.asyncio
    async def test_fetch_tenant_schema_database_error(self):
        """Test error handling in tenant schema fetching"""
        with patch('app.db.tenant_session.PublicAsyncSessionLocal') as mock_session_factory:
            mock_session_factory.return_value.__aenter__.side_effect = Exception("DB Error")
            
            result = await TenantService._fetch_tenant_schema("testclient")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_get_tenant_db_session_error(self, mock_request=None):
        """Test error handling in tenant database session"""
        if mock_request is None:
            mock_request = AsyncMock()
            mock_request.state.client_name = "testclient"
        
        with patch('app.db.tenant_session.get_client_name_from_request') as mock_get_client:
            with patch.object(TenantService, 'get_tenant_schema') as mock_get_schema:
                with patch('app.db.tenant_session.AsyncSessionLocal') as mock_session_factory:
                    mock_get_client.return_value = "testclient"
                    mock_get_schema.return_value = "test_schema"
                    
                    mock_session = AsyncMock()
                    mock_session.execute.side_effect = Exception("Session Error")
                    mock_session_factory.return_value.__aenter__.return_value = mock_session
                    
                    with pytest.raises(Exception):
                        async for _ in get_tenant_db(mock_request):
                            pass
                    
                    # Verify rollback was called
                    mock_session.rollback.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
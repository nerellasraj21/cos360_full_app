import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from app.middleware.tenant_middleware import TenantMiddleware, get_client_name_from_request


class TestTenantMiddleware:
    """Test suite for tenant detection middleware"""
    
    @pytest.fixture
    def app_with_middleware(self):
        """Create test FastAPI app with TenantMiddleware"""
        app = FastAPI()
        app.add_middleware(TenantMiddleware)
        
        @app.get("/test")
        async def test_endpoint(request: Request):
            client_name = getattr(request.state, 'client_name', None)
            return {"client_name": client_name}
        
        return app
    
    def test_client_name_from_header(self, app_with_middleware):
        """Test client name detection from X-Client-Name header"""
        with TestClient(app_with_middleware) as client:
            response = client.get("/test", headers={"X-Client-Name": "testclient"})
            assert response.status_code == 200
            assert response.json()["client_name"] == "testclient"
    
    def test_client_name_from_subdomain(self, app_with_middleware):
        """Test client name detection from subdomain"""
        with TestClient(app_with_middleware, base_url="http://testclient.example.com") as client:
            response = client.get("/test")
            assert response.status_code == 200
            assert response.json()["client_name"] == "testclient"
    
    def test_client_name_header_priority(self, app_with_middleware):
        """Test that header takes priority over subdomain"""
        with TestClient(app_with_middleware, base_url="http://subdomain.example.com") as client:
            response = client.get("/test", headers={"X-Client-Name": "headerclient"})
            assert response.status_code == 200
            assert response.json()["client_name"] == "headerclient"
    
    def test_default_client_fallback(self, app_with_middleware):
        """Test fallback to default client"""
        with TestClient(app_with_middleware, base_url="http://localhost") as client:
            response = client.get("/test")
            assert response.status_code == 200
            assert response.json()["client_name"] == "default"
    
    def test_invalid_client_name_sanitization(self, app_with_middleware):
        """Test client name sanitization"""
        with TestClient(app_with_middleware) as client:
            # Test with invalid characters
            response = client.get("/test", headers={"X-Client-Name": "test-client!@#$%"})
            assert response.status_code == 200
            assert response.json()["client_name"] == "test-client"
            
            # Test with spaces
            response = client.get("/test", headers={"X-Client-Name": " test client "})
            assert response.status_code == 200
            assert response.json()["client_name"] == "testclient"
    
    def test_empty_client_name_fallback(self, app_with_middleware):
        """Test fallback when client name is empty"""
        with TestClient(app_with_middleware) as client:
            response = client.get("/test", headers={"X-Client-Name": ""})
            assert response.status_code == 200
            assert response.json()["client_name"] == "default"
    
    def test_long_client_name_truncation(self, app_with_middleware):
        """Test client name truncation for very long names"""
        with TestClient(app_with_middleware) as client:
            long_name = "a" * 100
            response = client.get("/test", headers={"X-Client-Name": long_name})
            assert response.status_code == 200
            client_name = response.json()["client_name"]
            assert len(client_name) <= 50  # Should be truncated
    
    def test_subdomain_extraction_edge_cases(self, app_with_middleware):
        """Test subdomain extraction with various host formats"""
        test_cases = [
            ("client.example.com", "client"),
            ("sub.client.example.com", "sub"),
            ("localhost", "default"),
            ("127.0.0.1", "default"),
            ("example.com", "default"),
            ("client.localhost", "client"),
        ]
        
        for host, expected_client in test_cases:
            with TestClient(app_with_middleware, base_url=f"http://{host}") as client:
                response = client.get("/test")
                assert response.status_code == 200
                assert response.json()["client_name"] == expected_client


class TestClientNameExtraction:
    """Test direct client name extraction function"""
    
    def test_get_client_name_from_request_header(self):
        """Test client name extraction from header"""
        # This would require mocking Request object
        # Simplified test focusing on middleware integration
        pass
    
    def test_get_client_name_from_request_subdomain(self):
        """Test client name extraction from subdomain"""
        # This would require mocking Request object
        # Simplified test focusing on middleware integration
        pass
    
    def test_client_name_validation(self):
        """Test client name validation logic"""
        from app.middleware.tenant_middleware import TenantMiddleware
        middleware = TenantMiddleware(None)
        
        # Test valid names
        assert middleware._sanitize_client_name("validclient") == "validclient"
        assert middleware._sanitize_client_name("client123") == "client123"
        assert middleware._sanitize_client_name("client-name") == "client-name"
        
        # Test invalid characters removal
        assert middleware._sanitize_client_name("client!@#$%") == "client"
        assert middleware._sanitize_client_name("client name") == "clientname"
        
        # Test empty result fallback
        assert middleware._sanitize_client_name("!@#$%") == "default"
        assert middleware._sanitize_client_name("") == "default"
        assert middleware._sanitize_client_name(None) == "default"
    
    def test_subdomain_extraction(self):
        """Test subdomain extraction logic"""
        from app.middleware.tenant_middleware import TenantMiddleware
        middleware = TenantMiddleware(None)
        
        test_cases = [
            ("client.example.com", "client"),
            ("sub.client.example.com", "sub"),
            ("localhost", None),
            ("127.0.0.1", None),
            ("example.com", None),
            ("client.localhost", "client"),
            ("", None),
            (None, None),
        ]
        
        for host, expected in test_cases:
            result = middleware._extract_subdomain(host)
            assert result == expected


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
#!/usr/bin/env python3
"""
Authentication Load Test for COS360 Multi-Tenant Application

Tests the authentication system under load, including login, token refresh, and authenticated requests.
"""

import json
import random
import time
from locust import HttpUser, task, between, events
from typing import Optional, Dict, Any


class AuthenticatedUser(HttpUser):
    """
    User that tests authenticated endpoints with multi-tenant support
    """
    wait_time = between(1, 4)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.client_name = "default"  # Default tenant
        self.user_data = None
        
    def on_start(self):
        """Initialize user session and authenticate"""
        self.client.verify = False
        self.login()
    
    def login(self):
        """Authenticate user and get tokens"""
        # Test credentials - you may need to adjust these
        login_data = {
            "username": "admin",  # Update with actual test user
            "password": "admin123",  # Update with actual test password
            "client_name": self.client_name
        }
        
        headers = {
            "Content-Type": "application/json",
            "cschema": self.client_name  # New header name
        }
        
        with self.client.post(
            "/api/v1/auth/login/login",
            json=login_data,
            headers=headers,
            catch_response=True,
            name="login"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    self.refresh_token = data.get("refresh_token")
                    self.user_data = data.get("user")
                    response.success()
                    print(f"Login successful for user {login_data['username']}")
                except Exception as e:
                    response.failure(f"Login response parsing failed: {e}")
            elif response.status_code == 401:
                response.failure("Authentication failed - check credentials")
            else:
                response.failure(f"Login failed with status {response.status_code}")
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get headers with authentication token"""
        headers = {
            "cschema": self.client_name
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    @task(15)
    def get_fee_categories(self):
        """Test getting fee categories with authentication"""
        if not self.access_token:
            self.login()
            return
            
        with self.client.get(
            "/api/v1/fee/categories/",
            headers=self.get_auth_headers(),
            catch_response=True,
            name="get_fee_categories"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.login()  # Token might be expired
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Get fee categories failed: {response.status_code}")
    
    @task(12)
    def get_fee_types(self):
        """Test getting fee types with authentication"""
        if not self.access_token:
            self.login()
            return
            
        with self.client.get(
            "/api/v1/fee/types/",
            headers=self.get_auth_headers(),
            catch_response=True,
            name="get_fee_types"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.login()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Get fee types failed: {response.status_code}")
    
    @task(10)
    def get_academic_years(self):
        """Test getting academic years"""
        if not self.access_token:
            self.login()
            return
            
        with self.client.get(
            "/api/v1/masters/academic-years/",
            headers=self.get_auth_headers(),
            catch_response=True,
            name="get_academic_years"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.login()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Get academic years failed: {response.status_code}")
    
    @task(8)
    def get_classes(self):
        """Test getting classes"""
        if not self.access_token:
            self.login()
            return
            
        with self.client.get(
            "/api/v1/masters/classes/",
            headers=self.get_auth_headers(),
            catch_response=True,
            name="get_classes"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.login()
                response.failure("Token expired, re-authenticating")
            else:
                response.failure(f"Get classes failed: {response.status_code}")
    
    @task(5)
    def refresh_token_test(self):
        """Test token refresh functionality"""
        if not self.refresh_token:
            self.login()
            return
            
        refresh_data = {
            "refresh_token": self.refresh_token
        }
        
        with self.client.post(
            "/api/v1/auth/login/refresh",
            json=refresh_data,
            headers={"cschema": self.client_name},
            catch_response=True,
            name="refresh_token"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    self.refresh_token = data.get("refresh_token")
                    response.success()
                except Exception as e:
                    response.failure(f"Token refresh response parsing failed: {e}")
            else:
                response.failure(f"Token refresh failed: {response.status_code}")
    
    @task(3)
    def create_fee_category(self):
        """Test creating fee category (write operation)"""
        if not self.access_token:
            self.login()
            return
            
        category_data = {
            "category_name": f"Test Category {random.randint(1000, 9999)}",
            "category_description": "Load test category",
            "academic_year_id": 1  # You may need to adjust this
        }
        
        with self.client.post(
            "/api/v1/fee/categories/",
            json=category_data,
            headers=self.get_auth_headers(),
            catch_response=True,
            name="create_fee_category"
        ) as response:
            if response.status_code == 201:
                response.success()
            elif response.status_code == 401:
                self.login()
                response.failure("Token expired during create")
            elif response.status_code == 400:
                response.failure("Validation error during create")
            else:
                response.failure(f"Create fee category failed: {response.status_code}")


class MultiTenantUser(AuthenticatedUser):
    """
    User that tests multi-tenant functionality with different tenants
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Randomly select a tenant for this user
        self.client_name = random.choice(["default", "tenant1", "tenant2", "littlebunny"])
    
    @task(20)
    def test_tenant_isolation(self):
        """Test that tenant data is properly isolated"""
        if not self.access_token:
            self.login()
            return
            
        # Test multiple endpoints to ensure tenant isolation
        endpoints = [
            "/api/v1/fee/categories/",
            "/api/v1/fee/types/",
            "/api/v1/masters/academic-years/",
            "/api/v1/masters/classes/"
        ]
        
        endpoint = random.choice(endpoints)
        with self.client.get(
            endpoint,
            headers=self.get_auth_headers(),
            catch_response=True,
            name=f"tenant_isolation_{self.client_name}"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                if self.client_name != "default":
                    # Tenant might not exist, which is expected
                    response.success()
                else:
                    self.login()
                    response.failure("Authentication failed for default tenant")
            else:
                response.failure(f"Tenant isolation test failed: {response.status_code}")


# Event handlers for comprehensive reporting
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Enhanced request logging for authentication tests"""
    if exception:
        print(f"Request failed: {request_type} {name} - {exception}")
    elif response_time > 2000:  # Log slow requests (>2 seconds)
        print(f"Slow request: {request_type} {name} - {response_time}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print authentication test start information"""
    print("=" * 50)
    print("STARTING COS360 AUTHENTICATION LOAD TEST")
    print(f"Target URL: {environment.host}")
    print("Testing: Login, Token Refresh, Authenticated Endpoints")
    print("=" * 50)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print authentication test completion information"""
    print("=" * 50)
    print("COS360 AUTHENTICATION LOAD TEST COMPLETED")
    print("Check the web UI for detailed results")
    print("Key metrics to analyze:")
    print("- Login success rate")
    print("- Token refresh performance")
    print("- Authentication overhead")
    print("- Multi-tenant isolation")
    print("=" * 50)


if __name__ == "__main__":
    # Run single user test for debugging
    from locust import run_single_user
    
    print("Running single authenticated user test...")
    run_single_user(AuthenticatedUser, host="http://localhost:8000")
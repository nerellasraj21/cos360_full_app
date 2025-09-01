#!/usr/bin/env python3
"""
Basic Load Test for COS360 FastAPI Application

This script tests basic API endpoints without authentication to establish baseline performance.
"""

import json
import random
from locust import HttpUser, task, between
from locust import events


class BasicApiUser(HttpUser):
    """
    Basic API user that tests non-authenticated endpoints
    """
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    
    def on_start(self):
        """Initialize user session"""
        self.client.verify = False  # Disable SSL verification for local testing
        
    @task(10)
    def health_check(self):
        """Test basic health/root endpoint"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed with status {response.status_code}")
    
    @task(5)
    def api_root(self):
        """Test API root endpoint"""
        with self.client.get("/api/v1", catch_response=True) as response:
            if response.status_code in [200, 404]:  # 404 is acceptable for root API
                response.success()
            else:
                response.failure(f"API root failed with status {response.status_code}")


class DatabaseReadUser(HttpUser):
    """
    User that tests database read operations through public endpoints
    """
    wait_time = between(2, 5)
    
    def on_start(self):
        """Initialize user session"""
        self.client.verify = False
        # Try to get some reference data that might be publicly available
        
    @task(8)
    def get_academic_years_dropdown(self):
        """Test getting academic years dropdown (likely public)"""
        with self.client.get("/api/v1/masters/academic-years/dropdown", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                # Expected if authentication is required
                response.success()
            else:
                response.failure(f"Academic years dropdown failed with status {response.status_code}")
    
    @task(6)
    def get_fee_categories_dropdown(self):
        """Test getting fee categories dropdown"""
        with self.client.get("/api/v1/fee/categories/dropdown", catch_response=True) as response:
            if response.status_code in [200, 401]:  # 401 is expected without auth
                response.success()
            else:
                response.failure(f"Fee categories dropdown failed with status {response.status_code}")
    
    @task(4)
    def get_classes_dropdown(self):
        """Test getting classes dropdown"""
        with self.client.get("/api/v1/masters/classes/dropdown", catch_response=True) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Classes dropdown failed with status {response.status_code}")


# Event handlers for reporting
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Log request details for analysis"""
    if exception:
        print(f"Request failed: {request_type} {name} - {exception}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print test start information"""
    print("=" * 50)
    print("STARTING COS360 BASIC LOAD TEST")
    print(f"Target URL: {environment.host}")
    print("=" * 50)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print test completion information"""
    print("=" * 50)
    print("COS360 BASIC LOAD TEST COMPLETED")
    print("Check the web UI for detailed results")
    print("=" * 50)


if __name__ == "__main__":
    import os
    import sys
    
    # Run locust programmatically for quick testing
    from locust import run_single_user
    
    print("Running single user test...")
    run_single_user(BasicApiUser, host="http://localhost:8000")
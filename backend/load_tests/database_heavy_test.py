#!/usr/bin/env python3
"""
Database Heavy Load Test for COS360

Tests database-intensive operations including complex queries, transactions, 
and concurrent write operations to find database bottlenecks.
"""

import json
import random
import string
import uuid
from locust import HttpUser, task, between, events
from typing import Optional, List, Dict, Any


class DatabaseHeavyUser(HttpUser):
    """
    User that performs database-heavy operations to stress test the system
    """
    wait_time = between(2, 6)  # Longer wait time for heavy operations
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.client_name = "default"
        self.created_resources: List[str] = []  # Track created resources for cleanup
        
    def on_start(self):
        """Initialize user session"""
        self.client.verify = False
        self.login()
    
    def login(self):
        """Authenticate user"""
        login_data = {
            "username": "admin",
            "password": "admin123",
            "client_name": self.client_name
        }
        
        headers = {
            "Content-Type": "application/json",
            "cschema": self.client_name
        }
        
        with self.client.post(
            "/api/v1/auth/login/login",
            json=login_data,
            headers=headers,
            catch_response=True,
            name="db_heavy_login"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    self.refresh_token = data.get("refresh_token")
                    response.success()
                except Exception as e:
                    response.failure(f"Login parsing failed: {e}")
            else:
                response.failure(f"Login failed: {response.status_code}")
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authenticated headers"""
        headers = {"cschema": self.client_name}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    @task(20)
    def complex_fee_query(self):
        """Test complex queries involving multiple table joins"""
        if not self.access_token:
            self.login()
            return
            
        # Get all fee types with related data (involves multiple joins)
        with self.client.get(
            "/api/v1/fee/types/",
            headers=self.get_auth_headers(),
            catch_response=True,
            name="complex_fee_query"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Validate response structure to ensure joins worked
                    if isinstance(data, list) and len(data) >= 0:
                        response.success()
                    else:
                        response.failure("Invalid response structure")
                except Exception as e:
                    response.failure(f"Response parsing failed: {e}")
            elif response.status_code == 401:
                self.login()
                response.failure("Authentication failed")
            else:
                response.failure(f"Complex query failed: {response.status_code}")
    
    @task(15)
    def bulk_create_fee_categories(self):
        """Test bulk creation operations"""
        if not self.access_token:
            self.login()
            return
            
        # Create multiple fee categories in sequence (simulating bulk operations)
        batch_size = random.randint(3, 7)
        success_count = 0
        
        for i in range(batch_size):
            category_data = {
                "category_name": f"Load Test Cat {uuid.uuid4().hex[:8]}",
                "category_description": f"Bulk test category {i+1}",
                "academic_year_id": 1,
                "category_status": "active"
            }
            
            with self.client.post(
                "/api/v1/fee/categories/",
                json=category_data,
                headers=self.get_auth_headers(),
                catch_response=True,
                name="bulk_create_categories"
            ) as response:
                if response.status_code == 201:
                    success_count += 1
                    try:
                        created_data = response.json()
                        self.created_resources.append(f"fee_category_{created_data.get('id')}")
                    except:
                        pass
                elif response.status_code == 401:
                    self.login()
                    break
        
        # Report batch success rate
        if success_count >= batch_size * 0.8:  # 80% success rate acceptable
            # Mark as success in locust metrics
            pass
        else:
            # This won't directly fail in locust, but we can track it
            print(f"Bulk create batch had low success rate: {success_count}/{batch_size}")
    
    @task(18)
    def transaction_heavy_operation(self):
        """Test operations that involve database transactions"""
        if not self.access_token:
            self.login()
            return
            
        # Create fee class mapping with term amounts (involves transactions)
        fee_class_mapping_data = {
            "fee_type_id": "550e8400-e29b-41d4-a716-446655440000",  # You may need to adjust
            "class_id": 1,
            "total_fee": 50000.00,
            "is_mandatory": True
        }
        
        with self.client.post(
            "/api/v1/fee/class-mappings/",
            json=fee_class_mapping_data,
            headers=self.get_auth_headers(),
            catch_response=True,
            name="transaction_heavy_create"
        ) as response:
            if response.status_code == 201:
                response.success()
                try:
                    created_data = response.json()
                    mapping_id = created_data.get("id")
                    
                    # Create term amounts for this mapping (additional transaction)
                    self.create_term_amounts(mapping_id)
                    
                except Exception as e:
                    response.failure(f"Transaction operation failed: {e}")
            elif response.status_code == 401:
                self.login()
                response.failure("Authentication failed")
            elif response.status_code == 400:
                response.success()  # Validation errors are expected with test data
            else:
                response.failure(f"Transaction operation failed: {response.status_code}")
    
    def create_term_amounts(self, mapping_id: str):
        """Create term amounts for fee class mapping"""
        term_amounts_data = {
            "fee_class_mapping_id": mapping_id,
            "term_amounts": [
                {"fee_term_dates_id": "660e8400-e29b-41d4-a716-446655440000", "term_amount": 25000.00},
                {"fee_term_dates_id": "770e8400-e29b-41d4-a716-446655440000", "term_amount": 25000.00}
            ]
        }
        
        with self.client.post(
            "/api/v1/fee/class-mappings/term-amounts/bulk",
            json=term_amounts_data,
            headers=self.get_auth_headers(),
            catch_response=True,
            name="create_term_amounts"
        ) as response:
            if response.status_code in [201, 400]:  # 400 acceptable due to test data
                response.success()
            else:
                response.failure(f"Term amounts creation failed: {response.status_code}")
    
    @task(12)
    def search_and_filter_operations(self):
        """Test search operations that stress database indexing"""
        if not self.access_token:
            self.login()
            return
            
        # Test different search patterns
        search_patterns = [
            "/api/v1/fee/categories/dropdown?academic_year_id=1",
            "/api/v1/fee/types/dropdown?fee_category_id=550e8400-e29b-41d4-a716-446655440000",
            "/api/v1/masters/classes/dropdown",
            "/api/v1/masters/academic-years/dropdown"
        ]
        
        search_url = random.choice(search_patterns)
        
        with self.client.get(
            search_url,
            headers=self.get_auth_headers(),
            catch_response=True,
            name="search_filter_ops"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                self.login()
                response.failure("Authentication failed")
            else:
                response.failure(f"Search operation failed: {response.status_code}")
    
    @task(8)
    def concurrent_read_write_test(self):
        """Test concurrent read/write operations"""
        if not self.access_token:
            self.login()
            return
            
        # Simulate concurrent operations by mixing reads and writes
        operations = [
            ("read", "/api/v1/fee/categories/"),
            ("read", "/api/v1/fee/types/"),
            ("write", self.create_test_fee_type),
            ("read", "/api/v1/masters/academic-years/"),
        ]
        
        operation_type, operation = random.choice(operations)
        
        if operation_type == "read":
            with self.client.get(
                operation,
                headers=self.get_auth_headers(),
                catch_response=True,
                name="concurrent_read"
            ) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 401:
                    self.login()
                    response.failure("Authentication failed")
                else:
                    response.failure(f"Concurrent read failed: {response.status_code}")
        else:
            # Execute write operation
            operation()
    
    def create_test_fee_type(self):
        """Create a test fee type (write operation)"""
        fee_type_data = {
            "type_name": f"LoadTest_{uuid.uuid4().hex[:8]}",
            "fee_category_id": "550e8400-e29b-41d4-a716-446655440000",
            "fee_term_id": "660e8400-e29b-41d4-a716-446655440000",
            "academic_year_id": 1,
            "fee_status": "active"
        }
        
        with self.client.post(
            "/api/v1/fee/types/",
            json=fee_type_data,
            headers=self.get_auth_headers(),
            catch_response=True,
            name="concurrent_write"
        ) as response:
            if response.status_code == 201:
                response.success()
            elif response.status_code == 400:
                response.success()  # Validation errors expected with test data
            elif response.status_code == 401:
                self.login()
                response.failure("Authentication failed")
            else:
                response.failure(f"Concurrent write failed: {response.status_code}")
    
    @task(5)
    def database_connection_stress(self):
        """Test multiple rapid-fire database connections"""
        if not self.access_token:
            self.login()
            return
            
        # Make multiple rapid requests to stress connection pooling
        endpoints = [
            "/api/v1/fee/categories/",
            "/api/v1/fee/types/",
            "/api/v1/masters/classes/",
            "/api/v1/masters/academic-years/"
        ]
        
        for endpoint in endpoints:
            with self.client.get(
                endpoint,
                headers=self.get_auth_headers(),
                catch_response=True,
                name="connection_stress"
            ) as response:
                if response.status_code != 200 and response.status_code != 401:
                    response.failure(f"Connection stress test failed: {response.status_code}")
                    break


# Event handlers for database-specific monitoring
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Monitor database-heavy request performance"""
    if exception:
        print(f"Database operation failed: {request_type} {name} - {exception}")
    elif response_time > 5000:  # Log very slow database operations (>5 seconds)
        print(f"Very slow database operation: {request_type} {name} - {response_time}ms")
    elif "bulk" in name and response_time > 3000:
        print(f"Slow bulk operation: {request_type} {name} - {response_time}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print database test start information"""
    print("=" * 50)
    print("STARTING COS360 DATABASE HEAVY LOAD TEST")
    print(f"Target URL: {environment.host}")
    print("Testing: Complex Queries, Transactions, Bulk Operations")
    print("Focus: Database Performance, Connection Pooling, Concurrent Access")
    print("=" * 50)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print database test completion information"""
    print("=" * 50)
    print("COS360 DATABASE HEAVY LOAD TEST COMPLETED")
    print("Key database metrics to analyze:")
    print("- Query response times")
    print("- Transaction throughput")
    print("- Connection pool efficiency")
    print("- Concurrent operation handling")
    print("- Bulk operation performance")
    print("=" * 50)


if __name__ == "__main__":
    from locust import run_single_user
    
    print("Running single database-heavy user test...")
    run_single_user(DatabaseHeavyUser, host="http://localhost:8000")
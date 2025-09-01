#!/usr/bin/env python3
"""
Comprehensive Stress Test Runner for COS360

This script runs progressive load tests to find the breaking point of the application.
"""

import subprocess
import time
import os
import sys
import psutil
import requests
from datetime import datetime
from typing import List, Dict, Any


class StressTestRunner:
    """
    Orchestrates progressive stress testing to find application limits
    """
    
    def __init__(self, target_url="http://localhost:8000"):
        self.target_url = target_url
        self.results = []
        self.max_users_tested = 0
        self.breaking_point = None
        
    def check_application_health(self) -> bool:
        """Check if the application is responding"""
        try:
            response = requests.get(f"{self.target_url}/", timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def get_system_resources(self) -> Dict[str, Any]:
        """Get current system resource usage"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
            "network_connections": len(psutil.net_connections()),
            "timestamp": datetime.now().isoformat()
        }
    
    def run_locust_test(self, test_file: str, users: int, spawn_rate: int, duration: int) -> Dict[str, Any]:
        """Run a specific locust test with given parameters"""
        print(f"\n{'='*50}")
        print(f"Running {test_file} with {users} users, spawn rate {spawn_rate}")
        print(f"Duration: {duration} seconds")
        print(f"{'='*50}")
        
        # Build locust command
        cmd = [
            "locust",
            "-f", test_file,
            "--host", self.target_url,
            "--users", str(users),
            "--spawn-rate", str(spawn_rate),
            "--run-time", f"{duration}s",
            "--headless",
            "--print-stats",
            "--html", f"reports/{os.path.basename(test_file)}_u{users}_report.html",
            "--csv", f"reports/{os.path.basename(test_file)}_u{users}"
        ]
        
        # Record system state before test
        pre_test_resources = self.get_system_resources()
        
        # Run the test
        start_time = time.time()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=duration + 60)
            success = result.returncode == 0
            output = result.stdout
            error_output = result.stderr
        except subprocess.TimeoutExpired:
            success = False
            output = "Test timed out"
            error_output = "Process killed due to timeout"
        except Exception as e:
            success = False
            output = f"Test failed to start: {str(e)}"
            error_output = str(e)
        
        end_time = time.time()
        
        # Record system state after test
        post_test_resources = self.get_system_resources()
        
        # Check if application is still healthy
        app_healthy = self.check_application_health()
        
        test_result = {
            "test_file": test_file,
            "users": users,
            "spawn_rate": spawn_rate,
            "duration": duration,
            "success": success,
            "app_healthy_after": app_healthy,
            "execution_time": end_time - start_time,
            "stdout": output,
            "stderr": error_output,
            "pre_test_resources": pre_test_resources,
            "post_test_resources": post_test_resources,
            "timestamp": datetime.now().isoformat()
        }
        
        self.results.append(test_result)
        return test_result
    
    def run_progressive_test_series(self):
        """Run progressive tests with increasing load"""
        print("Starting Progressive Stress Test Series")
        print("=" * 50)
        
        # Ensure reports directory exists
        os.makedirs("reports", exist_ok=True)
        
        # Test configurations: (users, spawn_rate, duration)
        test_configs = [
            # Light load tests
            (5, 2, 60),      # 5 users, 2 per second spawn, 1 minute
            (10, 3, 60),     # 10 users
            (25, 5, 90),     # 25 users, 1.5 minutes
            
            # Medium load tests
            (50, 5, 120),    # 50 users, 2 minutes
            (100, 10, 120),  # 100 users
            (200, 15, 180),  # 200 users, 3 minutes
            
            # Heavy load tests
            (400, 20, 180),  # 400 users
            (600, 25, 240),  # 600 users, 4 minutes
            (800, 30, 240),  # 800 users
            (1000, 35, 300), # 1000 users, 5 minutes
            
            # Extreme load tests
            (1500, 40, 300), # 1500 users
            (2000, 50, 300), # 2000 users
            (3000, 60, 300), # 3000 users
        ]
        
        # Test files to run
        test_files = [
            "basic_load_test.py",
            "auth_load_test.py",
            "database_heavy_test.py"
        ]
        
        for test_file in test_files:
            print(f"\n\nTesting with {test_file}")
            print("=" * 40)
            
            for users, spawn_rate, duration in test_configs:
                # Check if app is healthy before starting next test
                if not self.check_application_health():
                    print(f"❌ Application unhealthy before {users} user test. Stopping.")
                    self.breaking_point = self.max_users_tested
                    break
                
                # Run the test
                result = self.run_locust_test(test_file, users, spawn_rate, duration)
                self.max_users_tested = users
                
                # Print immediate results
                status = "✅ PASSED" if result["success"] and result["app_healthy_after"] else "❌ FAILED"
                print(f"{status} - {users} users - App Healthy: {result['app_healthy_after']}")
                print(f"CPU: {result['post_test_resources']['cpu_percent']:.1f}% | "
                      f"Memory: {result['post_test_resources']['memory_percent']:.1f}% | "
                      f"Connections: {result['post_test_resources']['network_connections']}")
                
                # If test failed or app became unhealthy, this might be the breaking point
                if not result["success"] or not result["app_healthy_after"]:
                    print(f"⚠️ Potential breaking point detected at {users} users")
                    self.breaking_point = users
                    
                    # Try once more with slightly fewer users to confirm
                    if users > 50:
                        reduced_users = int(users * 0.8)
                        print(f"Confirming with reduced load: {reduced_users} users")
                        confirm_result = self.run_locust_test(test_file, reduced_users, spawn_rate, duration)
                        
                        if confirm_result["success"] and confirm_result["app_healthy_after"]:
                            print(f"✅ Confirmed breaking point between {reduced_users} and {users} users")
                        else:
                            print(f"❌ Application failing at lower loads too")
                    
                    break  # Stop testing this file
                
                # Wait a bit between tests to let the system recover
                print("Cooling down for 30 seconds...")
                time.sleep(30)
            
            # Longer cooldown between test files
            if test_files.index(test_file) < len(test_files) - 1:
                print("Cooling down for 2 minutes before next test file...")
                time.sleep(120)
    
    def generate_summary_report(self):
        """Generate a comprehensive summary report"""
        print("\n" + "="*60)
        print("STRESS TEST SUMMARY REPORT")
        print("="*60)
        
        if self.breaking_point:
            print(f"🔴 BREAKING POINT DETECTED: {self.breaking_point} concurrent users")
        else:
            print(f"🟢 NO BREAKING POINT FOUND: Tested up to {self.max_users_tested} users")
        
        print(f"\nTotal tests run: {len(self.results)}")
        
        # Success rate by test type
        test_types = {}
        for result in self.results:
            test_type = result["test_file"]
            if test_type not in test_types:
                test_types[test_type] = {"total": 0, "successful": 0, "max_users": 0}
            
            test_types[test_type]["total"] += 1
            if result["success"] and result["app_healthy_after"]:
                test_types[test_type]["successful"] += 1
            test_types[test_type]["max_users"] = max(test_types[test_type]["max_users"], result["users"])
        
        print("\nResults by Test Type:")
        for test_type, stats in test_types.items():
            success_rate = (stats["successful"] / stats["total"]) * 100
            print(f"  {test_type}:")
            print(f"    Success Rate: {success_rate:.1f}%")
            print(f"    Max Users Tested: {stats['max_users']}")
            print(f"    Tests Run: {stats['total']}")
        
        # Resource usage analysis
        print("\nResource Usage Analysis:")
        max_cpu = max([r["post_test_resources"]["cpu_percent"] for r in self.results])
        max_memory = max([r["post_test_resources"]["memory_percent"] for r in self.results])
        max_connections = max([r["post_test_resources"]["network_connections"] for r in self.results])
        
        print(f"  Peak CPU Usage: {max_cpu:.1f}%")
        print(f"  Peak Memory Usage: {max_memory:.1f}%")
        print(f"  Peak Network Connections: {max_connections}")
        
        # Recommendations
        print("\nRECOMMENDATIONS:")
        if max_cpu > 80:
            print("  ⚠️ CPU usage exceeded 80% - consider CPU optimization or scaling")
        if max_memory > 80:
            print("  ⚠️ Memory usage exceeded 80% - monitor for memory leaks")
        if self.breaking_point and self.breaking_point < 500:
            print("  ⚠️ Low concurrent user capacity - investigate bottlenecks")
        if not self.breaking_point:
            print("  ✅ Application handled high loads well - ready for production")
        
        print("\n" + "="*60)
        
        # Save detailed report
        import json
        with open("reports/stress_test_summary.json", "w") as f:
            json.dump({
                "breaking_point": self.breaking_point,
                "max_users_tested": self.max_users_tested,
                "test_results": self.results,
                "summary": {
                    "peak_cpu": max_cpu,
                    "peak_memory": max_memory,
                    "peak_connections": max_connections,
                    "test_types": test_types
                }
            }, f, indent=2)
        
        print("Detailed report saved to: reports/stress_test_summary.json")


def main():
    """Main execution function"""
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
    else:
        target_url = "http://localhost:8000"
    
    print("COS360 Comprehensive Stress Test Runner")
    print(f"Target URL: {target_url}")
    print("Make sure your application is running!")
    
    # Check if application is running
    runner = StressTestRunner(target_url)
    if not runner.check_application_health():
        print("❌ Application is not responding! Please start the application first.")
        print("Run: uvicorn app.main:app --reload")
        sys.exit(1)
    
    print("✅ Application is responding. Starting stress tests...")
    
    try:
        runner.run_progressive_test_series()
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Tests failed with error: {e}")
    finally:
        runner.generate_summary_report()


if __name__ == "__main__":
    main()
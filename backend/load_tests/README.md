# COS360 Load Testing Suite

This comprehensive load testing suite is designed to stress test the COS360 FastAPI application and find its breaking point under various concurrent user loads.

## Overview

The testing suite includes multiple test scenarios designed to stress different aspects of your application:

1. **Basic Load Test** - Tests non-authenticated endpoints
2. **Authentication Load Test** - Tests login, token refresh, and authenticated endpoints
3. **Database Heavy Test** - Tests database-intensive operations and transactions
4. **Progressive Stress Testing** - Automatically finds the breaking point

## Prerequisites

1. **Install Dependencies**:
   ```bash
   pip install locust psutil requests
   ```

2. **Start Your Application**:
   ```bash
   uvicorn app.main:app --reload
   ```

3. **Update Test Credentials** (if needed):
   Edit the test files and update the login credentials in the `login()` methods:
   ```python
   login_data = {
       "username": "your_test_user",
       "password": "your_test_password",
       "client_name": "default"
   }
   ```

## Test Files

### 1. Basic Load Test (`basic_load_test.py`)
Tests basic API functionality without authentication.

**Run manually:**
```bash
locust -f basic_load_test.py --host http://localhost:8000
```

### 2. Authentication Load Test (`auth_load_test.py`)
Tests authentication system, token management, and authenticated endpoints.

**Run manually:**
```bash
locust -f auth_load_test.py --host http://localhost:8000
```

### 3. Database Heavy Test (`database_heavy_test.py`)
Tests database-intensive operations, complex queries, and transactions.

**Run manually:**
```bash
locust -f database_heavy_test.py --host http://localhost:8000
```

### 4. Comprehensive Stress Test (`run_stress_tests.py`)
Automatically runs progressive load tests to find the breaking point.

**Run automated stress test:**
```bash
python run_stress_tests.py [target_url]
```

## Quick Start

### Option 1: Automated Stress Testing (Recommended)
```bash
# Make sure your app is running on http://localhost:8000
python load_tests/run_stress_tests.py

# For different URL:
python load_tests/run_stress_tests.py http://your-server:8000
```

This will:
- Test with increasing concurrent users (5, 10, 25, 50, 100, 200, 400, 600, 800, 1000, 1500, 2000, 3000)
- Run all three test scenarios
- Automatically detect breaking point
- Generate comprehensive reports

### Option 2: Manual Testing with Locust UI
```bash
cd load_tests
locust -f auth_load_test.py --host http://localhost:8000
```

Then open http://localhost:8089 for the Locust web interface.

## Understanding the Results

### Key Metrics to Monitor

1. **Response Times**:
   - Average response time
   - 95th percentile response time
   - Maximum response time

2. **Throughput**:
   - Requests per second (RPS)
   - Failures per second

3. **System Resources**:
   - CPU usage
   - Memory usage
   - Database connections
   - Network connections

4. **Error Rates**:
   - HTTP error codes
   - Exception rates
   - Authentication failures

### Breaking Point Indicators

The application is likely at its breaking point when you see:

- **Response times > 5 seconds** consistently
- **Error rate > 5%**
- **CPU usage > 90%** sustained
- **Memory usage > 85%**
- **Database connection timeouts**
- **Application stops responding**

## Test Scenarios Explained

### Progressive Load Testing

The automated stress test follows this progression:

1. **Light Load** (5-25 users): Baseline performance
2. **Medium Load** (50-200 users): Normal production load
3. **Heavy Load** (400-1000 users): Peak traffic simulation
4. **Extreme Load** (1500-3000 users): Breaking point detection

### Test Types

1. **Basic Load**: 
   - Tests application startup and basic routing
   - Minimal database usage
   - Good for infrastructure testing

2. **Authentication Load**:
   - Tests JWT token creation/validation
   - Multi-tenant authentication
   - Token refresh mechanics
   - Session management

3. **Database Heavy**:
   - Complex queries with joins
   - Transaction handling
   - Bulk operations
   - Connection pooling efficiency
   - Concurrent read/write operations

## Interpreting Results

### Good Performance Indicators
- Response times < 2 seconds under normal load
- Error rate < 1%
- Linear scaling with user increase
- Stable resource usage

### Warning Signs
- Response times > 5 seconds
- Error rate > 2%
- Memory leaks (constantly increasing memory)
- Database connection pool exhaustion

### Critical Issues
- Application becomes unresponsive
- Error rate > 10%
- Response times > 10 seconds
- System resources at 100%

## Report Files

After running tests, check the `reports/` directory for:

- **HTML Reports**: Visual performance graphs
- **CSV Data**: Raw performance data for analysis
- **Summary JSON**: Complete test results and analysis
- **Console Output**: Real-time test progress

## Troubleshooting

### Common Issues

1. **"Application not responding"**:
   - Ensure the app is running: `uvicorn app.main:app --reload`
   - Check the correct port and URL

2. **Authentication failures**:
   - Update test credentials in the test files
   - Ensure test users exist in your database

3. **Database errors**:
   - Check database connection in `alembic.ini`
   - Ensure database is running and accessible

4. **Import errors**:
   - Install missing dependencies: `pip install locust psutil requests`

### Performance Optimization Tips

If you find low breaking points:

1. **Database Optimization**:
   - Add indexes to frequently queried columns
   - Optimize slow queries
   - Increase connection pool size

2. **Application Optimization**:
   - Use async/await properly
   - Implement caching
   - Optimize serialization

3. **Infrastructure**:
   - Increase server resources (CPU, RAM)
   - Use load balancing
   - Implement horizontal scaling

## Example Results

### Typical Breaking Points by Application Size

- **Small App** (simple CRUD): 200-500 concurrent users
- **Medium App** (business logic): 100-300 concurrent users  
- **Complex App** (heavy database): 50-150 concurrent users

Your COS360 application's breaking point will depend on:
- Hardware specifications
- Database performance
- Network latency
- Code optimization level

## Next Steps

1. Run the automated stress test
2. Identify the breaking point
3. Analyze bottlenecks using the reports
4. Optimize based on findings
5. Re-test to measure improvements

Remember: The goal isn't just to find the breaking point, but to understand where optimizations are needed for production deployment.
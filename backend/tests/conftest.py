"""
Pytest configuration and fixtures for the COS360 application
"""
import pytest
import asyncio
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.base import BaseOrg
from app.db.session import get_db

# Test Database URL (SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def test_engine():
    """Create a test database engine"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(BaseOrg.metadata.create_all)
    
    yield engine
    
    await engine.dispose()

@pytest.fixture(scope="function")
async def test_db_session(test_engine):
    """Create a test database session"""
    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session

@pytest.fixture(scope="function")
async def test_client(test_db_session):
    """Create a test client with database dependency override"""
    async def override_get_db():
        yield test_db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def sample_academic_year_data():
    """Sample academic year data for testing"""
    return {
        "title": "2024-2025",
        "is_active": True,
        "start_date": "2024-04-01",
        "end_date": "2025-03-31"
    }

@pytest.fixture
def sample_fee_category_data():
    """Sample fee category data for testing"""
    return {
        "category_name": "Academic Fee",
        "category_status": "active",
        "academic_year_id": 1
    }

@pytest.fixture
def sample_fee_term_data():
    """Sample fee term data for testing"""
    return {
        "term_name": "Quarterly",
        "term_status": "active", 
        "number_of_terms": 4,
        "academic_year_id": 1,
        "fee_term_dates": [
            {"fee_term_date": "2024-01-15"},
            {"fee_term_date": "2024-04-15"},
            {"fee_term_date": "2024-07-15"},
            {"fee_term_date": "2024-10-15"}
        ]
    }
from fastapi import FastAPI
from app.api.v1.main_router import router as api_v1_router
from app.db.base import Base
from app.db.session import engine
from app.tools.logging import configure_logging
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI()

# Create DB tables
Base.metadata.create_all(bind=engine)

# Register Routers
app.include_router(api_v1_router, prefix="/api/v1")

# Configure Logging
configure_logging(log_file="cos360_errors.log")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

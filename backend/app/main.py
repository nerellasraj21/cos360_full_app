import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles

from app.api.v1.main_router import router as api_v1_router
from app.config import settings
from app.db.base import BasePublic
from app.db.session import engine
from app.middleware.error_middleware import GlobalErrorMiddleware
from app.middleware.rate_limit_middleware import RateLimitExceeded, limiter, rate_limit_handler
from app.middleware.request_context_middleware import RequestContextMiddleware
from app.middleware.super_admin_middleware import SuperAdminMiddleware
from app.middleware.tenant_middleware import TenantMiddleware
from app.tools.logging import configure_logging

app = FastAPI(docs_url=None, redoc_url=None)

security = HTTPBasic()


def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = "root"
    correct_password = "Passw0rd!"
    if credentials.username != correct_username or credentials.password != correct_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


# Add rate limiting state and error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


# Create only public schema tables at startup
# BasePublic.metadata.create_all(bind=engine)
async def init_models():
    async with engine.begin() as conn:
        # await conn.run_sync(BasePublic.metadata.drop_all)
        await conn.run_sync(BasePublic.metadata.create_all)


# asyncio.run(init_models())
@app.on_event("startup")
async def startup():
    # Database tables are managed by Alembic migrations
    # No need to create tables on startup in production
    pass


# Serve uploaded media files
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

# Register Routers
app.include_router(api_v1_router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Protected Swagger UI
@app.get("/docs", response_class=HTMLResponse, dependencies=[Depends(authenticate)])
async def get_docs():
    return get_swagger_ui_html(openapi_url="/openapi.json", title="API Docs")


# Protected ReDoc
@app.get("/redoc", response_class=HTMLResponse, dependencies=[Depends(authenticate)])
async def get_redoc():
    return get_redoc_html(openapi_url="/openapi.json", title="API Docs")


# Configure Logging
configure_logging(log_file="cos360_errors.log")

# Global error handling middleware (must be added first to catch all errors)
app.add_middleware(GlobalErrorMiddleware)

# Request context middleware (for correlation IDs and tenant context)
app.add_middleware(RequestContextMiddleware)

# SuperAdmin middleware (for ultimate access context)
app.add_middleware(SuperAdminMiddleware)

# Tenant detection middleware (must be added before other middlewares)
app.add_middleware(TenantMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

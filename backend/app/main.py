from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from app.api.v1.main_router import router as api_v1_router
from app.db.base import BasePublic
from app.db.session import engine
from app.tools.logging import configure_logging
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.tenant_middleware import TenantMiddleware
from app.middleware.super_admin_middleware import SuperAdminMiddleware
from app.middleware.rate_limit_middleware import limiter, rate_limit_handler, RateLimitExceeded
from app.middleware.error_middleware import GlobalErrorMiddleware
from app.middleware.request_context_middleware import RequestContextMiddleware
from app.config import settings

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
    await init_models()

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
    allow_origins=settings.ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

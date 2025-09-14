from fastapi import FastAPI
from app.api.v1.main_router import router as api_v1_router
from app.db.base import BasePublic
from app.db.session import engine
from app.tools.logging import configure_logging
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.tenant_middleware import TenantMiddleware
from app.middleware.rate_limit_middleware import limiter, rate_limit_handler, RateLimitExceeded
from app.config import settings

app = FastAPI()

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

# Configure Logging
configure_logging(log_file="cos360_errors.log")

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

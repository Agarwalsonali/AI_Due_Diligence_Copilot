from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import configure_logging, get_logger, RequestIDMiddleware
from app.database.database import init_db

logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configure logging
    configure_logging()
    
    # Initialize DB
    await init_db()
    
    # Ensure Qdrant collection exists with the dimension of the configured
    # embedding provider (VectorStore.ensure_collection also self-heals on
    # dimension change, so we keep this lightweight and consistent).
    try:
        from app.rag.vector_store import get_vector_store
        get_vector_store()
    except Exception as e:
        logger.warning("qdrant_init_failed", error=str(e))

    yield

app = FastAPI(
    title="AI Due Diligence Copilot API",
    description="Backend API for AI Due Diligence Copilot",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=True,
)

# Inner middleware first, CORS last (so it wraps everything)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.auth import router as auth_router
from app.api.companies import router as companies_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.analysis import router as analysis_router
from app.api.reports import router as reports_router

app.include_router(auth_router)
app.include_router(companies_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(analysis_router)
app.include_router(reports_router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "message": "Service is running"}

@app.get("/.well-known/appspecific/com.chrome.devtools.json", include_in_schema=False)
async def chrome_devtools_well_known():
    """Chrome/DevTools probes this path for workspace discovery.

    Answer with an empty (valid) payload instead of 404 so the probe
    doesn't show up as an error in logs/preview.
    """
    return {"applications": {}}

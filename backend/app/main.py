from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import configure_logging, RequestIDMiddleware
from app.database.database import init_db
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configure logging
    configure_logging()
    
    # Initialize DB
    await init_db()
    
    # Initialize Qdrant Collection
    qdrant_client = AsyncQdrantClient(url=settings.QDRANT_URL)
    try:
        collections = await qdrant_client.get_collections()
        collection_names = [c.name for c in collections.collections]
        if settings.QDRANT_COLLECTION not in collection_names:
            await qdrant_client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=models.VectorParams(
                    size=settings.EMBEDDING_DIMENSIONS,
                    distance=models.Distance.COSINE
                )
            )
    except Exception as e:
        print(f"Error initializing Qdrant: {e}")
        pass
    
    yield

app = FastAPI(
    title="AI Due Diligence Copilot API",
    description="Backend API for AI Due Diligence Copilot",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestIDMiddleware)

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

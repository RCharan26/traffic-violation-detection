"""
TrafficVision AI — FastAPI Main Application Entrypoint.
Initializes lifespans, registers middlewares (CORS), mounts static assets directories,
and mounts API routers under /api/v1.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import create_all_tables
from app.routers import auth, upload, detect, violations, analytics, history, search, reports, performance, training, video

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes tables and models on startup, cleans up on shutdown."""
    logger.info("Initializing TrafficVision AI application...")
    try:
        # Create database tables if they do not exist
        await create_all_tables()
        logger.info("Database tables verified.")
    except Exception as e:
        logger.error(f"Failed to initialize database on startup: {e}", exc_info=True)
    yield
    logger.info("Shutting down TrafficVision AI application...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ── CORS Middleware Configuration ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files Serving ──────────────────────────────────────────────────────
# Serve raw uploads and annotated evidence images directly via HTTP
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/evidence", StaticFiles(directory=str(settings.EVIDENCE_DIR)), name="evidence")

# ── API Routes Registration ───────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(detect.router, prefix="/api/v1")
app.include_router(violations.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(performance.router, prefix="/api/v1")
app.include_router(training.router, prefix="/api/v1")
app.include_router(video.router, prefix="/api/v1")


@app.get("/api/v1/model-status")
def get_model_status_endpoint():
    """Returns model loading status and paths for active models."""
    from app.services.detection import DetectionService
    return DetectionService.get_model_status()


@app.get("/health")
def health_check():
    """Health check endpoint for docker compose and status monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }

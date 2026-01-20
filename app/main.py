"""
Refactored main.py with proper logging, startup tasks, and error handling.
"""

import asyncio
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.db.mongo import MongoClientFactory

# Import routers
from app.api.jobs import router as jobs_router
from app.api.candidates import router as candidates_router
from app.api.recommendations import router as recs_router
from app.api.parse_resume import router as resume_router
from app.api.parse_job import router as parse_job_router
from app.api.candidate_matches import router as candidate_matches_router


# ============================================================================
# Logging Configuration
# ============================================================================

def setup_logging():
    """Configure application logging."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Set specific loggers
    logging.getLogger('app').setLevel(log_level)

    # Reduce noise from third-party libraries
    logging.getLogger('motor').setLevel(logging.WARNING)
    logging.getLogger('pymongo').setLevel(logging.WARNING)
    logging.getLogger('sentence_transformers').setLevel(logging.WARNING)
    logging.getLogger('torch').setLevel(logging.WARNING)

    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured at {settings.LOG_LEVEL} level")


# ============================================================================
# Database Indexes
# ============================================================================

async def create_indexes():
    """Create database indexes for optimal query performance."""
    logger = logging.getLogger(__name__)

    try:
        db = MongoClientFactory.get_db()

        # Candidates indexes
        await db.candidates.create_index("email", unique=True, sparse=True)
        await db.candidates.create_index("location")
        await db.candidates.create_index("created_at")
        await db.candidates.create_index([("salary_expectation", 1)])

        # Jobs indexes
        await db.jobs.create_index("location")
        await db.jobs.create_index("created_at")
        await db.jobs.create_index([("salary_min", 1), ("salary_max", 1)])

        # Add status field index if you implement job status
        # await db.jobs.create_index("status")

        logger.info("Database indexes created successfully")

    except Exception as e:
        logger.error(f"Failed to create indexes: {e}", exc_info=True)
        # Don't fail startup, but log the error


# ============================================================================
# Lifespan Context Manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.
    Executes on startup and shutdown.
    """
    logger = logging.getLogger(__name__)

    # Startup
    logger.info(f"Starting {settings.APP_NAME}...")

    try:
        # Setup logging
        setup_logging()

        # Create database indexes
        await create_indexes()

        # Warm up the embedding model (loads it into memory)
        from app.services.matching_service import get_embedding_model
        model = get_embedding_model()
        logger.info(f"Embedding model loaded: {settings.EMBEDDING_MODEL}")

        logger.info(f"{settings.APP_NAME} startup complete")

    except Exception as e:
        logger.error(f"Startup error: {e}", exc_info=True)
        raise

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}...")

    # Close MongoDB connection
    try:
        client = MongoClientFactory.get_client()
        if client:
            client.close()
            logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB: {e}")


# ============================================================================
# Create FastAPI App
# ============================================================================

# Windows event loop policy
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Create app with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="AI-powered job matching system with semantic similarity",
    lifespan=lifespan
)


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages."""
    logger = logging.getLogger(__name__)
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "body": exc.body
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler."""
    logger = logging.getLogger(__name__)
    logger.error(
        f"Unhandled exception on {request.url}: {exc}",
        exc_info=True
    )

    if settings.DEBUG:
        # In debug mode, return detailed error
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": str(exc),
                "type": type(exc).__name__
            }
        )
    else:
        # In production, return generic error
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )


# ============================================================================
# Middleware
# ============================================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger = logging.getLogger(__name__)

    # Log request
    logger.info(f"{request.method} {request.url.path}")

    # Process request
    response = await call_next(request)

    # Log response status
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")

    return response


# ============================================================================
# Routers
# ============================================================================

app.include_router(jobs_router)
app.include_router(candidates_router)
app.include_router(recs_router)
app.include_router(resume_router)
app.include_router(parse_job_router)
app.include_router(candidate_matches_router)


# ============================================================================
# Health Check Endpoints
# ============================================================================

@app.get("/healthz")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0"
    }


@app.get("/readiness")
async def readiness_check():
    """
    Readiness check - verifies all dependencies are ready.
    Returns 503 if not ready.
    """
    logger = logging.getLogger(__name__)

    try:
        # Check MongoDB connection
        db = MongoClientFactory.get_db()
        await db.command("ping")

        # Check if embedding model is loaded
        from app.services.matching_service import get_embedding_model
        model = get_embedding_model()

        return {
            "status": "ready",
            "mongodb": "connected",
            "embedding_model": "loaded"
        }

    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not ready",
                "error": str(e)
            }
        )


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/healthz",
        "readiness": "/readiness"
    }

# ============================================================================
# Run with: uvicorn app.main:app --reload
# ============================================================================
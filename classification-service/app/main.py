from fastapi import FastAPI
from contextlib import asynccontextmanager
import ee
import logging

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info(f"Initializing Earth Engine with project: {settings.GOOGLE_CLOUD_PROJECT_ID}")
    try:
        ee.Initialize(project=settings.GOOGLE_CLOUD_PROJECT_ID)
        logger.info("Earth Engine initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine: {e}")
        # Depending on requirements, we might want to raise the exception to stop startup
        # raise e
    
    yield
    
    # Shutdown logic
    logger.info("Shutting down classification service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Satellite change classification via Google Earth Engine",
    version="0.1.0",
    lifespan=lifespan,
)

from app.api.endpoints import gee
app.include_router(gee.router, prefix=settings.API_V1_STR + "/gee", tags=["Google Earth Engine"])

@app.get("/health")
def health():
    return {"status": "UP", "gee_project": settings.GOOGLE_CLOUD_PROJECT_ID}

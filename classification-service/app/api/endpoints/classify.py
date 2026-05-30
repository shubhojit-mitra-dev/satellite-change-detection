from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.classifier import classify_deltas
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ClassifyRequest(BaseModel):
    fieldId: str
    delta_array: List[float]

class ClassifyResponse(BaseModel):
    crop_growth_pct: float
    crop_stress_pct: float
    significant_change_pct: float
    no_change_pct: float
    pixel_labels: List[str]

@router.post("/", response_model=ClassifyResponse)
async def classify_pixels(request: ClassifyRequest):
    try:
        result = classify_deltas(request.delta_array)
        pcts = result["percentages"]
        
        return ClassifyResponse(
            crop_growth_pct=pcts.get("crop_growth", 0.0),
            crop_stress_pct=pcts.get("crop_stress", 0.0),
            significant_change_pct=pcts.get("significant_change", 0.0),
            no_change_pct=pcts.get("no_change", 0.0),
            pixel_labels=result["labels"]
        )
    except Exception as e:
        logger.error(f"Failed to classify pixels for field {request.fieldId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

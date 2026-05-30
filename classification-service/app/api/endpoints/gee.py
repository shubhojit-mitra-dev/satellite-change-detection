from fastapi import APIRouter
from app.schemas.gee_schema import DeltaRequest, DeltaResponse
from app.services.gee_service import GEEService

router = APIRouter()

@router.post("/calculate-delta", response_model=DeltaResponse)
def calculate_delta(request: DeltaRequest):
    result = GEEService.calculate_delta(
        field_id=request.field_id,
        lon_min=request.lon_min,
        lat_min=request.lat_min,
        lon_max=request.lon_max,
        lat_max=request.lat_max,
        date1=request.date1,
        date2=request.date2
    )
    return result

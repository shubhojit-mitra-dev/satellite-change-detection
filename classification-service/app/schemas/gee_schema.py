from pydantic import BaseModel
from typing import List

class DeltaRequest(BaseModel):
    field_id: str
    lon_min: float
    lat_min: float
    lon_max: float
    lat_max: float
    date1: str
    date2: str

class DeltaResponse(BaseModel):
    fieldId: str
    date1: str
    date2: str
    ndvi_date1: List[float]
    ndvi_date2: List[float]
    ndvi_delta: List[float]
    total_pixels: int

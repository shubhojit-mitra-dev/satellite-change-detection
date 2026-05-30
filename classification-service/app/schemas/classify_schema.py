from pydantic import BaseModel
from typing import List

class ClassifyRequest(BaseModel):
    fieldId: str
    delta_array: List[float]

class ClassifyResponse(BaseModel):
    crop_growth_pct: float
    crop_stress_pct: float
    significant_change_pct: float
    no_change_pct: float
    pixel_labels: List[str]

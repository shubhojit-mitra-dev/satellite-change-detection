import ee
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class GEEService:
    @staticmethod
    def pad_or_trim(values: list[float], size: int = 400) -> list[float]:
        if not values:
            values = []
        if len(values) > size:
            return values[:size]
        return values + [0.0] * (size - len(values))

    @classmethod
    def fetch_ndvi_for_date(cls, aoi: ee.Geometry, date_str: str) -> list[float]:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        next_day_str = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
        
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi)
            .filterDate(date_str, next_day_str)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .sort("CLOUDY_PIXEL_PERCENTAGE")
        )
        
        image = collection.first()
        ndvi = image.normalizedDifference(["B8", "B4"])
        
        samples = ndvi.sample(region=aoi, numPixels=400, scale=50, geometries=False)
        values = samples.aggregate_array("nd").getInfo()
        
        return cls.pad_or_trim(values, 400)

    @classmethod
    def calculate_delta(cls, field_id: str, lon_min: float, lat_min: float, lon_max: float, lat_max: float, date1: str, date2: str) -> dict:
        aoi = ee.Geometry.Rectangle([lon_min, lat_min, lon_max, lat_max])
        
        try:
            grid1 = cls.fetch_ndvi_for_date(aoi, date1)
        except Exception as e:
            logger.error(f"Error fetching data for date {date1}: {e}")
            grid1 = [0.0] * 400
            
        try:
            grid2 = cls.fetch_ndvi_for_date(aoi, date2)
        except Exception as e:
            logger.error(f"Error fetching data for date {date2}: {e}")
            grid2 = [0.0] * 400

        delta = [round(d2 - d1, 4) for d1, d2 in zip(grid1, grid2)]
        
        return {
            "fieldId": field_id,
            "date1": date1,
            "date2": date2,
            "ndvi_date1": [round(v, 4) for v in grid1],
            "ndvi_date2": [round(v, 4) for v in grid2],
            "ndvi_delta": delta,
            "total_pixels": 400
        }

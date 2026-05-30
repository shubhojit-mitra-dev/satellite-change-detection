import sys
import json
import ee
from datetime import datetime, timedelta

def pad_or_trim(values, size=400):
    if not values:
        values = []
    if len(values) > size:
        return values[:size]
    return values + [0.0] * (size - len(values))

def fetch_ndvi_for_date(aoi, date_str):
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
    
    samples = ndvi.sample(region=aoi, numPixels=400, scale=10)
    values = samples.aggregate_array("nd").getInfo()
    
    return pad_or_trim(values, 400)

def main():
    if len(sys.argv) != 8:
        print("Usage: python gee_fetch.py <field_id> <lon_min> <lat_min> <lon_max> <lat_max> <date1> <date2>", file=sys.stderr)
        sys.exit(1)
        
    field_id = sys.argv[1]
    lon_min = float(sys.argv[2])
    lat_min = float(sys.argv[3])
    lon_max = float(sys.argv[4])
    lat_max = float(sys.argv[5])
    date1 = sys.argv[6]
    date2 = sys.argv[7]
    
    ee.Initialize()
    
    aoi = ee.Geometry.Rectangle([lon_min, lat_min, lon_max, lat_max])
    
    try:
        grid1 = fetch_ndvi_for_date(aoi, date1)
    except Exception as e:
        print(f"Error fetching data for date {date1}: {e}", file=sys.stderr)
        grid1 = [0.0] * 400
        
    try:
        grid2 = fetch_ndvi_for_date(aoi, date2)
    except Exception as e:
        print(f"Error fetching data for date {date2}: {e}", file=sys.stderr)
        grid2 = [0.0] * 400

    delta = [round(d2 - d1, 4) for d1, d2 in zip(grid1, grid2)]
    
    output = {
        "fieldId": field_id,
        "date1": date1,
        "date2": date2,
        "ndvi_date1": [round(v, 4) for v in grid1],
        "ndvi_date2": [round(v, 4) for v in grid2],
        "ndvi_delta": delta,
        "total_pixels": 400
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()

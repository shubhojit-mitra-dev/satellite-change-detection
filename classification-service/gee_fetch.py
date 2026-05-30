import sys
import json
import ee

from app.core.config import settings
from app.services.gee_service import GEEService

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
    
    # Initialize Earth Engine with the configured project ID
    try:
        ee.Initialize(project=settings.GOOGLE_CLOUD_PROJECT_ID)
    except Exception as e:
        print(f"Failed to initialize Earth Engine: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Delegate logic to the structured service
    output = GEEService.calculate_delta(
        field_id=field_id,
        lon_min=lon_min,
        lat_min=lat_min,
        lon_max=lon_max,
        lat_max=lat_max,
        date1=date1,
        date2=date2
    )
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()

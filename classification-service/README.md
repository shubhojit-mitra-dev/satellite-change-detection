# Classification Service 🛰️

The `classification-service` is a microservice built with FastAPI and Python that bridges the gap between the Satellite Change Detection System and **Google Earth Engine (GEE)**. It serves two distinct and critical roles in the pipeline:
1. **Data Ingestion (CLI)**: Systematically sampling Earth Engine satellite imagery, computing Normalized Difference Vegetation Index (NDVI) matrices, and extracting pixel deltas to identify environmental changes over time.
2. **ML Inference (REST API)**: Acting as a statistical engine to classify the pixel deltas into actionable crop health insights (growth, stress, no-change).

---

## 🏗️ Architecture & Stack

- **Framework**: FastAPI
- **Data Integration**: Google Earth Engine Python API
- **Dependency Management**: `uv`
- **Validation**: Pydantic
- **Environment**: Python 3.10+

---

## 🚀 Installation & Setup

### Method 1: Local Development (GitHub)

1. **Install `uv`** (if not already installed):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Clone the Repository & Navigate**:
   ```bash
   cd satellite-change-detection/classification-service
   ```

3. **Install Dependencies & Create Virtual Environment**:
   ```bash
   uv sync
   ```

4. **Environment Variables**:
   Create a `.env` file in the `classification-service/` directory and add your Google Cloud Project ID:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
   ```

5. **Authenticate with Google Earth Engine**:
   Run the Earth Engine authentication command within the virtual environment. You only need to do this once.
   ```bash
   uv run earthengine authenticate
   ```

### Method 2: DockerHub (Coming Soon)

A pre-built Docker image will be available via DockerHub.
*(Note: DockerHub usage details will be updated here prior to deployment.)*

---

## 💻 Usage

### 1. Data Ingestion (CLI Tool)

The service provides a CLI wrapper (`gee_fetch.py`) that the `ingestion-service` calls via Java's `ProcessBuilder`.

**Syntax:**
```bash
uv run python gee_fetch.py <field_id> <lon_min> <lat_min> <lon_max> <lat_max> <date1> <date2>
```

**Example Demo Command (Live Demo Config):**
```bash
uv run python gee_fetch.py field-001 76.9 13.3 77.1 13.5 2024-01-06 2024-01-21
```

**Output:**
Returns a JSON string containing exactly 400 systematically reduced NDVI pixels for both dates and their corresponding delta:
```json
{
  "fieldId": "field-001",
  "date1": "2024-01-06",
  "date2": "2024-01-21",
  "ndvi_date1": [0.1274, 0.4692, 0.1242, ...],
  "ndvi_date2": [0.2602, 0.3101, 0.5085, ...],
  "ndvi_delta": [0.1328, -0.1591, 0.3844, ...],
  "total_pixels": 400
}
```

#### Absolute Path Requirements (For T-02 Integration)
When orchestrating this from the `ingestion-service`, the following absolute paths must be used to ensure the execution happens within the correct virtual environment context:
- **Python Binary**: `/home/blackknight05/Desktop/satellite-change-detection/classification-service/.venv/bin/python`
- **Script Path**: `/home/blackknight05/Desktop/satellite-change-detection/classification-service/gee_fetch.py`

---

### 2. ML Classification (REST API)

The service must be run natively as a REST API for the `change-detection-service` to query it.

**Start the Server:**
```bash
uv run uvicorn app.main:app --port 8000 --reload
```

#### Endpoints:

- `GET /health` : Verify system health and GEE project initialization.
- `POST /api/v1/gee/calculate-delta` : Submit JSON bounds to compute and return NDVI deltas.
- `POST /classify` : Accepts an array of NDVI delta pixels and classifies crop health.

#### The `/classify` Endpoint Details
Used by the `change-detection-service` orchestrator to calculate insights.

**Example Request**:
```bash
curl -X POST http://localhost:8000/classify \
-H "Content-Type: application/json" \
-d '{
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "deltaArray": [0.1328, -0.1591, 0.3844, -0.052, 0.012]
}'
```

**Successful Response** (`200 OK`):
```json
{
  "crop_growth_pct": 40.0,
  "crop_stress_pct": 20.0,
  "significant_change_pct": 60.0,
  "no_change_pct": 40.0,
  "pixelLabels": ["GROWTH", "STRESS", "GROWTH", "NO_CHANGE", "NO_CHANGE"]
}
```

---

## 🧪 Testing Constants (Live Demo at 8 PM)

Please use these exact variables when performing the live Monday 8 PM demo to ensure data consistency and avoid hitting GEE rate limits or heavy cloud cover:

- **Field ID**: `field-001`
- **Demo Dates**:
  - `date1`: `2024-01-06`
  - `date2`: `2024-01-21`
- **Demo AOI (Tumkur Region Bounding Box)**:
  - `lon_min`: `76.9`
  - `lat_min`: `13.3`
  - `lon_max`: `77.1`
  - `lat_max`: `13.5`

---

## 🛠️ Project Structure

```text
classification-service/
├── .env
├── gee_fetch.py                # Wrapper script pointing to structured logic
├── pyproject.toml
├── example/                    # Output examples
│   └── example_result.json
└── app/
    ├── main.py                 # FastAPI application factory & Lifespan
    ├── api/
    │   └── endpoints/
    │       ├── gee.py          # Legacy GEE Route definitions
    │       └── classify.py     # ML Classification logic route
    ├── core/
    │   └── config.py           # Pydantic BaseSettings loading
    ├── schemas/
    │   ├── gee_schema.py       # Pydantic models for GEE
    │   └── classify_schema.py  # Pydantic models for Classification
    └── services/
        ├── classifier.py       # ML Classification logic service
        └── gee_service.py      # Earth Engine logic and systematic grid reduction
```

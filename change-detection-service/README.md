# Satellite Change Detection: Change Detection Service

The **Change Detection Service** acts as the central orchestration and analysis hub of the satellite monitoring platform. It is a robust Spring Boot microservice designed to bridge the gap between raw data ingestion and machine-learning evaluation.

It asynchronously intercepts raw NDVI data streams via Kafka, filters signal from noise using a configurable threshold, proxies out to a high-performance Python FastAPI service for ML inference, persists the results into a PostgreSQL `jsonb` enabled database, and broadcasts the final normalized insights back onto the event bus.

---

## 🏗️ Architecture & Responsibilities

1. **Kafka Integration (Consumer & Producer)**: Intercepts raw data chunks from `satellite.ingest`, processes them, and broadcasts the finalized insights downstream to `satellite.change`.
2. **Signal Filtering**: Extracts the `ndvi_delta` JSON arrays and calculates the `changedPixelPct` by applying an absolute threshold (default `0.15`) across thousands of data points.
3. **Synchronous ML Proxying**: Uses Spring's `RestTemplate` to fire strongly-typed synchronous REST calls to the `classification-service`.
4. **Relational Persistence**: Leverages native PostgreSQL `jsonb` column mappings via Hibernate's `@JdbcTypeCode` to securely store both the raw multidimensional arrays (`ChangeRecord`) and the derived ML statistical percentages (`Classification`).
5. **REST API Exposure**: Provides read-only REST endpoints to fetch historical change evaluations.

---

## 🚀 Getting Started

### Prerequisites
To run this service locally, you must have the following dependencies available:
- **Java 17+**
- **Maven**
- **PostgreSQL** (running on `localhost:5432`)
- **Apache Kafka & Zookeeper** (running on `localhost:9092`)
- **Classification Service** (Python FastAPI running on `localhost:8000`)

### 🛠️ Configuration
The service connects to its dependencies via `src/main/resources/application.yml`. You can override the defaults using the following environment variables:

- `PORT` (Default: `8082`)
- `DB_URL` (Default: `jdbc:postgresql://localhost:5432/satdb`)
- `DB_USER` (Default: `postgres`)
- `DB_PASSWORD` (Default: `satpass`)
- `KAFKA_SERVERS` (Default: `localhost:9092`)
- `CLASSIFICATION_SERVICE_URL` (Default: `http://localhost:8000`)
- `CLASSIFICATION_THRESHOLD` (Default: `0.15`)

### 🏃 Running the Application
From the root of the `change-detection-service` directory, execute:

```bash
mvn spring-boot:run
```

Alternatively, compile a production `.jar` and run it:
```bash
mvn clean package -DskipTests
java -jar target/change-detection-service-0.0.1-SNAPSHOT.jar
```

The application will bind by default to `http://localhost:8082`.

---

## 🌐 REST API Endpoints

The API is mounted at the `/change` prefix.

### 1. Fetch Change Records by Field
Retrieves a list of all historical `ChangeRecord` events associated with a given field. (Note: The `date1` and `date2` path variables are included to satisfy the frontend routing specification but are bypassed on the backend in favor of returning the complete field history).

**Endpoint**: `GET /change/{fieldId}/{date1}/{date2}`  

**Example Request**:
```bash
curl -X GET http://localhost:8082/change/84d0086e-1c2c-4e66-b7e1-6853f7c317b3/2024-01-01/2024-02-01
```

**Successful Response** (`200 OK`):
```json
[
  {
    "id": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
    "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
    "date1": "2024-01-01",
    "date2": "2024-01-21",
    "deltaArray": "[-0.1, 0.45, ...]",
    "changedPixelPct": 45.2,
    "status": "PROCESSED",
    "createdAt": "2024-02-14T10:23:45.123"
  }
]
```

### 2. Fetch Isolated Change Record
Fetches the exact state of a single job.

**Endpoint**: `GET /change/delta/{jobId}`  

**Example Request**:
```bash
curl -X GET http://localhost:8082/change/delta/9b12a23e-4d56-4c88-a7f1-8292c3a111b1
```

**Successful Response** (`200 OK`):
Returns the isolated `ChangeRecord` object matching the response shape above. If the UUID does not exist, returns a standard `404 Not Found`.

---

## 📡 Kafka Flow

### 1. Consumption (`satellite.ingest`)
The service listens to the `change-detection-group` on the ingestion topic. 
It expects a map payload containing `fieldId`, `date1`, `date2`, and `ndviDeltaPath` (which operates as a direct carrier for the JSON array). 

### 2. Production (`satellite.change`)
After synchronously pinging the `classification-service` via REST, the orchestrator determines the **Severity Level**:
- **CRITICAL**: Crop Stress > 20%
- **POSITIVE**: Crop Growth > 30%
- **MODERATE**: All other ranges

It then publishes the finalized evaluation downstream:
```json
{
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "changeRecordId": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
  "changedPct": 45.2,
  "severity": "CRITICAL"
}
```

---

## 🗄️ Database Schema

The service generates two tables automatically.

### Table: `change_records`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, Not Null | Unique identifier |
| `field_id` | `UUID` | Not Null | Foreign reference to field |
| `date1` | `DATE` | Not Null | Initial observation bound |
| `date2` | `DATE` | Not Null | Secondary observation bound |
| `delta_array` | `JSONB` | Nullable | Native Postgres JSON wrapper for the double array |
| `changed_pixel_pct` | `DOUBLE PRECISION` | Not Null | The calculated % of pixels over the threshold |
| `status` | `VARCHAR` | Not Null | Standardized to `PROCESSED` |
| `created_at` | `TIMESTAMP` | Not Null | Creation timestamp |

### Table: `classifications`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, Not Null | Unique identifier |
| `change_id` | `UUID` | Not Null | Relational mapping to the parent `ChangeRecord` |
| `crop_growth_pct` | `DOUBLE PRECISION`| Nullable | Result from the ML model |
| `crop_stress_pct` | `DOUBLE PRECISION`| Nullable | Result from the ML model |
| `no_change_pct` | `DOUBLE PRECISION`| Nullable | Result from the ML model |
| `raw_result` | `JSONB` | Nullable | Full serialized response from the Python API |

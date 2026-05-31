# Satellite Change Detection: Ingestion Service

The **Ingestion Service** serves as the primary entry point for the agricultural change detection platform. It is a highly asynchronous Spring Boot microservice responsible for orchestrating the retrieval of Earth Engine satellite imagery, tracking the lifecycle of background data-fetching jobs, and triggering downstream ML analysis via Kafka events.

---

## 🏗️ Architecture & Responsibilities

1. **REST API Gateway**: Exposes endpoints to trigger satellite data fetching over a designated Area of Interest (AOI) and date ranges.
2. **Asynchronous Orchestration**: Tracks job statuses (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) within PostgreSQL.
3. **Google Earth Engine Integration**: Interacts natively with the Python-based `classification-service` via `ProcessBuilder` to securely invoke `gee_fetch.py` and stream NDVI array calculations back into Java.
4. **Kafka Event Producer**: Once a satellite fetching job completes, it broadcasts the payload containing the multi-pixel NDVI array directly onto the `satellite.ingest` Kafka topic for downstream evaluation.

---

## 🚀 Getting Started

### Prerequisites
To run this service locally, you must have the following dependencies available:
- **Java 17+**
- **Maven**
- **PostgreSQL** (running on `localhost:5432`)
- **Apache Kafka & Zookeeper** (running on `localhost:9092`)
- **Python 3.10+** (with Earth Engine dependencies configured)

### 🛠️ Configuration
The service connects to its dependencies via `src/main/resources/application.yml`. You can override the defaults using the following environment variables:

- `PORT` (Default: `8081`)
- `DB_URL` (Default: `jdbc:postgresql://localhost:5432/satdb`)
- `DB_USER` (Default: `postgres`)
- `DB_PASSWORD` (Default: `satpass`)
- `KAFKA_SERVERS` (Default: `localhost:9092`)
- `GEE_SCRIPT_PATH` (Absolute path to `gee_fetch.py`)
- `PYTHON_VENV_PATH` (Absolute path to the Python environment)

### 🏃 Running the Application
From the root of the `ingestion-service` directory, execute:

```bash
mvn spring-boot:run
```

Alternatively, compile a production `.jar` and run it:
```bash
mvn clean package -DskipTests
java -jar target/ingestion-service-0.0.1-SNAPSHOT.jar
```

The application will bind by default to `http://localhost:8081`.

---

## 🌐 REST API Endpoints

The API is mounted at the `/ingest` prefix.

### 1. Trigger an Ingestion Job
Accepts bounding box coordinates and date ranges, spins up an asynchronous background thread to interact with Google Earth Engine, and immediately returns the job ID for tracking.

**Endpoint**: `POST /ingest/trigger`  
**Content-Type**: `application/json`

**Example Request**:
```bash
curl -X POST http://localhost:8081/ingest/trigger \
-H "Content-Type: application/json" \
-d '{
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "lonMin": 76.9,
  "latMin": 13.3,
  "lonMax": 77.1,
  "latMax": 13.5,
  "date1": "2024-01-06",
  "date2": "2024-01-21"
}'
```

**Successful Response** (`202 Accepted`):
```json
{
  "id": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "status": "PENDING",
  "date1": "2024-01-06",
  "date2": "2024-01-21",
  "ndviDeltaJson": null,
  "errorMessage": null
}
```

---

### 2. Check Job Status
Retrieves the real-time status of a triggered ingestion job.

**Endpoint**: `GET /ingest/status/{jobId}`  
**Parameters**: `jobId` (UUID) - The ID returned from the trigger endpoint.

**Example Request**:
```bash
curl -X GET http://localhost:8081/ingest/status/9b12a23e-4d56-4c88-a7f1-8292c3a111b1
```

**Successful Response** (`200 OK` - Processing):
```json
{
  "id": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
  "status": "PROCESSING",
  "errorMessage": null
}
```

**Successful Response** (`200 OK` - Completed):
```json
{
  "id": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
  "status": "COMPLETED",
  "ndviDeltaJson": "{\"ndvi_delta\": [0.12, -0.05, 0.22, ...]}",
  "errorMessage": null
}
```

---

## 📡 Kafka Event Production

This service acts as a primary **Producer** within the Kafka ecosystem. 

**Topic**: `satellite.ingest`  

Once `gee_fetch.py` executes successfully, the service parses the resulting output and packages it onto the Kafka bus.

### Outbound Payload Format:
```json
{
  "jobId": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "date1": "2024-01-06",
  "date2": "2024-01-21",
  "ndviDeltaPath": "{\"ndvi_delta\": [0.12, -0.05, 0.22, ...]}"
}
```
*(Note: `ndviDeltaPath` contains the raw JSON string natively inside the payload to prevent localized file-system state lockups).*

---

## 🗄️ Database Schema

The service relies on the `ingest_jobs` table, tracked automatically by Flyway migrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | Primary Key, Not Null | Auto-generated unique identifier |
| `field_id` | `UUID` | Not Null | Reference to the targeted field |
| `status` | `VARCHAR` | Not Null | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `date1` | `VARCHAR` | Not Null | Initial bound date |
| `date2` | `VARCHAR` | Not Null | Secondary bound date |
| `ndvi_delta_json` | `TEXT` | Nullable | Stores the raw JSON response from GEE |
| `error_message` | `TEXT` | Nullable | Records stack traces for FAILED jobs |

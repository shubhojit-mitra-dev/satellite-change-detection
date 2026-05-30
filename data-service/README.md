# Satellite Change Detection - Data Service

The `data-service` is the foundational persistence layer of the Satellite Change Detection system. Built with **Spring Boot 3** and **Java 17**, it provides a robust REST API for managing spatial data, satellite passes, classification results, and alerts. It interfaces directly with a **PostgreSQL + PostGIS** database to handle advanced GIS functionality.

## 🚀 Features
- **Spatial Data Handling:** Uses `hibernate-spatial` and JTS Topology Suite to interact with PostGIS `geometry` types.
- **JSONB Native Support:** Maps PostgreSQL `JSONB` columns natively to structured entities using `@JdbcTypeCode(SqlTypes.JSON)`.
- **Stateless REST API:** Clean architecture with strictly separated Controllers, Services, and Repositories.
- **Database Safety:** Uses `ddl-auto: validate` to ensure the application never unintentionally mutates the production database schema defined in `infra/docker/init.sql`.

---

## 🛠 Tech Stack
- **Java 17**
- **Spring Boot 3.4.x** (Web, Data JPA)
- **PostgreSQL 15.4** (with PostGIS extension)
- **Hibernate Spatial** (PostgisPG95Dialect)
- **HikariCP** (Connection Pooling)
- **Lombok** (Boilerplate reduction)

---

## 📦 Entity Architecture

The service maps directly to the 5 core tables defined in the infrastructure schema:

1. **`Field`**: Agricultural Areas of Interest (AOIs). Contains a PostGIS `Geometry` boundary.
2. **`SatellitePass`**: Individual Sentinel-2 image captures with associated cloud cover and NDVI GeoJSON metadata.
3. **`ChangeRecord`**: Calculated temporal differences between two `SatellitePass` dates. Stores delta arrays as JSONB.
4. **`Classification`**: Machine-learning generated breakdown (crop growth, crop stress, no change) linked to a `ChangeRecord`.
5. **`Alert`**: System-generated alerts indicating high-severity stress or anomalies in a given field.

*Note on Spatial Serialization:* The `Field` entity's `boundary` geometry is annotated with `@JsonIgnore` to prevent Jackson serialization loops. The raw geometry is maintained internally for spatial operations, but the REST API cleanly returns the ID, name, and timestamps.

---

## ⚙️ Setup & Installation

### Prerequisites
- **Java 17** installed
- **Maven 3.8+** installed
- PostgreSQL/PostGIS database running locally on port `5432` (via Docker).

### Configuration
Database credentials and server settings are managed in `src/main/resources/application.yml`. 
By default, it expects:
- **URL**: `jdbc:postgresql://localhost:5432/satdb`
- **User**: `postgres`
- **Pass**: `satpass`
- **Port**: `8084`

*(Refer to the root `secrets.md` for production environment variable overrides).*

### Building the Service
```bash
# Clean and package the application (skipping tests)
mvn clean package -DskipTests
```

### Running the Service
```bash
# Start the Spring Boot application
mvn spring-boot:run
```
You should see: `Started DataServiceApplication in X seconds`

---

## 📡 API Reference & Usage

Below are the exposed endpoints with example `curl` requests to test the system.

### 1. Fields API

#### Get All Fields
Retrieves all registered agricultural fields.
```bash
curl -s http://localhost:8084/fields | jq
```
**Example Response:**
```json
[
  {
    "id": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
    "name": "Tumkur Agricultural Zone",
    "createdAt": "2026-05-30T17:03:52.904124"
  }
]
```

#### Create a New Field
Registers a new agricultural field (boundary data is handled via internal DB seeding).
```bash
curl -X POST http://localhost:8084/fields \
  -H "Content-Type: application/json" \
  -d '{"name": "Hassan Test Farm"}' | jq
```
**Example Response:**
```json
{
  "id": "9a9a49c7-4058-4639-b4c5-3c66b74e34f2",
  "name": "Hassan Test Farm",
  "createdAt": "2026-05-31T02:32:47.539894"
}
```

### 2. Satellite Passes (NDVI) API

#### Get Passes by Field ID
Retrieves all ingested Sentinel-2 passes for a specific field.
```bash
curl -s http://localhost:8084/ndvi/<FIELD_UUID> | jq
```

### 3. Alerts API

#### Get Alerts by Field ID
Retrieves all generated alerts for a specific field.
```bash
curl -s http://localhost:8084/alerts/<FIELD_UUID> | jq
```

#### Acknowledge an Alert
Marks a specific alert as acknowledged (resolved/viewed).
```bash
curl -X POST http://localhost:8084/alerts/acknowledge/<ALERT_UUID> | jq
```

---

## 🔄 Integration Context
This service operates as the single source of truth for the database.
- The **Ingestion Service** communicates with this API to persist new NDVI passes and trigger the change-detection workflow.
- The **Alert Service** (and eventual frontend dashboards) consumes these endpoints to display metrics and notify stakeholders.

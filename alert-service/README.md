# Satellite Change Detection: Alert Service

The **Alert Service** is a lightweight, robust Spring Boot microservice responsible for orchestrating human-readable notifications based on agricultural changes detected via satellite imagery. 

It acts as the final step in the data pipeline: listening to asynchronous ML classification results via Apache Kafka, evaluating the severity of the detected changes, persisting them to PostgreSQL, and exposing RESTful endpoints for frontend applications to display and acknowledge these alerts.

---

## 🏗️ Architecture & Responsibilities

1. **Kafka Event Consumer**: Listens asynchronously to the `satellite.change` topic.
2. **Alert Formatting**: Generates specific, human-readable notifications (e.g., `"CRITICAL: Crop stress detected in field. 45.2% of pixels show significant decline."`).
3. **Data Persistence**: Uses Spring Data JPA and Hibernate to store generated alerts in a highly relational structure within PostgreSQL.
4. **REST API Exposure**: Provides a RESTful controller to fetch historical alerts per field and securely acknowledge (dismiss) active ones.

---

## 🚀 Getting Started

### Prerequisites
To run this service locally, you must have the following dependencies available:
- **Java 17+**
- **Maven** (or use the provided Maven wrapper `mvnw`)
- **PostgreSQL** (running on `localhost:5432`)
- **Apache Kafka & Zookeeper** (running on `localhost:9092`)

### 🛠️ Configuration
The service connects to its dependencies via `src/main/resources/application.yml`. If you need to override the defaults for local testing, you can inject the following environment variables:

- `PORT` (Default: `8083`)
- `DB_URL` (Default: `jdbc:postgresql://localhost:5432/satdb`)
- `DB_USER` (Default: `postgres`)
- `DB_PASSWORD` (Default: `satpass`)
- `KAFKA_SERVERS` (Default: `localhost:9092`)

### 🏃 Running the Application
From the root of the `alert-service` directory, execute:

```bash
mvn spring-boot:run
```

Alternatively, compile a production `.jar` and run it:
```bash
mvn clean package -DskipTests
java -jar target/alert-service-0.0.1-SNAPSHOT.jar
```

The application will bind by default to `http://localhost:8083`.

---

## 📡 Kafka Event Integration

This service operates as a pure **Consumer** within the Kafka ecosystem. 

**Topic**: `satellite.change`  
**Group ID**: `alert-group`

When the Change Detection Service finishes analyzing an ingestion job, it publishes a JSON payload. The Alert Service automatically deserializes this into a `java.util.HashMap` and processes it:

### Expected Inbound Payload format:
```json
{
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "changeRecordId": "9b12a23e-4d56-4c88-a7f1-8292c3a111b1",
  "changedPct": 45.2,
  "severity": "CRITICAL"
}
```

The service matches the `severity` to a string template, generates the final message, and commits it securely to the database.

---

## 🌐 REST API Endpoints

The API is mounted at the `/alerts` prefix.

### 1. Fetch Alerts by Field
Retrieves the entire history of alerts associated with a specific geographic field.

**Endpoint**: `GET /alerts/{fieldId}`  
**Parameters**: `fieldId` (UUID) - The ID of the field.

**Example Request**:
```bash
curl -X GET http://localhost:8083/alerts/84d0086e-1c2c-4e66-b7e1-6853f7c317b3
```

**Successful Response** (`200 OK`):
```json
[
  {
    "id": "e47b11d9-5672-4d22-83fc-361922055621",
    "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
    "severity": "CRITICAL",
    "message": "CRITICAL: Crop stress detected in field. 45.20% of pixels show significant decline. (ChangeRecord ID: 9b12a23e...)",
    "acknowledged": false,
    "createdAt": "2024-02-14T10:23:45.123"
  },
  {
    "id": "a17b22c8-1122-4f33-88bb-123412055111",
    "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
    "severity": "POSITIVE",
    "message": "POSITIVE: Strong crop growth detected. 31.40% of pixels show significant improvement.",
    "acknowledged": true,
    "createdAt": "2024-01-10T08:15:22.000"
  }
]
```

---

### 2. Acknowledge an Alert
Marks an alert as seen/acknowledged by the user, flipping the `acknowledged` boolean flag to `true`.

**Endpoint**: `POST /alerts/acknowledge/{id}`  
**Parameters**: `id` (UUID) - The specific ID of the generated alert.

**Example Request**:
```bash
curl -X POST http://localhost:8083/alerts/acknowledge/e47b11d9-5672-4d22-83fc-361922055621
```

**Successful Response** (`200 OK`):
```json
{
  "id": "e47b11d9-5672-4d22-83fc-361922055621",
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "severity": "CRITICAL",
  "message": "CRITICAL: Crop stress detected in field. 45.20% of pixels show significant decline.",
  "acknowledged": true,
  "createdAt": "2024-02-14T10:23:45.123"
}
```

**Failure Response** (`404 Not Found`):
If the UUID provided does not exist in the database, the service will return a 404 with an empty body.

---

## 🗄️ Database Schema

The service relies on the `alerts` table. Schema structure:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | Primary Key, Not Null | Auto-generated unique identifier |
| `field_id` | `UUID` | Not Null | Foreign reference to the targeted field |
| `severity` | `VARCHAR` | Not Null | `CRITICAL`, `POSITIVE`, or `MODERATE` |
| `message` | `TEXT` | Nullable | Human-readable alert notification text |
| `acknowledged` | `BOOLEAN` | Not Null, Default `false` | Status toggle for user interaction |
| `created_at` | `TIMESTAMP` | Not Null | Time the alert was intercepted from Kafka |

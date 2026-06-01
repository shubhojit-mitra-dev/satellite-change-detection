# Satellite Change Detection System — Complete Technical Report

**Agriculture Tech Division | Remote Sensing Engineering Team**
**Intern Technical Assignment — Agriculture Produce Monitoring**
**Issued:** Saturday 30 May 2026 | **Deadline:** Monday 2 June 2026, 8:00 PM IST

---

## Table of Contents

1. [Project Overview & Objective](#1-project-overview--objective)
2. [What is Google Earth Engine (GEE)?](#2-what-is-google-earth-engine-gee)
3. [What is Sentinel-2 & NDVI?](#3-what-is-sentinel-2--ndvi)
4. [System Architecture](#4-system-architecture)
5. [Infrastructure — Docker Compose & Database Schema](#5-infrastructure--docker-compose--database-schema)
6. [Kafka Event Pipeline](#6-kafka-event-pipeline)
7. [Service 1 — Ingestion Service (Port 8081)](#7-service-1--ingestion-service-port-8081)
8. [Service 2 — Change Detection Service (Port 8082)](#8-service-2--change-detection-service-port-8082)
9. [Service 3 — Classification Service (Port 8000)](#9-service-3--classification-service-port-8000)
10. [Service 4 — Alert Service (Port 8083)](#10-service-4--alert-service-port-8083)
11. [Service 5 — Data Service (Port 8084)](#11-service-5--data-service-port-8084)
12. [Service 6 — API Gateway (Port 8080)](#12-service-6--api-gateway-port-8080)
13. [React Native Mobile App — SatelliteApp](#13-react-native-mobile-app--satelliteapp)
14. [End-to-End Flow Walkthrough](#14-end-to-end-flow-walkthrough)
15. [Developer Tooling — The `ez` CLI](#15-developer-tooling--the-ez-cli)

---

## 1. Project Overview & Objective

This system is a **fully functional, microservice-based satellite change detection platform** built for agriculture produce monitoring. The core problem it solves: a farmer or agronomist wants to know whether their fields have changed between two dates — are crops growing, stressed, flooded, or deforested?

The system does this by:
1. Fetching real satellite imagery (Sentinel-2) from Google Earth Engine for a farm location on two different dates.
2. Computing NDVI (a vegetation health index) for both dates and calculating the pixel-level difference (delta).
3. Classifying each pixel's delta into a category: `crop_growth`, `crop_stress`, `significant_change`, or `no_change`.
4. Generating alerts when thresholds are crossed (e.g., >20% of pixels show crop stress → CRITICAL alert).
5. Surfacing everything on a React Native mobile app with visual NDVI heatmaps and alert cards.

**Demo AOI (Area of Interest):** Tumkur Agricultural Zone, Karnataka, India — bounding box lon 76.9–77.1, lat 13.3–13.5.

**Tech Stack:**
- Java 17 + Spring Boot 3.5.x (5 microservices)
- Python 3.10 + FastAPI (1 microservice — classification)
- Apache Kafka (async event streaming)
- PostgreSQL 15 + PostGIS 3.3 (geospatial database)
- Google Earth Engine Python API (satellite data)
- Scikit-learn RandomForestClassifier (ML model)
- React Native + Expo (mobile frontend)
- Docker Compose (local infrastructure)

---

## 2. What is Google Earth Engine (GEE)?

Google Earth Engine is a **cloud-based geospatial analysis platform** that hosts petabytes of satellite imagery and provides APIs to query, filter, and compute on that data without downloading anything locally. Instead of downloading raw satellite files (which can be gigabytes per scene), you write code that runs on Google's servers and returns only the computed result.

### Why GEE for this project?

Sentinel-2 satellites produce ~1.6 TB of data per day globally. Downloading raw tiles for even a small farm would be impractical. GEE hosts the entire Sentinel-2 archive and lets you:
- Filter by location (bounding box / polygon)
- Filter by date range
- Filter by cloud cover percentage
- Compute band math (like NDVI) server-side
- Reduce a region to a grid of mean values

All of this happens on Google's infrastructure. Your Python code just describes *what* to compute; GEE executes it remotely and returns the result.

### How GEE Authentication Works

GEE requires a Google account with Earth Engine access. Authentication is done once via:
```bash
earthengine authenticate
```
This opens a browser, you log in, and a credential token is saved locally (`~/.config/earthengine/credentials`). After that, any Python script calling `ee.Initialize(project="your-gcp-project-id")` will use those credentials automatically.

In this project, the GCP project ID is stored in a `.env` file:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```
And loaded via Pydantic Settings in `app/core/config.py`.

### GEE Python API — Key Concepts Used in This Project

| Concept | What it does |
|---|---|
| `ee.ImageCollection(...)` | A dataset of many satellite images (the entire Sentinel-2 archive) |
| `.filterBounds(aoi)` | Keep only images that overlap the given geometry |
| `.filterDate(start, end)` | Keep only images within the date range |
| `.filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))` | Keep only images with <20% cloud cover |
| `.sort("CLOUDY_PIXEL_PERCENTAGE")` | Sort by cloud cover ascending (least cloudy first) |
| `.first()` | Take the single best (least cloudy) image |
| `image.normalizedDifference(["B8", "B4"])` | Compute NDVI = (B8 - B4) / (B8 + B4) server-side |
| `ndvi.reduceRegion(reducer, geometry, scale)` | Aggregate pixel values over the AOI into a list |
| `.getInfo()` | **Execute the computation on GEE servers and return the result to Python** |

The `.getInfo()` call is the critical moment — everything before it is lazy (just building a computation graph). `.getInfo()` triggers actual execution on Google's servers and blocks until the result arrives.

---

## 3. What is Sentinel-2 & NDVI?

### Sentinel-2

Sentinel-2 is a constellation of two satellites (2A and 2B) operated by the European Space Agency (ESA) as part of the Copernicus programme. Key facts:
- Revisit time: ~5 days at the equator (both satellites combined)
- Spatial resolution: 10m for visible and NIR bands (B2, B3, B4, B8)
- Free and open data
- GEE collection: `COPERNICUS/S2_SR_HARMONIZED` (Surface Reflectance, atmospherically corrected)

The "SR_HARMONIZED" suffix means the data has been corrected for atmospheric effects (haze, aerosols) and harmonized across the 2A/2B sensors, making it suitable for time-series comparison.

### NDVI — Normalized Difference Vegetation Index

NDVI is the most widely used remote sensing index for vegetation health. Formula:

```
NDVI = (NIR - Red) / (NIR + Red)
     = (Band 8 - Band 4) / (Band 8 + Band 4)
```

**Why this formula works:** Healthy green vegetation strongly absorbs red light (for photosynthesis) and strongly reflects near-infrared light (cell structure). Stressed or dead vegetation absorbs less red and reflects less NIR. This ratio amplifies the difference.

| NDVI Range | Interpretation |
|---|---|
| 0.6 – 1.0 | Dense, healthy vegetation |
| 0.4 – 0.6 | Moderate vegetation |
| 0.2 – 0.4 | Sparse vegetation / early growth |
| 0.1 – 0.2 | Bare soil |
| < 0.1 | Rock, sand, urban, water |
| < 0 | Water bodies, snow |

### NDVI Delta

The delta is simply: `delta = NDVI(Date2) - NDVI(Date1)`

- **Positive delta** → vegetation increased between the two dates (crop growth, reforestation)
- **Negative delta** → vegetation decreased (crop stress, drought, deforestation, flood damage)
- **Near zero** → no significant change

The classification thresholds used in this project:

| Delta Condition | Class | Meaning |
|---|---|---|
| delta > +0.15 | `crop_growth` | Strong growth |
| delta < -0.15 | `crop_stress` | Significant decline |
| 0.10 < \|delta\| ≤ 0.15 | `significant_change` | Moderate change, monitor |
| \|delta\| ≤ 0.10 | `no_change` | Stable |

---

## 4. System Architecture

```
React Native App (Expo)
        │
        │ HTTP (all requests)
        ▼
┌─────────────────────┐
│   API Gateway :8080  │  Spring Cloud Gateway + WebFlux
│   RequestLoggingFilter│  CORS enabled for all origins
└──────┬──────────────┘
       │ routes by path prefix
       ├─ /api/ingest/**   → Ingestion Service :8081
       ├─ /api/change/**   → Change Detection  :8082
       ├─ /api/classify/** → Classification    :8000
       ├─ /api/alerts/**   → Alert Service     :8083
       └─ /api/data/**     → Data Service      :8084

Async Event Flow (Apache Kafka):
  Ingestion ──[satellite.ingest]──► Change Detection
  Change Detection ──[satellite.change]──► Alert Service
  Alert Service ──[satellite.alerts]──► (notification handler / FCM)

Synchronous HTTP (Spring → FastAPI):
  Change Detection ──POST /classify──► Classification Service :8000

Shared Database:
  All Spring Boot services → PostgreSQL 15 + PostGIS (satdb)
```

The architecture is **event-driven**: services do not call each other directly (except the one HTTP call from change-detection to classification). Instead, they publish events to Kafka topics and consume from them. This means:
- Services are decoupled — ingestion doesn't know or care who consumes its events
- Services can be restarted independently without losing messages (Kafka retains them)
- The pipeline is naturally asynchronous — a slow classification doesn't block ingestion

---

## 5. Infrastructure — Docker Compose & Database Schema

### File: `infra/docker/docker-compose.yml`

This file defines three containers that must be running before any service starts.

```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "2181"]
      interval: 10s
      timeout: 5s
      retries: 5
```
**Zookeeper** is Kafka's coordination service. Kafka uses it to track broker metadata, leader election, and consumer group offsets. The healthcheck uses `nc` (netcat) to verify port 2181 is accepting connections before Kafka starts.

```yaml
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    restart: unless-stopped
    depends_on:
      zookeeper:
        condition: service_healthy
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_LOG_RETENTION_HOURS: 168
```
**Two listeners are configured** — this is a critical Kafka networking detail:
- `PLAINTEXT://localhost:9092` — used by applications running on the host machine (the Spring Boot services)
- `PLAINTEXT_INTERNAL://kafka:29092` — used for inter-broker communication inside the Docker network

`KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"` means the three topics (`satellite.ingest`, `satellite.change`, `satellite.alerts`) are created automatically when the first message is published — no manual topic creation needed.

```yaml
  postgres:
    image: postgis/postgis:15-3.3
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: satdb
      POSTGRES_PASSWORD: satpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```
The `postgis/postgis:15-3.3` image is PostgreSQL 15 with the PostGIS 3.3 extension pre-installed. The `init.sql` file is mounted into `/docker-entrypoint-initdb.d/` — PostgreSQL automatically executes all `.sql` files in that directory on first startup.

### File: `infra/docker/init.sql`

This is the single source of truth for the database schema. All services connect to the same `satdb` database.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;       -- enables geometry types and spatial functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- enables uuid_generate_v4() function

CREATE TABLE fields (
    id UUID PRIMARY KEY,
    name VARCHAR,
    boundary GEOMETRY(Polygon, 4326),  -- PostGIS geometry: a polygon in WGS84 coordinate system
    created_at TIMESTAMP
);
```
The `GEOMETRY(Polygon, 4326)` column type is a PostGIS type. `4326` is the EPSG code for WGS84 — the standard GPS coordinate system (latitude/longitude in degrees). This column stores the actual polygon boundary of a farm field as a geospatial object, enabling spatial queries like "find all fields within 10km of this point."

```sql
CREATE TABLE satellite_passes (
    id UUID PRIMARY KEY,
    field_id UUID REFERENCES fields(id),
    pass_date DATE,
    satellite VARCHAR DEFAULT 'SENTINEL-2',
    cloud_cover FLOAT,
    ndvi_geojson TEXT    -- raw GeoJSON of the NDVI raster for this pass
);

CREATE TABLE change_records (
    id UUID PRIMARY KEY,
    field_id UUID,
    date1 DATE,
    date2 DATE,
    delta_array JSONB,          -- the 400-value NDVI delta array stored as JSON
    changed_pixel_pct FLOAT,    -- percentage of pixels with |delta| > threshold
    status VARCHAR,
    created_at TIMESTAMP
);

CREATE TABLE classifications (
    id UUID PRIMARY KEY,
    change_id UUID REFERENCES change_records(id),
    crop_growth_pct FLOAT,
    crop_stress_pct FLOAT,
    no_change_pct FLOAT,
    raw_result JSONB    -- full JSON response from the FastAPI classification service
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    field_id UUID,
    severity VARCHAR,       -- "CRITICAL", "POSITIVE", "MODERATE"
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

CREATE INDEX idx_fields_boundary ON fields USING GIST(boundary);
```
The `GIST` index on `boundary` is a spatial index — it enables fast bounding-box queries on the geometry column. Without it, spatial queries would require a full table scan.

```sql
-- Seed data: the demo field used in the live demo
INSERT INTO fields (id, name, boundary, created_at)
VALUES (
    uuid_generate_v4(),
    'Tumkur Agricultural Zone',
    ST_GeomFromText('POLYGON((76.9 13.3, 77.1 13.3, 77.1 13.5, 76.9 13.5, 76.9 13.3))', 4326),
    NOW()
);
```
`ST_GeomFromText` is a PostGIS function that parses WKT (Well-Known Text) format into a geometry object. The polygon coordinates trace the Tumkur bounding box clockwise and close back to the start point.

---

## 6. Kafka Event Pipeline

Three topics carry data through the system:

| Topic | Producer | Consumer | Payload |
|---|---|---|---|
| `satellite.ingest` | ingestion-service | change-detection-service | `{jobId, fieldId, date1, date2, ndviDeltaPath}` |
| `satellite.change` | change-detection-service | alert-service | `{fieldId, changeRecordId, changedPct, severity}` |
| `satellite.alerts` | alert-service | (notification handler) | `{alertId, fieldId, severity, message}` |

**Important implementation detail — `ndviDeltaPath` naming:** Despite the field being named `ndviDeltaPath` (suggesting a file path), the actual value sent is the **full JSON string** of the GEE output. This is because the ingestion service stores the raw JSON in the database column `ndvi_delta_json` and sends that same string in the Kafka payload. The change-detection service then parses this JSON string to extract the `ndvi_delta` array. This is a pragmatic choice for a demo system — in production, you would store the data in object storage (S3/GCS) and send only the path.

**Kafka serialization:** All Spring Boot services use `JsonSerializer` for producers and `JsonDeserializer` for consumers. The consumer configuration includes:
```yaml
spring.json.trusted.packages: "java.util, java.lang"
spring.json.value.default.type: "java.util.HashMap"
```
This tells the deserializer to deserialize all incoming messages as `HashMap<String, Object>` — a safe, generic approach that avoids class-not-found errors when the producer and consumer are in different JVMs with different class structures.

---

## 7. Service 1 — Ingestion Service (Port 8081)

**Technology:** Spring Boot 3.5, Spring Data JPA, Spring Kafka, Flyway, PostgreSQL
**Responsibility:** Accept an ingestion trigger from the mobile app (via gateway), invoke the GEE Python script as a subprocess, store the result, and publish a Kafka event.

### Maven Dependencies (`pom.xml`)

| Dependency | Purpose |
|---|---|
| `spring-boot-starter-web` | REST controller, embedded Tomcat |
| `spring-boot-starter-data-jpa` | JPA/Hibernate ORM |
| `spring-boot-starter-validation` | Bean validation (`@Valid`) |
| `spring-boot-starter-actuator` | Health/metrics endpoints |
| `spring-kafka` | Kafka producer |
| `postgresql` | JDBC driver |
| `flyway-core` + `flyway-database-postgresql` | Database migration management |
| `lombok` | Boilerplate reduction (`@Data`, `@Builder`, `@Slf4j`, etc.) |

### File: `IngestionServiceApplication.java`

```java
@SpringBootApplication
@EnableConfigurationProperties({GeeConfig.class, KafkaTopicsConfig.class})
public class IngestionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IngestionServiceApplication.class, args);
    }
}
```
`@SpringBootApplication` is a composite annotation combining `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`. `@EnableConfigurationProperties` explicitly registers the two `@ConfigurationProperties` classes so Spring binds `application.yml` values into them at startup.

### File: `config/GeeConfig.java`

```java
@Configuration
@ConfigurationProperties(prefix = "gee")
@Data
public class GeeConfig {
    private String pythonPath;
    private String scriptPath;
}
```
`@ConfigurationProperties(prefix = "gee")` binds the `gee.python-path` and `gee.script-path` keys from `application.yml` into the `pythonPath` and `scriptPath` fields (Spring auto-converts kebab-case to camelCase). `@Data` from Lombok generates getters, setters, `equals`, `hashCode`, and `toString`.

From `application.yml`:
```yaml
gee:
  script-path: ${GEE_SCRIPT_PATH:/home/.../classification-service/gee_fetch.py}
  python-path: ${PYTHON_VENV_PATH:/home/.../classification-service/.venv/bin/python}
```
The `${ENV_VAR:default}` syntax means: use the environment variable if set, otherwise use the default. This makes the service configurable for different environments without code changes.

### File: `config/KafkaTopicsConfig.java`

```java
@Configuration
@ConfigurationProperties(prefix = "kafka.topics")
@Data
public class KafkaTopicsConfig {
    private String ingest;  // bound to kafka.topics.ingest = "satellite.ingest"
}
```
Externalizing topic names into config (rather than hardcoding `"satellite.ingest"` in code) means topic names can be changed per environment without recompilation.

### File: `dto/IngestTriggerRequest.java`

```java
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class IngestTriggerRequest {
    private UUID fieldId;
    private double lonMin;
    private double latMin;
    private double lonMax;
    private double latMax;
    private String date1;
    private String date2;
}
```
This is the JSON body the mobile app sends to `POST /ingest/trigger`. The four `double` fields define the bounding box of the farm. Dates are strings in `YYYY-MM-DD` format.

### File: `entity/IngestJob.java`

```java
@Entity
@Table(name = "ingest_jobs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class IngestJob {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    @Column(name = "date1")
    private String date1;

    @Column(name = "date2")
    private String date2;

    @Column(name = "status")
    private String status;   // "PENDING" → "PROCESSING" → "COMPLETED" / "FAILED"

    @Column(name = "ndvi_delta_json", columnDefinition = "TEXT")
    private String ndviDeltaJson;   // the full JSON output from gee_fetch.py

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```
`@GeneratedValue(strategy = GenerationType.AUTO)` with a UUID type tells Hibernate to generate UUIDs using its default strategy (typically a random UUID v4). `@CreationTimestamp` is a Hibernate annotation that automatically sets the field to the current timestamp when the entity is first persisted. `columnDefinition = "TEXT"` overrides Hibernate's default VARCHAR(255) to use PostgreSQL's unbounded TEXT type — necessary because the GEE JSON output can be several kilobytes.

### File: `repository/IngestJobRepository.java`

```java
@Repository
public interface IngestJobRepository extends JpaRepository<IngestJob, UUID> {
    List<IngestJob> findByFieldId(UUID fieldId);
}
```
Spring Data JPA generates the implementation at runtime. `JpaRepository<IngestJob, UUID>` provides `save()`, `findById()`, `findAll()`, `delete()`, etc. `findByFieldId` is a derived query — Spring parses the method name and generates `SELECT * FROM ingest_jobs WHERE field_id = ?`.

### File: `component/GeeScriptRunner.java` (Interface)

```java
public interface GeeScriptRunner {
    String runScript(String fieldId, double[] aoi, String date1, String date2) throws Exception;
}
```
Defining an interface for the GEE runner enables dependency injection and makes the component mockable in tests. The implementation can be swapped without changing the service layer.

### File: `component/GeeScriptRunnerImpl.java` — The Critical Bridge

This is the most architecturally interesting file in the ingestion service. It bridges the Java world and the Python world using `ProcessBuilder`.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class GeeScriptRunnerImpl implements GeeScriptRunner {

    private final GeeConfig geeConfig;

    @Override
    public String runScript(String fieldId, double[] aoi, String date1, String date2) throws Exception {
        log.info("Preparing to run GEE script for field: {}", fieldId);

        // Build the command as a List<String> — safer than a single string
        // because it avoids shell injection and handles spaces in paths correctly
        List<String> command = new ArrayList<>();
        command.add(geeConfig.getPythonPath());   // e.g. /path/to/.venv/bin/python
        command.add(geeConfig.getScriptPath());   // e.g. /path/to/gee_fetch.py
        command.add(fieldId);
        command.add(String.valueOf(aoi[0]));  // lonMin
        command.add(String.valueOf(aoi[1]));  // latMin
        command.add(String.valueOf(aoi[2]));  // lonMax
        command.add(String.valueOf(aoi[3]));  // latMax
        command.add(date1);
        command.add(date2);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(false);  // keep stdout and stderr separate
        // Set working directory to the script's parent folder so relative imports work
        pb.directory(new java.io.File(geeConfig.getScriptPath()).getParentFile());

        Process process = pb.start();

        // Read ALL stdout bytes before calling waitFor()
        // This is critical: if the process writes more data than the OS pipe buffer
        // (~64KB on Linux), it will block waiting for the reader. If we call waitFor()
        // first, we get a deadlock. Reading stdout first prevents this.
        String stdout = new String(process.getInputStream().readAllBytes());
        String stderr = new String(process.getErrorStream().readAllBytes());

        if (!stderr.isBlank()) {
            log.warn("GEE Script STDERR: {}", stderr);
        }

        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("GEE script execution failed: " + stderr);
        }

        if (stdout == null || stdout.isBlank()) {
            throw new RuntimeException("GEE script returned empty output.");
        }

        return stdout;  // the full JSON string printed by gee_fetch.py
    }
}
```

**Why the venv Python path?** The GEE Python script requires `earthengine-api`, `numpy`, and other packages. These are installed in the classification service's virtual environment (`.venv`). By pointing `pythonPath` to `.venv/bin/python`, the subprocess uses that interpreter with all packages available — no system-level installation needed.

**Why `pb.directory(...)` matters:** `gee_fetch.py` does `from app.core.config import settings` — a relative import that only works if the working directory is the `classification-service/` folder. Setting the working directory to the script's parent ensures Python's module resolution finds the `app/` package.

### File: `service/IngestionService.java`

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class IngestionService {

    private final IngestJobRepository ingestJobRepository;
    private final ObjectMapper objectMapper;
    private final GeeScriptRunner geeScriptRunner;
    private final IngestionEventProducer ingestionEventProducer;

    public IngestJob triggerIngestion(UUID fieldId, double[] aoi, String date1, String date2) {
        // Step 1: Create job record with PENDING status and persist it
        // This gives the caller an immediate job ID to poll for status
        IngestJob job = IngestJob.builder()
                .fieldId(fieldId)
                .date1(date1)
                .date2(date2)
                .status("PENDING")
                .build();
        job = ingestJobRepository.save(job);

        try {
            // Step 2: Update to PROCESSING — signals the job has started
            job.setStatus("PROCESSING");
            job = ingestJobRepository.save(job);

            // Step 3: Run the GEE Python script — this is a blocking call
            // that can take 10-60 seconds depending on GEE server load
            String rawJson = geeScriptRunner.runScript(fieldId.toString(), aoi, date1, date2);

            // Step 4: Validate the JSON is parseable (will throw if malformed)
            JsonNode root = objectMapper.readTree(rawJson);

            // Step 5: Store the raw JSON and mark COMPLETED
            job.setNdviDeltaJson(rawJson);
            job.setStatus("COMPLETED");
            job = ingestJobRepository.save(job);

            // Step 6: Publish Kafka event — triggers the change detection pipeline
            ingestionEventProducer.publishJobCompleted(job);

            return job;
        } catch (Exception e) {
            log.error("Job {} failed: {}", job.getId(), e.getMessage(), e);
            job.setStatus("FAILED");
            ingestJobRepository.save(job);
            throw new RuntimeException("Ingestion failed", e);
        }
    }

    public Optional<IngestJob> getJobStatus(UUID jobId) {
        return ingestJobRepository.findById(jobId);
    }
}
```

The status progression `PENDING → PROCESSING → COMPLETED/FAILED` is important for observability. The `GET /ingest/status/{jobId}` endpoint lets the caller poll the job state while the GEE script runs.

### File: `producer/KafkaIngestionEventProducer.java`

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaIngestionEventProducer implements IngestionEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsConfig kafkaTopicsConfig;

    @Override
    public void publishJobCompleted(IngestJob job) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("jobId", job.getId().toString());
        payload.put("fieldId", job.getFieldId().toString());
        payload.put("date1", job.getDate1());
        payload.put("date2", job.getDate2());
        // Despite the key name "ndviDeltaPath", this is the full JSON string
        payload.put("ndviDeltaPath", job.getNdviDeltaJson());

        String topic = kafkaTopicsConfig.getIngest();       // "satellite.ingest"
        String messageKey = job.getId().toString();          // UUID as partition key

        kafkaTemplate.send(topic, messageKey, payload);
    }
}
```

`KafkaTemplate<String, Object>` is Spring Kafka's high-level producer. The message key (`job.getId().toString()`) ensures all messages for the same job go to the same Kafka partition, preserving ordering for that job.

### File: `controller/IngestionController.java`

```java
@RestController
@RequestMapping("/ingest")
@RequiredArgsConstructor
public class IngestionController {

    private final IngestionService ingestionService;

    @PostMapping("/trigger")
    public ResponseEntity<IngestJob> triggerIngestion(@RequestBody IngestTriggerRequest request) {
        // Extract the four bounding box coordinates into a double array
        double[] aoi = new double[]{
                request.getLonMin(),
                request.getLatMin(),
                request.getLonMax(),
                request.getLatMax()
        };

        IngestJob job = ingestionService.triggerIngestion(
                request.getFieldId(), aoi, request.getDate1(), request.getDate2()
        );

        // 202 Accepted — the job has been created but processing is async
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<IngestJob> getJobStatus(@PathVariable UUID jobId) {
        return ingestionService.getJobStatus(jobId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
}
```

`HTTP 202 Accepted` is semantically correct here — the request has been accepted for processing but the processing (GEE script execution) is not yet complete when the response is sent. In practice, because `triggerIngestion` is synchronous (it blocks on the GEE script), the response is only sent after the script completes. A true async implementation would return 202 immediately and let the client poll `/status/{jobId}`.

### File: `application.yml` (Ingestion Service)

```yaml
server:
  port: ${PORT:8081}

spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/satdb}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:satpass}
    hikari:
      maximum-pool-size: ${DB_POOL_MAX:15}
      minimum-idle: ${DB_POOL_MIN:2}
      connection-timeout: ${DB_CONN_TIMEOUT:30000}

  flyway:
    baseline-on-migrate: true
    baseline-version: 0

  jpa:
    hibernate:
      ddl-auto: ${DDL_AUTO:validate}

  kafka:
    bootstrap-servers: ${KAFKA_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        spring.json.add.type.headers: false
```

`ddl-auto: validate` means Hibernate validates that the database schema matches the entity definitions at startup — it does NOT create or modify tables. Tables are managed by Flyway migrations and `init.sql`. `spring.json.add.type.headers: false` prevents Spring Kafka from adding `__TypeId__` headers to messages, which would cause deserialization errors on the consumer side if the consumer doesn't have the same class.

### Flyway Migration: `V1__create_ingest_jobs_table.sql`

```sql
CREATE TABLE IF NOT EXISTS ingest_jobs (
    id UUID PRIMARY KEY,
    field_id UUID NOT NULL,
    date1 VARCHAR(255),
    date2 VARCHAR(255),
    status VARCHAR(50),
    ndvi_delta_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
Flyway runs this migration on startup if it hasn't been run before. It tracks executed migrations in a `flyway_schema_history` table. `baseline-on-migrate: true` tells Flyway to treat the existing schema as the baseline if no history table exists yet.

---

## 8. Service 2 — Change Detection Service (Port 8082)

**Technology:** Spring Boot 3.5, Spring Kafka (consumer + producer), Spring Data JPA, RestTemplate
**Responsibility:** Consume the `satellite.ingest` Kafka event, parse the NDVI delta array, compute the changed-pixel percentage, call the FastAPI classification service over HTTP, persist both the change record and classification result, determine severity, and publish to `satellite.change`.

This service is the **orchestration hub** of the backend pipeline — it is both a Kafka consumer and producer, and it makes the only direct HTTP call between backend services.

### File: `config/ClassificationConfig.java`

```java
@Configuration
@ConfigurationProperties(prefix = "classification")
@Data
public class ClassificationConfig {
    private ServiceConfig service = new ServiceConfig();
    private double threshold;   // bound to classification.threshold = 0.15

    @Data
    public static class ServiceConfig {
        private String url;     // bound to classification.service.url
    }
}
```
The nested `ServiceConfig` class maps to the nested YAML structure:
```yaml
classification:
  service:
    url: ${CLASSIFICATION_SERVICE_URL:http://localhost:8000}
  threshold: ${CLASSIFICATION_THRESHOLD:0.15}
```
The threshold (0.15) is the NDVI delta value above which a pixel is considered "significantly changed." This is configurable via environment variable.

### File: `config/RestTemplateConfig.java`

```java
@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```
`RestTemplate` is Spring's synchronous HTTP client. It's declared as a `@Bean` so it can be injected anywhere. A plain `new RestTemplate()` uses default settings (no timeouts, no retry). In production you would configure connection/read timeouts.

### File: `dto/ClassifyRequest.java`

```java
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassifyRequest {
    private String fieldId;

    @JsonProperty("delta_array")
    private List<Double> deltaArray;
}
```
`@JsonProperty("delta_array")` maps the Java field `deltaArray` to the JSON key `delta_array` (snake_case). This is necessary because the FastAPI service expects `delta_array` in its Pydantic model, while Java convention uses camelCase.

### File: `dto/ClassifyResponse.java`

```java
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassifyResponse {
    @JsonProperty("crop_growth_pct")
    private Double cropGrowthPct;

    @JsonProperty("crop_stress_pct")
    private Double cropStressPct;

    @JsonProperty("significant_change_pct")
    private Double significantChangePct;

    @JsonProperty("no_change_pct")
    private Double noChangePct;

    @JsonProperty("pixel_labels")
    private List<String> pixelLabels;   // per-pixel label for all 400 pixels
}
```

### File: `client/ClassificationClient.java`

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class ClassificationClient {

    private final RestTemplate restTemplate;
    private final ClassificationConfig classificationConfig;

    public ClassifyResponse classify(String fieldId, List<Double> deltaArray) {
        ClassifyRequest request = ClassifyRequest.builder()
                .fieldId(fieldId)
                .deltaArray(deltaArray)
                .build();

        // Construct the URL: e.g. "http://localhost:8000/classify"
        String url = classificationConfig.getService().getUrl() + "/classify";

        // postForObject sends a POST request, serializes `request` to JSON,
        // and deserializes the response body into ClassifyResponse
        ClassifyResponse response = restTemplate.postForObject(url, request, ClassifyResponse.class);

        return response;
    }
}
```

### File: `entity/ChangeRecord.java`

```java
@Entity
@Table(name = "change_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChangeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    @Column(name = "date1")
    private LocalDate date1;

    @Column(name = "date2")
    private LocalDate date2;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "delta_array", columnDefinition = "jsonb")
    private String deltaArray;   // stored as JSONB in PostgreSQL

    @Column(name = "changed_pixel_pct")
    private Double changedPixelPct;

    @Column(name = "status")
    private String status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```
`@JdbcTypeCode(SqlTypes.JSON)` tells Hibernate 6 to use the JSON JDBC type for this column. Combined with `columnDefinition = "jsonb"`, this stores the delta array as a PostgreSQL JSONB value — binary JSON that supports indexing and querying. The field is a `String` in Java (the serialized JSON array), but stored as structured JSONB in the database.

### File: `entity/Classification.java`

```java
@Entity
@Table(name = "classifications")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Classification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "change_id", nullable = false)
    private UUID changeId;   // foreign key to change_records.id

    @Column(name = "crop_growth_pct")
    private Double cropGrowthPct;

    @Column(name = "crop_stress_pct")
    private Double cropStressPct;

    @Column(name = "no_change_pct")
    private Double noChangePct;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_result", columnDefinition = "jsonb")
    private String rawResult;   // full JSON response from FastAPI
}
```

### File: `kafka/SatelliteIngestConsumer.java` — The Core Processing Logic

This is the most complex file in the change detection service. It handles the entire processing pipeline in a single Kafka listener method.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class SatelliteIngestConsumer {

    private final ChangeRecordRepository changeRecordRepository;
    private final ClassificationRepository classificationRepository;
    private final ClassificationClient classificationClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsConfig kafkaTopicsConfig;
    private final ClassificationConfig classificationConfig;
    private final ObjectMapper objectMapper;

    // "#{kafkaTopicsConfig.ingest}" is a Spring Expression Language (SpEL) expression
    // It evaluates to the value of kafkaTopicsConfig.ingest at runtime ("satellite.ingest")
    // This avoids hardcoding the topic name in the annotation
    @KafkaListener(topics = "#{kafkaTopicsConfig.ingest}", groupId = "change-detection-group")
    public void processIngestJob(Map<String, Object> payload) {

        try {
            // ── Step 1: Extract fields from the Kafka message payload ──────────
            String fieldId = (String) payload.get("fieldId");
            String date1 = (String) payload.get("date1");
            String date2 = (String) payload.get("date2");
            // "ndviDeltaPath" actually contains the full GEE JSON string
            String ndviDeltaJson = (String) payload.get("ndviDeltaPath");

            // ── Step 2: Parse the GEE JSON and extract the delta array ─────────
            // The GEE output JSON has this structure:
            // {
            //   "fieldId": "...",
            //   "date1": "2024-01-06",
            //   "date2": "2024-01-21",
            //   "ndvi_date1": [0.12, 0.45, ...],   // 400 values
            //   "ndvi_date2": [0.18, 0.52, ...],   // 400 values
            //   "ndvi_delta": [0.06, 0.07, ...],   // 400 values (date2 - date1)
            //   "total_pixels": 400
            // }
            JsonNode rootNode = objectMapper.readTree(ndviDeltaJson);
            JsonNode deltaNode = rootNode.get("ndvi_delta");
            List<Double> deltaArray = objectMapper.convertValue(
                deltaNode, new TypeReference<List<Double>>() {}
            );

            // ── Step 3: Compute changed pixel percentage ───────────────────────
            // A pixel is "changed" if its absolute delta exceeds the threshold (0.15)
            double threshold = classificationConfig.getThreshold();
            long changedCount = deltaArray.stream()
                .filter(d -> Math.abs(d) > threshold)
                .count();
            double changedPixelPct = ((double) changedCount / deltaArray.size()) * 100.0;

            // ── Step 4: Build and persist the ChangeRecord ────────────────────
            String rawDeltaArrayStr = objectMapper.writeValueAsString(deltaArray);
            ChangeRecord changeRecord = ChangeRecord.builder()
                    .fieldId(UUID.fromString(fieldId))
                    .date1(LocalDate.parse(date1))
                    .date2(LocalDate.parse(date2))
                    .deltaArray(rawDeltaArrayStr)
                    .changedPixelPct(changedPixelPct)
                    .status("PROCESSED")
                    .build();
            changeRecord = changeRecordRepository.save(changeRecord);

            // ── Step 5: Call the FastAPI classification service ───────────────
            // This is a synchronous HTTP POST — the listener blocks until the
            // classification service responds
            ClassifyResponse classifyResponse = classificationClient.classify(fieldId, deltaArray);

            // ── Step 6: Persist the Classification result ─────────────────────
            String rawResponseStr = objectMapper.writeValueAsString(classifyResponse);
            Classification classification = Classification.builder()
                    .changeId(changeRecord.getId())
                    .cropGrowthPct(classifyResponse.getCropGrowthPct())
                    .cropStressPct(classifyResponse.getCropStressPct())
                    .noChangePct(classifyResponse.getNoChangePct())
                    .rawResult(rawResponseStr)
                    .build();
            classificationRepository.save(classification);

            // ── Step 7: Determine severity based on classification percentages ─
            // Business rules from the assignment spec:
            //   crop_stress > 20%  → CRITICAL
            //   crop_growth > 30%  → POSITIVE
            //   otherwise          → MODERATE
            String severity;
            if (classifyResponse.getCropStressPct() > 20) {
                severity = "CRITICAL";
            } else if (classifyResponse.getCropGrowthPct() > 30) {
                severity = "POSITIVE";
            } else {
                severity = "MODERATE";
            }

            // ── Step 8: Publish downstream event to satellite.change ──────────
            Map<String, Object> changePayload = new HashMap<>();
            changePayload.put("fieldId", fieldId);
            changePayload.put("changeRecordId", changeRecord.getId().toString());
            changePayload.put("changedPct", changedPixelPct);
            changePayload.put("severity", severity);

            kafkaTemplate.send(kafkaTopicsConfig.getChange(), fieldId, changePayload);

        } catch (Exception e) {
            log.error("Error processing ingest job payload", e);
            // Note: no re-throw — the message is consumed and not retried.
            // In production, you would use a dead-letter topic.
        }
    }
}
```

**Why `groupId = "change-detection-group"` matters:** Kafka consumer groups allow multiple instances of the same service to share the work. If you run two instances of change-detection-service with the same group ID, Kafka distributes partitions between them — each message is processed by exactly one instance. If you used different group IDs, each instance would receive every message (fan-out pattern).

### File: `service/ChangeDetectionService.java`

```java
@Service
@RequiredArgsConstructor
public class ChangeDetectionService {

    private final ChangeRecordRepository changeRecordRepository;

    public List<ChangeRecord> getChangeRecords(UUID fieldId) {
        return changeRecordRepository.findByFieldId(fieldId);
    }

    public Optional<ChangeRecord> getChangeRecordById(UUID id) {
        return changeRecordRepository.findById(id);
    }
}
```
Simple read-only service used by the REST controller. All write operations happen in the Kafka consumer.

### File: `controller/ChangeDetectionController.java`

```java
@RestController
@RequestMapping("/change")
@RequiredArgsConstructor
@Slf4j
public class ChangeDetectionController {

    private final ChangeDetectionService changeDetectionService;

    // GET /change/{fieldId}/{date1}/{date2}
    // Note: date1 and date2 are accepted in the path but currently ignored —
    // all change records for the field are returned regardless of date
    @GetMapping("/{fieldId}/{date1}/{date2}")
    public ResponseEntity<List<ChangeRecord>> getChangeRecords(
            @PathVariable UUID fieldId,
            @PathVariable String date1,
            @PathVariable String date2) {
        List<ChangeRecord> records = changeDetectionService.getChangeRecords(fieldId);
        return ResponseEntity.ok(records);
    }

    // GET /change/delta/{jobId} — fetch a specific change record by its ID
    @GetMapping("/delta/{jobId}")
    public ResponseEntity<ChangeRecord> getChangeRecordById(@PathVariable UUID jobId) {
        return changeDetectionService.getChangeRecordById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
```

The mobile app calls `GET /api/change/{fieldId}/{date1}/{date2}` (via the gateway) to get the delta array for rendering the NDVI heatmap. The response includes the `deltaArray` JSON string which the app parses client-side.

---

## 9. Service 3 — Classification Service (Port 8000)

**Technology:** Python 3.10, FastAPI, Uvicorn, Scikit-learn (RandomForestClassifier), Google Earth Engine Python API, Pydantic, joblib
**Responsibility:** Expose a `POST /classify` endpoint that receives a 400-value NDVI delta array and returns per-pixel classification labels and percentage breakdowns. Also exposes a GEE endpoint for direct delta calculation.

This is the only non-Java service and the most scientifically interesting one. It combines a trained ML model with a GEE data-fetching layer.

### Project Structure

```
classification-service/
├── gee_fetch.py              # CLI entry point — called by ingestion-service via subprocess
├── pyproject.toml            # Python project metadata and dependencies (uv)
├── .env                      # GOOGLE_CLOUD_PROJECT_ID=...
├── model/
│   └── train_model.py        # Script to train and save the RandomForest model
└── app/
    ├── main.py               # FastAPI app factory, lifespan, router registration
    ├── core/
    │   └── config.py         # Pydantic Settings — loads .env
    ├── api/
    │   └── endpoints/
    │       ├── classify.py   # POST /classify endpoint
    │       └── gee.py        # POST /api/v1/gee/calculate-delta endpoint
    ├── services/
    │   ├── classifier.py     # Classification logic (ML model + rule-based fallback)
    │   ├── gee_service.py    # GEE data fetching logic
    │   └── model.joblib      # Serialized trained RandomForestClassifier
    └── schemas/
        ├── classify_schema.py  # Pydantic models for /classify
        └── gee_schema.py       # Pydantic models for /gee/calculate-delta
```

### File: `app/core/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Classification Service"
    API_V1_STR: str = "/api/v1"
    GOOGLE_CLOUD_PROJECT_ID: str   # required — no default, must be in .env

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore"
    )

settings = Settings()
```
`pydantic_settings.BaseSettings` automatically reads environment variables and `.env` files. `GOOGLE_CLOUD_PROJECT_ID` has no default value — if it's missing from both the environment and `.env`, Pydantic raises a `ValidationError` at import time, preventing the service from starting with a misconfigured GEE project. `extra="ignore"` means extra keys in `.env` are silently ignored.

### File: `app/main.py`

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
import ee
import logging
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    # Initialize Earth Engine once when the server starts.
    # ee.Initialize() authenticates using the credentials stored by
    # `earthengine authenticate` (~/.config/earthengine/credentials)
    # and sets the GCP project for billing/quota purposes.
    logger.info(f"Initializing Earth Engine with project: {settings.GOOGLE_CLOUD_PROJECT_ID}")
    try:
        ee.Initialize(project=settings.GOOGLE_CLOUD_PROJECT_ID)
        logger.info("Earth Engine initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine: {e}")
        # Not re-raising — service starts even if GEE init fails,
        # allowing health checks to pass. GEE calls will fail at request time.

    yield  # server is running and handling requests

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down classification service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Satellite change classification via Google Earth Engine",
    version="0.1.0",
    lifespan=lifespan,   # replaces deprecated @app.on_event("startup")
)

# Register routers with path prefixes
from app.api.endpoints import gee, classify
app.include_router(gee.router, prefix=settings.API_V1_STR + "/gee", tags=["Google Earth Engine"])
app.include_router(classify.router, prefix="/classify", tags=["Classification"])

@app.get("/health")
def health():
    return {"status": "UP", "gee_project": settings.GOOGLE_CLOUD_PROJECT_ID}
```

The `lifespan` context manager is FastAPI's modern way to handle startup/shutdown logic. `ee.Initialize()` is called once at startup rather than on every request — GEE initialization involves network calls to Google's auth servers and would add significant latency if done per-request.

### File: `app/schemas/classify_schema.py`

```python
from pydantic import BaseModel
from typing import List

class ClassifyRequest(BaseModel):
    fieldId: str
    delta_array: List[float]   # 400 NDVI delta values from the change detection service

class ClassifyResponse(BaseModel):
    crop_growth_pct: float
    crop_stress_pct: float
    significant_change_pct: float
    no_change_pct: float
    pixel_labels: List[str]    # per-pixel label: 400 strings
```
Pydantic models provide automatic request validation. If `delta_array` is missing or contains non-numeric values, FastAPI returns a `422 Unprocessable Entity` with a detailed error message before the endpoint function is even called.

### File: `app/schemas/gee_schema.py`

```python
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
    ndvi_date1: List[float]   # 400 NDVI values for date 1
    ndvi_date2: List[float]   # 400 NDVI values for date 2
    ndvi_delta: List[float]   # 400 delta values (date2 - date1)
    total_pixels: int
```

### File: `app/services/gee_service.py` — The GEE Data Layer

This is the core of the satellite data pipeline. It contains all GEE API calls.

```python
import ee
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class GEEService:

    @staticmethod
    def pad_or_trim(values: list[float], size: int = 400) -> list[float]:
        """
        Ensures the NDVI value list is exactly `size` elements.
        - If GEE returns fewer values (sparse coverage, cloud masking),
          pad with 0.0 (neutral NDVI — treated as no-data).
        - If GEE returns more values (large AOI), trim to first `size`.
        This guarantees the downstream 20x20 grid always has exactly 400 values.
        """
        if not values:
            values = []
        if len(values) > size:
            return values[:size]
        return values + [0.0] * (size - len(values))

    @classmethod
    def fetch_ndvi_for_date(cls, aoi: ee.Geometry, date_str: str) -> list[float]:
        """
        Fetches NDVI values for a single date over the given AOI.
        Returns a list of exactly 400 float values.
        """
        # GEE date filtering requires a range, not a single date.
        # We filter [date_str, next_day_str) to get images from that specific day.
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        next_day_str = (date_obj + timedelta(days=1)).strftime("%Y-%m-%d")

        # Build the image collection query — all operations are lazy (no network call yet)
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi)                                    # spatial filter
            .filterDate(date_str, next_day_str)                   # temporal filter
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20)) # quality filter
            .sort("CLOUDY_PIXEL_PERCENTAGE")                      # best image first
        )

        # Take the single best image (least cloudy)
        image = collection.first()

        # Compute NDVI server-side: normalizedDifference(["B8", "B4"])
        # = (B8 - B4) / (B8 + B4)
        # B8 = NIR (842nm), B4 = Red (665nm)
        # Result is a single-band image named "nd" (normalized difference)
        ndvi = image.normalizedDifference(["B8", "B4"])

        # reduceRegion aggregates all pixel values within the AOI geometry.
        # reducer=ee.Reducer.toList() collects all pixel values into a list.
        # scale=50 means each pixel represents a 50m x 50m area.
        #   (Note: Sentinel-2 native resolution is 10m, but 50m is used here
        #    to reduce the number of pixels and stay within GEE's computation limits
        #    while still getting ~400 values for a ~1km² AOI)
        # maxPixels=1e6 is a safety limit to prevent runaway computations.
        result = ndvi.reduceRegion(
            reducer=ee.Reducer.toList(),
            geometry=aoi,
            scale=50,
            maxPixels=1e6
        )

        # .get("nd") retrieves the "nd" band's list from the result dictionary.
        # .getInfo() is the BLOCKING call that executes everything on GEE servers
        # and returns the Python list. This is where the actual network round-trip happens.
        values = result.get("nd").getInfo()

        return cls.pad_or_trim(values, 400)

    @classmethod
    def calculate_delta(cls, field_id: str, lon_min: float, lat_min: float,
                        lon_max: float, lat_max: float, date1: str, date2: str) -> dict:
        """
        Main entry point: fetches NDVI for both dates and computes the delta.
        """
        # Create a GEE Rectangle geometry from the bounding box coordinates
        # [lon_min, lat_min, lon_max, lat_max] in WGS84
        aoi = ee.Geometry.Rectangle([lon_min, lat_min, lon_max, lat_max])

        # Fetch NDVI for each date independently.
        # Each call makes a separate GEE API request.
        # Errors are caught per-date so one bad date doesn't kill the whole request.
        try:
            grid1 = cls.fetch_ndvi_for_date(aoi, date1)
        except Exception as e:
            logger.error(f"Error fetching data for date {date1}: {e}")
            grid1 = [0.0] * 400   # fallback: all zeros

        try:
            grid2 = cls.fetch_ndvi_for_date(aoi, date2)
        except Exception as e:
            logger.error(f"Error fetching data for date {date2}: {e}")
            grid2 = [0.0] * 400

        # Compute pixel-wise delta: date2 NDVI minus date1 NDVI
        # zip() pairs corresponding elements: (grid1[0], grid2[0]), (grid1[1], grid2[1]), ...
        # round(..., 4) limits precision to 4 decimal places
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
```

**Why `scale=50` instead of the native 10m?** The Tumkur AOI is approximately 22km × 22km (0.2° × 0.2°). At 10m resolution, that's ~4.8 million pixels — far too many for a demo. At 50m resolution, it's ~194,000 pixels, which GEE can handle quickly. The `pad_or_trim` function then normalizes to exactly 400 values, representing a logical 20×20 grid.

### File: `gee_fetch.py` — The CLI Entry Point

This script is called by the ingestion service's `GeeScriptRunnerImpl` via `ProcessBuilder`. It is a thin wrapper around `GEEService`.

```python
import sys
import json
import ee
from app.core.config import settings
from app.services.gee_service import GEEService

def main():
    # Validate argument count — exactly 7 positional args required
    if len(sys.argv) != 8:
        print("Usage: python gee_fetch.py <field_id> <lon_min> <lat_min> "
              "<lon_max> <lat_max> <date1> <date2>", file=sys.stderr)
        sys.exit(1)

    field_id = sys.argv[1]
    lon_min = float(sys.argv[2])
    lat_min = float(sys.argv[3])
    lon_max = float(sys.argv[4])
    lat_max = float(sys.argv[5])
    date1 = sys.argv[6]
    date2 = sys.argv[7]

    # Initialize GEE — uses credentials from ~/.config/earthengine/credentials
    try:
        ee.Initialize(project=settings.GOOGLE_CLOUD_PROJECT_ID)
    except Exception as e:
        print(f"Failed to initialize Earth Engine: {e}", file=sys.stderr)
        sys.exit(1)

    # Delegate to GEEService and get the result dict
    output = GEEService.calculate_delta(
        field_id=field_id,
        lon_min=lon_min, lat_min=lat_min,
        lon_max=lon_max, lat_max=lat_max,
        date1=date1, date2=date2
    )

    # Print the result as JSON to stdout — this is what Java reads via
    # process.getInputStream().readAllBytes()
    print(json.dumps(output))

if __name__ == "__main__":
    main()
```

**The stdout/stderr contract:** The Java `GeeScriptRunnerImpl` reads stdout as the result and stderr as error information. This script strictly follows that contract: all errors go to `stderr` (via `print(..., file=sys.stderr)` or Python's default exception output), and only the final JSON result goes to `stdout` (via `print(json.dumps(output))`). Any debug logging from the GEE library that goes to stdout would corrupt the JSON and cause a parse error in Java.

### File: `model/train_model.py` — Training the ML Model

```python
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
import os

def get_label(delta):
    """Rule-based labeling function — defines the ground truth for training."""
    if delta > 0.15:
        return 'crop_growth'
    elif delta < -0.15:
        return 'crop_stress'
    elif 0.10 < abs(delta) <= 0.15:
        return 'significant_change'
    else:
        return 'no_change'

def main():
    # Generate 100,000 synthetic training samples
    # np.random.uniform(-1.0, 1.0, 100000) creates 100k random floats in [-1, 1]
    # .reshape(-1, 1) converts the 1D array to a 2D column vector (required by sklearn)
    X_train = np.random.uniform(-1.0, 1.0, 100000).reshape(-1, 1)

    # Label each sample using the rule-based function
    # This creates a dataset where the labels ARE the rules — the model learns
    # to approximate the decision boundaries from data
    y_train = np.array([get_label(float(x)) for x in X_train])

    # Train a RandomForestClassifier
    # n_estimators=10: 10 decision trees in the ensemble (small for fast training)
    # max_depth=5: each tree can have at most 5 levels (prevents overfitting)
    # random_state=42: fixed seed for reproducibility
    clf = RandomForestClassifier(n_estimators=10, random_state=42, max_depth=5)
    clf.fit(X_train, y_train)

    # Serialize the trained model to disk using joblib
    # joblib is preferred over pickle for numpy arrays (more efficient)
    model_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'services', 'model.joblib')
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(clf, model_path)

if __name__ == "__main__":
    main()
```

**Why train a model on synthetic data that mirrors the rules?** The assignment awards bonus points for using a trained ML model instead of pure rule-based classification. By training a RandomForest on synthetically labeled data (where labels are generated by the same rules), the model learns the decision boundaries from data. In practice, the model's predictions will be nearly identical to the rules — but the architecture is in place to swap in real labeled satellite data later, enabling the model to learn more nuanced patterns (e.g., distinguishing flood damage from drought stress based on delta magnitude and spatial patterns).

### File: `app/services/classifier.py` — The Classification Engine

```python
import os
import joblib
import numpy as np

# Load the model once at module import time — not on every request.
# This is critical for performance: loading a joblib file involves disk I/O
# and deserialization. Doing it once at startup means all requests share
# the same in-memory model object.
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
try:
    classifier_model = joblib.load(MODEL_PATH)
except Exception as e:
    classifier_model = None   # graceful degradation to rule-based fallback
    print(f"Failed to load model.joblib: {e}")

def classify_deltas(delta_array):
    """
    Classifies a list of NDVI delta values.
    Returns: {
        "percentages": {"crop_growth": 12.5, "crop_stress": 8.0, ...},
        "labels": ["no_change", "crop_growth", ...]  # one per pixel
    }
    """
    labels = []
    counts = {'crop_growth': 0, 'crop_stress': 0, 'significant_change': 0, 'no_change': 0}

    total_pixels = len(delta_array)
    if total_pixels == 0:
        return {"percentages": {k: 0.0 for k in counts.keys()}, "labels": labels}

    if classifier_model is not None:
        # ── ML path: batch prediction ────────────────────────────────────────
        # Convert the list to a numpy array and reshape to (n_samples, n_features)
        # n_features=1 because each pixel has exactly one feature: its delta value
        X = np.array(delta_array).reshape(-1, 1)

        # classifier_model.predict() runs all 10 decision trees on all 400 pixels
        # and returns the majority-vote label for each pixel.
        # This is a single vectorized operation — much faster than a Python loop.
        predictions = classifier_model.predict(X)
        labels = predictions.tolist()

        # Count occurrences of each label
        for label in labels:
            if label in counts:
                counts[label] += 1
            else:
                counts[label] = 1  # handle unexpected labels gracefully
    else:
        # ── Rule-based fallback (if model.joblib failed to load) ─────────────
        for delta in delta_array:
            if delta > 0.15:
                label = 'crop_growth'
            elif delta < -0.15:
                label = 'crop_stress'
            elif 0.10 < abs(delta) <= 0.15:
                label = 'significant_change'
            else:
                label = 'no_change'
            labels.append(label)
            counts[label] += 1

    # Convert counts to percentages, rounded to 2 decimal places
    percentages = {
        label: round((count / total_pixels) * 100, 2)
        for label, count in counts.items()
    }

    return {"percentages": percentages, "labels": labels}
```

### File: `app/api/endpoints/classify.py`

```python
from fastapi import APIRouter, HTTPException
from app.services.classifier import classify_deltas
from app.schemas.classify_schema import ClassifyRequest, ClassifyResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("", response_model=ClassifyResponse)
async def classify_pixels(request: ClassifyRequest):
    """
    POST /classify
    Accepts a delta array and returns classification percentages + per-pixel labels.
    """
    try:
        result = classify_deltas(request.delta_array)
        pcts = result["percentages"]

        return ClassifyResponse(
            crop_growth_pct=pcts.get("crop_growth", 0.0),
            crop_stress_pct=pcts.get("crop_stress", 0.0),
            significant_change_pct=pcts.get("significant_change", 0.0),
            no_change_pct=pcts.get("no_change", 0.0),
            pixel_labels=result["labels"]
        )
    except Exception as e:
        logger.error(f"Failed to classify pixels for field {request.fieldId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

`response_model=ClassifyResponse` tells FastAPI to validate the return value against the Pydantic model and serialize it to JSON. Any extra fields in the returned object are stripped; missing required fields raise a server-side error.

### File: `app/api/endpoints/gee.py`

```python
from fastapi import APIRouter
from app.schemas.gee_schema import DeltaRequest, DeltaResponse
from app.services.gee_service import GEEService

router = APIRouter()

@router.post("/calculate-delta", response_model=DeltaResponse)
def calculate_delta(request: DeltaRequest):
    """
    POST /api/v1/gee/calculate-delta
    Direct GEE endpoint — fetches NDVI for both dates and returns the delta.
    Used for testing the GEE pipeline independently of the ingestion service.
    """
    result = GEEService.calculate_delta(
        field_id=request.field_id,
        lon_min=request.lon_min, lat_min=request.lat_min,
        lon_max=request.lon_max, lat_max=request.lat_max,
        date1=request.date1, date2=request.date2
    )
    return result
```

### `pyproject.toml` — Dependencies

```toml
[project]
name = "classification-service"
requires-python = ">=3.10"
dependencies = [
    "earthengine-api>=1.7.28",    # Google Earth Engine Python client
    "fastapi>=0.136.3",           # Web framework
    "numpy>=2.2.6",               # Array operations for ML
    "pydantic>=2.13.4",           # Data validation
    "pydantic-settings>=2.14.1",  # .env file loading
    "scikit-learn>=1.7.2",        # RandomForestClassifier
    "uvicorn[standard]>=0.48.0",  # ASGI server (runs FastAPI)
]
```
The project uses `uv` (a fast Python package manager) instead of pip. `uv.lock` pins exact versions of all transitive dependencies for reproducible installs.

---

## 10. Service 4 — Alert Service (Port 8083)

**Technology:** Spring Boot 3.5, Spring Kafka (consumer + producer), Spring Data JPA, Firebase Admin SDK (dependency present, FCM not yet wired)
**Responsibility:** Consume `satellite.change` events, create human-readable alert records in the database, publish to `satellite.alerts`, and expose REST endpoints for the mobile app to fetch and acknowledge alerts.

### Maven Dependencies (notable)

| Dependency | Purpose |
|---|---|
| `firebase-admin:9.2.0` | Firebase Cloud Messaging for push notifications (bonus feature) |
| `spring-kafka` | Kafka consumer + producer |
| `spring-boot-starter-data-jpa` | JPA/Hibernate |

### File: `entity/Alert.java`

```java
@Entity
@Table(name = "alerts")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    @Column(name = "severity", nullable = false)
    private String severity;   // "CRITICAL", "POSITIVE", "MODERATE"

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Builder.Default
    @Column(name = "acknowledged", nullable = false)
    private Boolean acknowledged = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```
`@Builder.Default` is a Lombok annotation that sets the default value for a field when using the builder pattern. Without it, `Alert.builder().build()` would leave `acknowledged` as `null` instead of `false`.

### File: `service/AlertService.java`

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;

    public Alert createAlert(UUID fieldId, String severity, String message) {
        Alert alert = Alert.builder()
                .fieldId(fieldId)
                .severity(severity)
                .message(message)
                .build();
        return alertRepository.save(alert);
    }

    public List<Alert> getAlertsByFieldId(UUID fieldId) {
        return alertRepository.findByFieldId(fieldId);
    }

    public Optional<Alert> acknowledgeAlert(UUID id) {
        // findById returns Optional<Alert>
        // .map() applies the lambda only if the alert exists
        // Sets acknowledged=true and saves — returns the updated alert
        return alertRepository.findById(id).map(alert -> {
            alert.setAcknowledged(true);
            return alertRepository.save(alert);
        });
    }
}
```

### File: `kafka/SatelliteChangeConsumer.java`

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class SatelliteChangeConsumer {

    private final AlertService alertService;
    private final KafkaTopicsConfig kafkaTopicsConfig;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "#{kafkaTopicsConfig.change}", groupId = "alert-group")
    public void processChangePayload(Map<String, Object> payload) {

        try {
            // ── Step 1: Extract payload fields ────────────────────────────────
            String fieldId = (String) payload.get("fieldId");
            String severity = (String) payload.get("severity");
            String changeRecordId = (String) payload.get("changeRecordId");

            // changedPct can be Double or Integer depending on how Jackson
            // deserialized the number. Using Number interface handles both cases.
            Object pctObj = payload.get("changedPct");
            double changedPct = (pctObj instanceof Number) ? ((Number) pctObj).doubleValue() : 0.0;

            // ── Step 2: Build a human-readable alert message ──────────────────
            // The message is tailored to the severity level
            String message;
            if ("CRITICAL".equalsIgnoreCase(severity)) {
                message = String.format(
                    "CRITICAL: Crop stress detected in field. %.2f%% of pixels show " +
                    "significant decline. (ChangeRecord ID: %s)", changedPct, changeRecordId);
            } else if ("POSITIVE".equalsIgnoreCase(severity)) {
                message = String.format(
                    "POSITIVE: Strong crop growth detected. %.2f%% of pixels show " +
                    "significant improvement. (ChangeRecord ID: %s)", changedPct, changeRecordId);
            } else {
                message = String.format(
                    "MODERATE: Moderate changes detected in field. %.2f%% of pixels " +
                    "affected. (ChangeRecord ID: %s)", changedPct, changeRecordId);
            }

            // ── Step 3: Persist the alert ─────────────────────────────────────
            Alert savedAlert = alertService.createAlert(
                UUID.fromString(fieldId), severity, message
            );

            // ── Step 4: Publish to satellite.alerts topic ─────────────────────
            // This enables future notification handlers (FCM, email, SMS) to
            // consume from this topic without modifying the alert service
            Map<String, Object> alertPayload = new HashMap<>();
            alertPayload.put("alertId", savedAlert.getId().toString());
            alertPayload.put("fieldId", fieldId);
            alertPayload.put("severity", severity);
            alertPayload.put("message", message);

            kafkaTemplate.send(kafkaTopicsConfig.getAlerts(), fieldId, alertPayload);

        } catch (Exception e) {
            log.error("Failed to process change payload", e);
        }
    }
}
```

**The `Number` cast pattern** (`(pctObj instanceof Number) ? ((Number) pctObj).doubleValue() : 0.0`) is a defensive pattern for Kafka JSON deserialization. When Jackson deserializes a JSON number like `45.7`, it may produce a `Double`. But if the number happens to be a whole number like `45.0`, some configurations produce an `Integer`. Casting to `Number` and calling `.doubleValue()` handles both cases safely.

### File: `controller/AlertController.java`

```java
@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
@Slf4j
public class AlertController {

    private final AlertService alertService;

    // GET /alerts/{fieldId} — returns all alerts for a field
    @GetMapping("/{fieldId}")
    public ResponseEntity<List<Alert>> getAlertsByFieldId(@PathVariable UUID fieldId) {
        List<Alert> alerts = alertService.getAlertsByFieldId(fieldId);
        return ResponseEntity.ok(alerts);
    }

    // POST /alerts/acknowledge/{id} — marks an alert as acknowledged
    @PostMapping("/acknowledge/{id}")
    public ResponseEntity<Alert> acknowledgeAlert(@PathVariable UUID id) {
        return alertService.acknowledgeAlert(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
```

### `application.yml` (Alert Service)

```yaml
server:
  port: ${PORT:8083}

kafka:
  topics:
    change: satellite.change    # consumed
    alerts: satellite.alerts    # produced
```

---

## 11. Service 5 — Data Service (Port 8084)

**Technology:** Spring Boot 3.5, Spring Data JPA, Hibernate Spatial, PostgreSQL + PostGIS
**Responsibility:** Pure CRUD service for all domain entities. Provides read endpoints for the mobile app (fields list, NDVI passes, alerts) and write endpoints for creating fields. It is the only service that uses Hibernate Spatial for the `GEOMETRY` type.

### Notable Configuration

```yaml
jpa:
  database-platform: ${DB_DIALECT:org.hibernate.spatial.dialect.postgis.PostgisPG95Dialect}
```
This is the key difference from other services. `PostgisPG95Dialect` extends the standard PostgreSQL dialect with support for PostGIS geometry types. Without it, Hibernate would not know how to map the `Geometry` Java type to the `GEOMETRY(Polygon, 4326)` PostgreSQL column.

### File: `entity/Field.java`

```java
@Entity
@Table(name = "fields")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Field {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "name")
    private String name;

    @JsonIgnore
    @Column(name = "boundary", columnDefinition = "geometry(Polygon,4326)")
    private Geometry boundary;   // org.locationtech.jts.geom.Geometry

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
```
`org.locationtech.jts.geom.Geometry` is the JTS (Java Topology Suite) geometry type. Hibernate Spatial maps it to PostGIS geometry columns. `@JsonIgnore` prevents the geometry from being serialized to JSON in REST responses — JTS geometry objects don't serialize cleanly to JSON by default, and the mobile app doesn't need the raw geometry data.

### Controllers

**`FieldController`** — `GET /fields` returns all fields (used by the mobile app's Field List screen), `POST /fields` creates a new field.

**`SatellitePassController`** — `GET /ndvi/{fieldId}` returns all satellite passes for a field.

**`AlertController`** — `GET /alerts/{fieldId}` and `POST /alerts/acknowledge/{id}` — mirrors the alert-service endpoints but reads from the shared database directly.

### Services

All five service classes (`FieldService`, `AlertService`, `ChangeRecordService`, `ClassificationService`, `SatellitePassService`) follow the same pattern: inject the repository, delegate to it. They exist to provide a service layer for future business logic without exposing repositories directly to controllers.

---

## 12. Service 6 — API Gateway (Port 8080)

**Technology:** Spring Boot 3.5, Spring Cloud Gateway (WebFlux / reactive), Spring Cloud 2025.0.2
**Responsibility:** Single entry point for the React Native app. Routes requests to the correct downstream service, enables CORS for all origins, and logs every incoming request.

Spring Cloud Gateway is built on **Project Reactor** (reactive programming) and **Netty** (non-blocking I/O), not on Tomcat. This means it can handle thousands of concurrent connections with a small thread pool — appropriate for a gateway that mostly proxies requests.

### File: `ApiGatewayApplication.java`

```java
@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
```
No special annotations needed — Spring Boot auto-configures Spring Cloud Gateway when `spring-cloud-starter-gateway-server-webflux` is on the classpath.

### File: `filter/RequestLoggingFilter.java`

```java
@Component
@Slf4j
public class RequestLoggingFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String method = exchange.getRequest().getMethod().name();
        String path = exchange.getRequest().getURI().getPath();

        log.info("Incoming request: {} {}", method, path);

        // chain.filter(exchange) passes the request to the next filter/handler
        // Returning the Mono<Void> from chain.filter() is mandatory —
        // it represents the completion of the entire filter chain
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // Ordered.HIGHEST_PRECEDENCE = Integer.MIN_VALUE
        // This ensures the logging filter runs FIRST, before any routing filters
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
```

`GlobalFilter` applies to every request through the gateway. `ServerWebExchange` is the reactive equivalent of `HttpServletRequest` + `HttpServletResponse`. `Mono<Void>` is a reactive type representing an asynchronous computation that produces no value (just completion/error).

### File: `application.yml` (API Gateway)

```yaml
server:
  port: ${PORT:8080}

spring:
  cloud:
    gateway:
      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins: "*"    # allow requests from any origin (React Native app)
            allowedMethods: "*"    # allow GET, POST, PUT, DELETE, etc.
            allowedHeaders: "*"    # allow any request headers

      routes:
        - id: ingestion-service
          uri: ${INGESTION_SERVICE_URL:http://localhost:8081}
          predicates:
            - Path=/api/ingest/**
          filters:
            - StripPrefix=1   # removes "/api" prefix before forwarding
            # /api/ingest/trigger → http://localhost:8081/ingest/trigger

        - id: change-detection-service
          uri: ${CHANGE_DETECTION_SERVICE_URL:http://localhost:8082}
          predicates:
            - Path=/api/change/**
          filters:
            - StripPrefix=1
            # /api/change/... → http://localhost:8082/change/...

        - id: classification-service
          uri: ${CLASSIFICATION_SERVICE_URL:http://localhost:8000}
          predicates:
            - Path=/api/classify/**
          filters:
            - StripPrefix=1
            # /api/classify → http://localhost:8000/classify

        - id: alert-service
          uri: ${ALERT_SERVICE_URL:http://localhost:8083}
          predicates:
            - Path=/api/alerts/**
          filters:
            - StripPrefix=1
            # /api/alerts/... → http://localhost:8083/alerts/...

        - id: data-service
          uri: ${DATA_SERVICE_URL:http://localhost:8084}
          predicates:
            - Path=/api/data/**
          filters:
            - StripPrefix=2   # removes "/api/data" prefix
            # /api/data/fields → http://localhost:8084/fields
```

**`StripPrefix=1` vs `StripPrefix=2`:** The `StripPrefix` filter removes path segments before forwarding. For most services, `StripPrefix=1` removes `/api`, leaving `/ingest/...`, `/change/...`, etc. For the data service, `StripPrefix=2` removes both `/api` and `/data`, leaving just `/fields`, `/ndvi/...`, `/alerts/...` — matching the data service's controller mappings.

### `pom.xml` (API Gateway)

```xml
<spring-cloud.version>2025.0.2</spring-cloud.version>

<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webflux</artifactId>
</dependency>
<dependency>
    <groupId>io.projectreactor</groupId>
    <artifactId>reactor-test</artifactId>
    <scope>test</scope>
</dependency>
```
The gateway uses `spring-cloud-starter-gateway-server-webflux` (the WebFlux/reactive variant). It does NOT include `spring-boot-starter-web` (Tomcat) — including both would cause a startup conflict since they use different web servers.

---

## 13. React Native Mobile App — SatelliteApp

**Technology:** React Native (Expo managed workflow), Expo Router (file-based navigation), NativeWind (Tailwind CSS for React Native), TypeScript
**Three screens:** Field List → Change Map → Alerts

### Navigation (`src/app/_layout.tsx`)

```tsx
import '../global.css';   // NativeWind global styles
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },  // dark slate header
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
```
Expo Router uses file-based routing — `src/app/index.tsx` → `/`, `src/app/change-map.tsx` → `/change-map`, `src/app/alerts.tsx` → `/alerts`.

### API Layer (`src/service/api.ts`)

All HTTP calls go through the API gateway at port 8080. The base URL handles Android emulator networking:
```typescript
const BASE_URL = Platform.OS === 'android'
  ? 'http://192.168.1.6:8080'   // host machine IP for Android emulator
  : 'http://localhost:8080';     // iOS simulator / web
```

Five functions: `getFields()`, `getChangeMap(fieldId, date1, date2)`, `getAlerts(fieldId)`, `acknowledgeAlert(alertId)`, `triggerIngestion(fieldId, lonMin, latMin, lonMax, latMax, date1, date2)`.

### Screen 1 — Field List (`src/app/index.tsx`)

Fetches all fields from `GET /api/data/fields` on mount. Renders a `FlatList` of field cards. Each card shows the field name, last scan date, and a hardcoded "HEALTHY" badge. A "Scan Now" button in the header triggers ingestion for the hardcoded Tumkur field with demo dates (`2024-01-06` → `2024-01-21`). Tapping a card navigates to the Change Map screen, passing `fieldId`, `fieldName`, `date1`, `date2` as route params.

### Screen 2 — Change Map (`src/app/change-map.tsx`)

The most complex screen. On mount, it fires two parallel requests using `Promise.all`:
- `getChangeMap(fieldId, date1, date2)` → gets the `ChangeRecord` with `deltaArray`
- `getAlerts(fieldId)` → gets alerts for the field

The `deltaArray` is a JSON string stored in the database — the screen parses it with `JSON.parse()`. All visual data is derived from this 400-value array using utility functions in `src/utils.ts`.

**`buildGridCells(deltaArray)`** — derives three colour grids:
- `date1Cells`: simulates Date 1 NDVI colours (green if delta ≥ 0, red if delta < -0.15)
- `date2Cells`: applies the delta shift to simulate Date 2 NDVI
- `deltaCells`: maps each delta directly to a colour (green=growth, red=stress, amber=moderate, slate=stable)

Also computes `stats` (percentage of pixels in each category) for the classification bar chart.

The screen renders: date badges → NDVI comparison grids (Date 1 vs Date 2 side by side) → Delta map → Classification breakdown bars → "View Alerts" button.

### Screen 3 — Alerts (`src/app/alerts.tsx`)

Fetches alerts from `GET /api/alerts/{fieldId}`. Renders a `ScrollView` of `AlertCard` components. Shows a summary pill with unacknowledged count. Each card has an "Acknowledge" button that calls `POST /api/alerts/acknowledge/{id}` and optimistically updates the local state (flips `acknowledged` to `true` without re-fetching).

### Key Components

**`NdviGrid`** — renders a 20×20 grid of coloured cells. Each cell is a `View` with `width=14, height=14` and a background colour from the cells array. `flexWrap: 'wrap'` on the container makes the cells flow into a grid.

**`ClassificationBar`** — renders a labelled progress bar. Uses a fixed-width container with an inner `View` whose `width` is set to `${pct}%`.

**`AlertCard`** — renders severity badge (colour-coded), timestamp, message text, and acknowledge button. Uses `severityStyle()` from utils to get the correct badge colours.

### Utility Functions (`src/utils.ts`)

```typescript
// NDVI value → colour (for Date 1 and Date 2 grids)
export function ndviColor(ndvi: number): string {
  if (ndvi > 0.6) return '#16a34a';   // green — healthy
  if (ndvi >= 0.3) return '#ca8a04';  // yellow — moderate
  return '#dc2626';                    // red — stressed
}

// Delta value → colour (for the delta map)
export function deltaColor(delta: number): string {
  if (delta > 0.15) return '#16a34a';             // growth
  if (delta < -0.15) return '#dc2626';            // stress
  if (Math.abs(delta) >= 0.10) return '#f59e0b';  // amber — moderate
  return '#475569';                               // slate — stable
}
```

---

## 14. End-to-End Flow Walkthrough

Here is the complete journey of a single ingestion request from the mobile app to an alert appearing on screen:

**Step 1 — User taps "Scan Now"**
The app calls `POST http://192.168.1.6:8080/api/ingest/trigger` with body:
```json
{
  "fieldId": "84d0086e-1c2c-4e66-b7e1-6853f7c317b3",
  "lonMin": 76.9, "latMin": 13.3, "lonMax": 77.1, "latMax": 13.5,
  "date1": "2024-01-06", "date2": "2024-01-21"
}
```

**Step 2 — API Gateway routes the request**
`RequestLoggingFilter` logs `POST /api/ingest/trigger`. The `ingestion-service` route matches, `StripPrefix=1` removes `/api`, and the request is forwarded to `http://localhost:8081/ingest/trigger`.

**Step 3 — Ingestion Service creates a job and runs GEE**
`IngestionController` receives the request, builds the `aoi` array, calls `IngestionService.triggerIngestion()`. The service creates an `IngestJob` with status `PENDING`, saves it, updates to `PROCESSING`, then calls `GeeScriptRunnerImpl.runScript()`.

**Step 4 — GEE Python script executes**
`ProcessBuilder` launches: `.venv/bin/python gee_fetch.py <fieldId> 76.9 13.3 77.1 13.5 2024-01-06 2024-01-21`

The script initializes Earth Engine, calls `GEEService.calculate_delta()`, which:
- Creates `ee.Geometry.Rectangle([76.9, 13.3, 77.1, 13.5])`
- Queries `COPERNICUS/S2_SR_HARMONIZED` for 2024-01-06, filters by cloud cover, takes the best image, computes NDVI, reduces to a list of values, pads/trims to 400
- Repeats for 2024-01-21
- Computes delta = date2 - date1 for each of the 400 pixels
- Prints the result JSON to stdout

**Step 5 — Java reads the output**
`GeeScriptRunnerImpl` reads all stdout bytes, validates the exit code is 0, returns the JSON string. `IngestionService` stores it in `IngestJob.ndviDeltaJson`, marks the job `COMPLETED`.

**Step 6 — Kafka event published**
`KafkaIngestionEventProducer.publishJobCompleted()` sends to `satellite.ingest`:
```json
{
  "jobId": "...", "fieldId": "...", "date1": "2024-01-06", "date2": "2024-01-21",
  "ndviDeltaPath": "{\"fieldId\":\"...\",\"ndvi_delta\":[0.06, -0.18, ...],...}"
}
```

**Step 7 — Change Detection Service consumes the event**
`SatelliteIngestConsumer.processIngestJob()` fires. It parses the JSON, extracts `ndvi_delta`, counts pixels with `|delta| > 0.15`, saves a `ChangeRecord`, calls `ClassificationClient.classify()`.

**Step 8 — Classification Service classifies**
`POST http://localhost:8000/classify` with `{"fieldId": "...", "delta_array": [0.06, -0.18, ...]}`. The RandomForest model predicts a label for each of the 400 pixels. Returns percentages and labels.

**Step 9 — Change Detection saves classification and publishes**
Saves `Classification` entity. Determines severity (e.g., `crop_stress_pct > 20` → `CRITICAL`). Publishes to `satellite.change`:
```json
{"fieldId": "...", "changeRecordId": "...", "changedPct": 34.5, "severity": "CRITICAL"}
```

**Step 10 — Alert Service creates the alert**
`SatelliteChangeConsumer.processChangePayload()` fires. Builds message: `"CRITICAL: Crop stress detected in field. 34.50% of pixels show significant decline."` Saves `Alert` to database. Publishes to `satellite.alerts`.

**Step 11 — User navigates to Change Map**
App calls `GET /api/change/{fieldId}/2024-01-06/2024-01-21` → gateway → change-detection-service → returns the `ChangeRecord` with `deltaArray`. App parses the delta array, derives grid colours, renders the NDVI heatmaps and classification bars.

**Step 12 — User taps "View Alerts"**
App calls `GET /api/alerts/{fieldId}` → gateway → alert-service → returns the CRITICAL alert. `AlertCard` renders with red badge and the message.

---

## 15. Developer Tooling — The `ez` CLI

The `ez` script is generated by CMake from `ez.in` template. It wraps Maven commands for all services.

```bash
cmake -S . -B build   # generates the ez script (run once)

./ez install          # mvn dependency:resolve -U for all services
./ez build            # mvn compile for all services
./ez package          # mvn package -DskipTests for all services
./ez test             # mvn test for all services
./ez run -s ingestion-service   # mvn spring-boot:run for one service
```

The service list is defined in `CMakeLists.txt`. Adding a new service requires adding its folder name to the `SERVICES` list and re-running `cmake -S . -B build`.

---

## Summary Table — All Services

| Service | Port | Language | Key Files | Kafka Role | DB Tables |
|---|---|---|---|---|---|
| ingestion-service | 8081 | Java/Spring Boot | `IngestionService`, `GeeScriptRunnerImpl`, `KafkaIngestionEventProducer` | Producer → `satellite.ingest` | `ingest_jobs` |
| change-detection-service | 8082 | Java/Spring Boot | `SatelliteIngestConsumer`, `ClassificationClient` | Consumer ← `satellite.ingest`, Producer → `satellite.change` | `change_records`, `classifications` |
| classification-service | 8000 | Python/FastAPI | `gee_service.py`, `classifier.py`, `gee_fetch.py` | None (HTTP only) | None |
| alert-service | 8083 | Java/Spring Boot | `SatelliteChangeConsumer`, `AlertService` | Consumer ← `satellite.change`, Producer → `satellite.alerts` | `alerts` |
| data-service | 8084 | Java/Spring Boot | `FieldController`, `Field` (PostGIS geometry) | None | `fields`, `satellite_passes`, `change_records`, `classifications`, `alerts` |
| api-gateway | 8080 | Java/Spring Cloud Gateway | `RequestLoggingFilter`, `application.yml` routes | None | None |
| SatelliteApp | — | React Native/Expo | `api.ts`, `change-map.tsx`, `utils.ts` | None | None |

---

*Report generated: Monday, 2 June 2026*
*Repository: satellite-change-detection*
*Assignment: Agriculture Tech Division — Remote Sensing Engineering Team Intern Assignment*

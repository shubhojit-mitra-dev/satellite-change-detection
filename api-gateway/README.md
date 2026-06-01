# Satellite Change Detection - API Gateway

The **API Gateway** serves as the centralized entry point for the entire Satellite Change Detection microservices ecosystem. Built with **Spring Boot 3** and **Spring Cloud Gateway** on top of Project Reactor (WebFlux), it provides a robust, asynchronous, non-blocking routing layer that connects external clients (such as mobile apps or web dashboards) to the underlying domain services.

By consolidating traffic through this gateway, the system achieves a unified API surface, handles cross-origin resource sharing (CORS) globally, and simplifies client integrations by hiding the internal network topology.

---

## 🚀 Features & Responsibilities

- **Dynamic Routing:** Intelligently forwards incoming requests to the appropriate microservice based on URL path predicates.
- **Path Rewriting:** Utilizes `StripPrefix` filters to cleanly adapt client-facing API paths (e.g., `/api/data/fields`) to internal service paths (e.g., `/fields`).
- **Global CORS Configuration:** Automatically handles Cross-Origin Resource Sharing headers for all endpoints (allowing all origins, methods, and headers), allowing frontend applications to interact with the system seamlessly without encountering browser security blocks.
- **Non-Blocking I/O:** Leverages Spring WebFlux (Netty) to handle a massive number of concurrent connections with a small thread pool, essential for high-throughput gateway services.
- **Centralized Configuration:** Exposes a unified configuration file where all downstream service URLs can be overridden via environment variables for easy deployment across different environments (local, staging, production).

---

## 🛠 Tech Stack

- **Java 17**
- **Spring Boot 3.5.x** (WebFlux)
- **Spring Cloud Gateway 2025.0.x**
- **Project Reactor** (Reactive Programming)
- **Lombok** (Boilerplate reduction)

---

## 🗺️ Routing Configuration

The gateway exposes all services under the unified `/api/**` prefix. The routing rules are defined in `src/main/resources/application.yml` and function as follows:

| Client Path (Gateway) | Internal Service | Internal Path Example | Routing Rule |
|-----------------------|------------------|-----------------------|--------------|
| `/api/ingest/**` | `ingestion-service` | `/ingest/**` | StripPrefix=1 |
| `/api/change/**` | `change-detection-service` | `/change/**` | StripPrefix=1 |
| `/api/classify/**` | `classification-service` | `/classify/**` | StripPrefix=1 |
| `/api/alerts/**` | `alert-service` | `/alerts/**` | StripPrefix=1 |
| `/api/data/**` | `data-service` | `/**` (e.g. `/fields`) | StripPrefix=2 |

### Detailed Route Breakdown

1. **Ingestion API** (`/api/ingest/**` ➡️ `http://localhost:8081/ingest/**`)
   - Handles the initiation of satellite image ingestion jobs.
2. **Change Detection API** (`/api/change/**` ➡️ `http://localhost:8082/change/**`)
   - Forwards requests to the temporal differencing and analytics engine.
3. **Classification API** (`/api/classify/**` ➡️ `http://localhost:8000/classify/**`)
   - Routes traffic to the machine learning classification service.
4. **Alerts API** (`/api/alerts/**` ➡️ `http://localhost:8083/alerts/**`)
   - Manages and retrieves critical agricultural notifications.
5. **Data API** (`/api/data/**` ➡️ `http://localhost:8084/**`)
   - Provides CRUD access to the underlying spatial data, NDVI passes, and fields. Notice this route strips two path segments (`/api/data`), mapping `/api/data/fields` directly to `/fields` on the data service.

---

## ⚙️ Setup & Installation

### Prerequisites

- **Java 17+**
- **Maven 3.8+** (or use the provided Maven wrapper `mvnw`)
- All downstream microservices should ideally be running for full end-to-end functionality.

### Configuration

The gateway configuration is managed in `src/main/resources/application.yml`. You can override the default routing URLs by providing the following environment variables:

- `PORT` (Default: `8080`)
- `INGESTION_SERVICE_URL` (Default: `http://localhost:8081`)
- `CHANGE_DETECTION_SERVICE_URL` (Default: `http://localhost:8082`)
- `CLASSIFICATION_SERVICE_URL` (Default: `http://localhost:8000`)
- `ALERT_SERVICE_URL` (Default: `http://localhost:8083`)
- `DATA_SERVICE_URL` (Default: `http://localhost:8084`)
- `LOG_LEVEL_ROOT` (Default: `INFO`)

### Building the Service

To compile the application and build a production-ready JAR file:

```bash
mvn clean package -DskipTests
```

### Running the Application

To run the application locally for development:

```bash
mvn spring-boot:run
```

Alternatively, run the packaged JAR:

```bash
java -jar target/api-gateway-0.0.1-SNAPSHOT.jar
```

The gateway will start and bind to `http://localhost:8080` (or the configured `PORT`).

---

## 🔄 Integration Context

The API Gateway is typically the **only** service exposed directly to external networks (e.g., the internet or mobile clients). 
- **Frontend Clients (React Native, Next.js, etc.)** will hardcode their `API_BASE_URL` to point to this service (e.g., `http://gateway-ip:8080/api`).
- **Internal Services** communicate with each other asynchronously via Apache Kafka or directly over the internal network without routing through the gateway.
- Security layers (such as authentication tokens or rate-limiting filters) can easily be added to this service in the future to protect the entire ecosystem without modifying downstream microservices.

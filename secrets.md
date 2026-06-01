# Microservices Environment Variables & Secrets Tracker

This document maintains a central registry of all environment variables, connection strings, and secrets across the `satellite-change-detection` platform.

> ⚠️ **IMPORTANT**: Do not commit actual sensitive production passwords or private keys to this file. Use it to track the *names* of the environment variables required, their purpose, and their local development default values.

---

## 1. Classification Service (`classification-service/`)

These variables are primarily loaded from the `.env` file within the `classification-service/` directory.

| Environment Variable | Description | Local Default / Type |
|----------------------|-------------|----------------------|
| `GOOGLE_CLOUD_PROJECT_ID` | The GCP Project ID authorized for Google Earth Engine. | `pragmatic-port-497917-i6` |

---

## 2. Data Service (`data-service/`)

These variables are defined in `application.yml` and handle database connections, connection pooling, logging, and concurrency.

| Environment Variable | Description | Local Default |
|----------------------|-------------|---------------|
| `PORT` | The port the Spring Boot server runs on. | `8084` |
| `DB_URL` | JDBC connection string for PostgreSQL / PostGIS. | `jdbc:postgresql://localhost:5432/satdb` |
| `DB_USER` | PostgreSQL User. | `postgres` |
| `DB_PASSWORD` | PostgreSQL Password. | `satpass` |
| `DB_POOL_MAX` | Maximum HikariCP connection pool size. | `15` |
| `DB_POOL_MIN` | Minimum idle connections in the pool. | `2` |
| `DB_CONN_TIMEOUT` | HikariCP connection timeout in milliseconds. | `30000` |
| `DDL_AUTO` | Hibernate schema management mode. Must be `validate`. | `validate` |
| `DB_DIALECT` | Spatial dialect mapping for GEOMETRY. | `org.hibernate.spatial.dialect.postgis.PostgisPG95Dialect` |
| `SHOW_SQL` | Whether to print SQL statements to the console. | `false` |
| `LOG_LEVEL_ROOT` | Global application log level. | `INFO` |
| `LOG_LEVEL_HIBERNATE`| Log level for Hibernate SQL generation. | `INFO` |
| `LOG_LEVEL_BINDER` | Log level for variable binding in SQL statements. | `WARN` |

---

## 3. Ingestion Service (`ingestion-service/`)

These variables are defined in `application.yml` and handle Kafka, Database connections, and integration with other services.

| Environment Variable | Description | Local Default |
|----------------------|-------------|---------------|
| `PORT` | The port the Spring Boot server runs on. | `8081` |
| `DB_URL` | JDBC connection string for PostgreSQL / PostGIS. | `jdbc:postgresql://localhost:5432/satdb` |
| `DB_USER` | PostgreSQL User. | `postgres` |
| `DB_PASSWORD` | PostgreSQL Password. | `satpass` |
| `DB_POOL_MAX` | Maximum HikariCP connection pool size. | `15` |
| `DB_POOL_MIN` | Minimum idle connections in the pool. | `2` |
| `DB_CONN_TIMEOUT` | HikariCP connection timeout in milliseconds. | `30000` |
| `DDL_AUTO` | Hibernate schema management mode. Must be `validate` (Flyway manages schema). | `validate` |
| `DB_DIALECT` | PostgreSQL Dialect. | `org.hibernate.dialect.PostgreSQLDialect` |
| `SHOW_SQL` | Whether to print SQL statements to the console. | `false` |
| `KAFKA_SERVERS` | Kafka bootstrap servers. | `localhost:9092` |
| `GEE_SCRIPT_PATH` | Absolute path to the Python GEE script. | `/home/blackknight05/Desktop/satellite-change-detection/classification-service/gee_fetch.py` |
| `PYTHON_VENV_PATH` | Absolute path to the Python VENV executable. | `/home/blackknight05/Desktop/satellite-change-detection/classification-service/.venv/bin/python` |
| `LOG_LEVEL_ROOT` | Global application log level. | `INFO` |
| `LOG_LEVEL_HIBERNATE`| Log level for Hibernate SQL generation. | `INFO` |
| `LOG_LEVEL_BINDER` | Log level for variable binding in SQL statements. | `WARN` |

---

*(More services will be added to this document as they are developed.)*

---

## 6. API Gateway (`api-gateway/`)

These variables are defined in `application.yml` and handle routing for the frontend React Native application.

| Environment Variable | Description | Local Default |
|----------------------|-------------|---------------|
| `PORT` | The port the Spring Boot server runs on. | `8080` |
| `INGESTION_SERVICE_URL` | Upstream URL for Ingestion Service. | `http://localhost:8081` |
| `CHANGE_DETECTION_SERVICE_URL` | Upstream URL for Change Detection Service. | `http://localhost:8082` |
| `CLASSIFICATION_SERVICE_URL` | Upstream URL for Classification Service. | `http://localhost:8000` |
| `ALERT_SERVICE_URL` | Upstream URL for Alert Service. | `http://localhost:8083` |
| `DATA_SERVICE_URL` | Upstream URL for Data Service. | `http://localhost:8084` |
| `LOG_LEVEL_ROOT` | Global application log level. | `INFO` |

---

## 5. Alert Service (`alert-service/`)

These variables are defined in `application.yml` and handle Database connections, Kafka consumer details, and topics.

| Environment Variable | Description | Local Default |
|----------------------|-------------|---------------|
| `PORT` | The port the Spring Boot server runs on. | `8083` |
| `DB_URL` | JDBC connection string for PostgreSQL / PostGIS. | `jdbc:postgresql://localhost:5432/satdb` |
| `DB_USER` | PostgreSQL User. | `postgres` |
| `DB_PASSWORD` | PostgreSQL Password. | `satpass` |
| `DB_POOL_MAX` | Maximum HikariCP connection pool size. | `15` |
| `DB_POOL_MIN` | Minimum idle connections in the pool. | `2` |
| `DB_CONN_TIMEOUT` | HikariCP connection timeout in milliseconds. | `30000` |
| `DDL_AUTO` | Hibernate schema management mode. Must be `validate`. | `validate` |
| `DB_DIALECT` | PostgreSQL Dialect. | `org.hibernate.dialect.PostgreSQLDialect` |
| `SHOW_SQL` | Whether to print SQL statements to the console. | `false` |
| `KAFKA_SERVERS` | Kafka bootstrap servers. | `localhost:9092` |
| `KAFKA_GROUP_ID` | Kafka consumer group ID for alerts. | `alert-group` |
| `LOG_LEVEL_ROOT` | Global application log level. | `INFO` |
| `LOG_LEVEL_HIBERNATE`| Log level for Hibernate SQL generation. | `INFO` |
| `LOG_LEVEL_BINDER` | Log level for variable binding in SQL statements. | `WARN` |

---

## 4. Change Detection Service (`change-detection-service/`)

These variables are defined in `application.yml` and handle Kafka consuming/producing, Database connections, and external API calls.

| Environment Variable | Description | Local Default |
|----------------------|-------------|---------------|
| `PORT` | The port the Spring Boot server runs on. | `8082` |
| `DB_URL` | JDBC connection string for PostgreSQL / PostGIS. | `jdbc:postgresql://localhost:5432/satdb` |
| `DB_USER` | PostgreSQL User. | `postgres` |
| `DB_PASSWORD` | PostgreSQL Password. | `satpass` |
| `DB_POOL_MAX` | Maximum HikariCP connection pool size. | `15` |
| `DB_POOL_MIN` | Minimum idle connections in the pool. | `2` |
| `DB_CONN_TIMEOUT` | HikariCP connection timeout in milliseconds. | `30000` |
| `DDL_AUTO` | Hibernate schema management mode. Must be `validate`. | `validate` |
| `DB_DIALECT` | PostgreSQL Dialect. | `org.hibernate.dialect.PostgreSQLDialect` |
| `SHOW_SQL` | Whether to print SQL statements to the console. | `false` |
| `KAFKA_SERVERS` | Kafka bootstrap servers. | `localhost:9092` |
| `KAFKA_GROUP_ID` | Kafka consumer group ID for change detection. | `change-detection-group` |
| `CLASSIFICATION_SERVICE_URL` | Base URL for the classification Python microservice. | `http://localhost:8000` |
| `CLASSIFICATION_THRESHOLD` | Threshold limit for triggering classification logic. | `0.15` |
| `LOG_LEVEL_ROOT` | Global application log level. | `INFO` |
| `LOG_LEVEL_HIBERNATE`| Log level for Hibernate SQL generation. | `INFO` |
| `LOG_LEVEL_BINDER` | Log level for variable binding in SQL statements. | `WARN` |

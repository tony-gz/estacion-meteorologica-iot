# Quickstart — WeatherStation Backend v2

Puesta en marcha local y en Render. **Aplica tras implementar las fases v2 del
roadmap** (`tasks.md`). Documenta el objetivo de configuración y los flujos nuevos
(gobernanza de estaciones + ingesta de dispositivo).

## Requisitos

- Java 21 (JDK) · Maven (`./mvnw`)
- PostgreSQL 14+ (local o gestionado)
- Credenciales:
  - **Gemini**: `GEMINI_API_KEY`.
  - **JWT usuarios**: `JWT_SECRET`.
  - **JWT dispositivos**: `DEVICE_JWT_SECRET` (independiente del de usuarios).

> No se necesitan credenciales de Firebase: el único almacén es PostgreSQL. El
> token legacy de Firebase del firmware antiguo debe retirarse.

## Variables de entorno

```bash
# Base de datos
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/weatherstation
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=postgres

# Seguridad (usuarios)
export JWT_SECRET="cambia-esto-por-una-clave-larga-y-aleatoria"
export JWT_ACCESS_EXP_MIN=15
export JWT_REFRESH_EXP_DAYS=7

# Seguridad (dispositivos / estaciones)
export DEVICE_JWT_SECRET="otra-clave-larga-distinta-para-dispositivos"
export DEVICE_JWT_EXP_MIN=60
export DEVICE_RATELIMIT_POR_MIN=30

# Gemini
export GEMINI_API_KEY="tu-api-key"
export GEMINI_MODEL="gemini-2.5-flash"

# Ingesta
export INGESTA_HISTORIAL_CADA_MIN=10
```

> Nunca se versionan estos valores. El único datastore es PostgreSQL; no hay
> credenciales de Firebase que custodiar.

## Base de datos local

```bash
docker run --name ws-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=weatherstation -p 5432:5432 -d postgres:16
# Flyway aplica db/migration/V1..V3 al arrancar (V3 = red de estaciones)
```

## Arrancar en local

```bash
cd WeatherStation_Backend
./mvnw spring-boot:run
```

- API: `http://localhost:8080` · Swagger: `/swagger-ui.html` · OpenAPI: `/v3/api-docs`

## Smoke test (flujo completo v2)

```bash
# ───── 1) ADMIN: login (usuario semilla) ─────
ADMIN=$(curl -s -X POST localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@weatherstation.local","password":"Admin12345"}' | jq -r .accessToken)

# ───── 2) ADMIN: crear una escuela ─────
ESCUELA=$(curl -s -X POST localhost:8080/escuelas -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Prepa 1","clave":"12DPR0001X","municipio":"Chilpancingo"}' | jq -r .id)

# ───── 3) ADMIN: registrar una estación (queda PENDING) ─────
EST=$(curl -s -X POST localhost:8080/estaciones -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"nombre\":\"Estación Patio\",\"escuelaId\":\"$ESCUELA\",\"municipio\":\"Chilpancingo\"}")
EST_ID=$(echo "$EST" | jq -r .id)
UUID=$(echo "$EST" | jq -r .uuid)

# ───── 4) ADMIN: aprobar la estación → token (¡se muestra UNA sola vez!) ─────
TOKEN=$(curl -s -X POST localhost:8080/estaciones/$EST_ID/aprobar \
  -H "Authorization: Bearer $ADMIN" | jq -r .token)
echo "Guarda este token de estación: $TOKEN"

# ───── 5) ESTACIÓN: handshake → JWT de dispositivo ─────
DEVTOKEN=$(curl -s -X POST localhost:8080/api/device/auth -H 'Content-Type: application/json' \
  -d "{\"uuid\":\"$UUID\",\"token\":\"$TOKEN\",\"firmware\":\"3.0.0\"}" | jq -r .deviceToken)

# ───── 6) ESTACIÓN: publicar una lectura (el backend la persiste en PostgreSQL) ─────
curl -s -X POST localhost:8080/api/device/data -H "Authorization: Bearer $DEVTOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"timestamp":"2026-06-28T10:15:00-06:00","temperatura":24.5,"humedad":60,
       "presion":1013.2,"vientoKmh":12.3,"vientoDir":"NE","vientoGrados":45,"lluviaMm":0}'

# ───── 7) USUARIO: consultar el dato actual (leído de PostgreSQL) ─────
curl -s localhost:8080/estaciones/$UUID/actual -H "Authorization: Bearer $ADMIN"

# ───── 8) ADMIN: historial de conexiones de la estación ─────
curl -s localhost:8080/estaciones/$UUID/conexiones -H "Authorization: Bearer $ADMIN"

# ───── 9) ESTACIÓN: latido de salud (sin batería) y leer config remota ─────
curl -s -X POST localhost:8080/api/device/heartbeat -H "Authorization: Bearer $DEVTOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"firmware":"3.0.0","hardware":"ESP32-WROOM","rssi":-67,"uptimeSeg":3600}'
curl -s localhost:8080/api/device/config -H "Authorization: Bearer $DEVTOKEN"

# ───── 10) PÚBLICO: sin cuenta, solo lectura (sin IA) ─────
curl -s localhost:8080/api/public/stations
curl -s localhost:8080/api/public/weather/latest
curl -s "localhost:8080/api/public/statistics?municipio=Chilpancingo"
```

Casos de error a verificar:
- `POST /ia/preguntar` **sin token** → `401` (la IA exige cuenta; el público no la usa).
- `/api/device/data` con estación en `MAINTENANCE` → `403`.
- `/api/device/auth` con token incorrecto → `401`.
- `/api/device/data` con estación `PENDING`/`DISABLED` → `403`.
- `/api/device/data` con `presion:0` o `humedad:120` → `422` (no se escribe).
- Regenerar el token (`POST /estaciones/{id}/regenerar-token`) y reintentar el
  handshake con el token viejo → `401`.

## Despliegue en Render

1. Servicio web (Docker o Java/Maven) → subcarpeta `WeatherStation_Backend`.
2. Variables de entorno anteriores como **Environment/Secret Files** (incluye
   `JWT_SECRET`, `DEVICE_JWT_SECRET`, `GEMINI_API_KEY`).
3. PostgreSQL (Render Postgres o externo) → `SPRING_DATASOURCE_*`.
4. Healthcheck `/actuator/health` (si se añade Actuator).

> El plan gratuito de Render suspende el servicio inactivo; tras el reposo, la
> primera petición (incl. el handshake del ESP32) sufre *cold start*. El firmware
> debe reintentar.

## Pruebas

```bash
cd WeatherStation_Backend && ./mvnw test
```

- Unitarias: services con fake de Gemini; validación de lecturas; estadísticas SQL;
  rotación de tokens de estación.
- Integración: Testcontainers (PostgreSQL); flujo registro→aprobación→device-auth→
  data→consulta; rate limit de dispositivo.

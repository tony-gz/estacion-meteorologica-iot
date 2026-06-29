# Despliegue — WeatherStation Backend (v3, sin Firebase)

Dos formas: **Docker local** (para validar la imagen de producción) y **Render**
(despliegue real). Toda la configuración es por variables de entorno; **ningún
secreto se versiona**. El único almacén es **PostgreSQL** (Firebase fue retirado).

## Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|:----------:|-------------|
| `SPRING_PROFILES_ACTIVE` | — | `prod` en Render (por defecto `dev`). |
| `SPRING_DATASOURCE_URL` | ✅ | JDBC, p. ej. `jdbc:postgresql://host:5432/weatherstation`. |
| `SPRING_DATASOURCE_USERNAME` | ✅ | Usuario de PostgreSQL. |
| `SPRING_DATASOURCE_PASSWORD` | ✅ | Contraseña de PostgreSQL. |
| `JWT_SECRET` | ✅ | Clave larga y aleatoria (≥ 32 bytes) para los JWT de **usuario**. En Render se autogenera. |
| `JWT_ACCESS_EXP_MIN` | — | Minutos de vida del access token (def. 15). |
| `JWT_REFRESH_EXP_DAYS` | — | Días de vida del refresh token (def. 7). |
| `DEVICE_JWT_SECRET` | ✅ | Clave **separada** para los JWT de **dispositivo** (rotación independiente). En Render se autogenera. |
| `DEVICE_JWT_EXP_MIN` | — | Vida del JWT de dispositivo (def. 60). |
| `DEVICE_RATELIMIT_POR_MIN` | — | Límite de `/api/device/**` y `/api/public/**` por minuto (def. 30). |
| `DEVICE_TIMESTAMP_VENTANA_MIN` | — | Ventana de validez del timestamp reportado (def. 15). |
| `INGESTA_HISTORIAL_CADA_MIN` | — | Cadencia de inserción en el histórico (def. 10). |
| `GEMINI_API_KEY` | ✅ | API key de Gemini (solo para la IA, que exige cuenta). |
| `GEMINI_MODEL` | — | Modelo (def. `gemini-2.5-flash`). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Usuario ADMIN inicial (cámbialos). |
| `CORS_ALLOWED_ORIGINS` | — | Orígenes permitidos, separados por coma. |
| `IA_RATELIMIT_POR_MIN` / `IA_RATELIMIT_POR_DIA` | — | Límites de IA (def. 5 / 100). |
| `APP_ALERTAS_INTERVALO_MS` | — | Periodo del motor de alertas (def. 300000). |

> **Ya no hay variables de Firebase.** Si vienes de v1/v2, elimina
> `FIREBASE_CREDENTIALS`, `FIREBASE_CREDENTIALS_PATH` y `FIREBASE_DB_URL`.

## Opción A — Docker local (validar la imagen de producción)

```bash
cd WeatherStation_Backend
docker build -t weatherstation-backend .

# PostgreSQL
docker network create wsnet
docker run --name ws-pg --network wsnet \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=weatherstation -d postgres:16

# Backend (solo PostgreSQL + Gemini; sin Firebase)
docker run --name ws-app --network wsnet -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://ws-pg:5432/weatherstation \
  -e SPRING_DATASOURCE_USERNAME=postgres -e SPRING_DATASOURCE_PASSWORD=postgres \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e DEVICE_JWT_SECRET="$(openssl rand -hex 32)" \
  -e GEMINI_API_KEY="<tu-key>" \
  weatherstation-backend

curl localhost:8080/actuator/health   # {"status":"UP"}
```

## Opción B — Render (Blueprint)

1. Sube el repo a GitHub.
2. En Render: **New > Blueprint**, selecciona el repo. Detectará `render.yaml`
   (servicio Docker `weatherstation-backend` + base `weatherstation-db`).
3. Completa las variables `sync:false` en el dashboard:
   - `SPRING_DATASOURCE_URL`: toma la *Internal Database URL* de la base creada y
     conviértela a JDBC (`jdbc:postgresql://HOST:PORT/DB`, sin usuario/contraseña;
     esos van en `SPRING_DATASOURCE_USERNAME/PASSWORD`, ya enlazados).
   - `GEMINI_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ALLOWED_ORIGINS`.
4. Deploy. `JWT_SECRET` y `DEVICE_JWT_SECRET` se autogeneran. Flyway crea el esquema
   en el primer arranque (V1…V5).
5. Healthcheck: `/actuator/health`. Swagger: `/swagger-ui.html`.

> **Plan free de Render**: el servicio se suspende tras inactividad; la primera
> petición (incluido el handshake del ESP32) sufre *cold start*. El firmware debe
> reintentar.

## Notas de seguridad

- **Ningún secreto en el repositorio** (verificado). `.gitignore` y `.dockerignore`
  bloquean `*.env`, claves y service accounts.
- El **token de estación** se guarda **hasheado** (SHA-256) y su valor en claro se
  muestra una sola vez al aprobar/regenerar; nunca se persiste ni se loguea.
- **Retira el token legacy de Firebase** que aparecía en el firmware del ESP32 y en
  `WeatherStation_WEB/INSTRUCCIONES.txt`: con v3 el firmware no necesita ninguna
  credencial de Firebase (publica al backend con su token de estación).
- Cambia `ADMIN_EMAIL`/`ADMIN_PASSWORD` por defecto tras el primer arranque.
- El backend es el único componente con acceso a PostgreSQL y Gemini; los clientes
  y las estaciones solo consumen esta API (constitución, principio I).

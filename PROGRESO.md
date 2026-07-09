# CLIMBOT — Estado del proyecto

Plataforma IoT de la Red de Estaciones Meteorológicas Inteligentes **CLIMBOT**.
Última actualización: 2026-06-28.

## 🔄 PIVOTE DE ARQUITECTURA v1 → v3 (en curso, especificaciones refactorizadas)

Se detectó que el diseño v1 (ESP32 escribe directo en Firebase; backend solo lee)
no sirve para una **red multi-escuela**: cada estación necesitaría credenciales de
Firebase y el backend no gobierna las estaciones. Además, al pasar toda la ingesta
por el backend, **Firebase quedó redundante** y se decidió **retirarlo**: todo se
guarda en PostgreSQL. **Nueva arquitectura**:

```
ESP32 → Spring Boot API (/api/device/**) → PostgreSQL → Web / Flutter / IA
```

- El ESP32 publica vía REST con token de estación → JWT de dispositivo (handshake
  `/api/device/auth` + `/data`); el backend valida y **persiste en PostgreSQL**
  (`lectura_actual` + `lecturas` time-series). **Sin Firebase** (un único datastore).
- Nueva **gobernanza de estaciones**: entidad `Station` (PENDING/APPROVED/REJECTED/
  DISABLED), tokens rotables, solicitudes de registro, escuelas, rol `RESPONSABLE`,
  historial de conexiones.
- **Especificaciones refactorizadas a v3** en `specs/001-weatherstation-backend/`
  (spec, plan, data-model, diagramas, research, contracts, tasks, quickstart) y
  **constitución en v3.0.0** (Principio I = backend dueño de Postgres+Gemini;
  Principio VII = ESP32 cliente no confiable; Principio VIII = gobernanza; Firebase
  retirado de las restricciones). Pendiente: **aprobar las specs** y luego
  implementar las Fases 9–15 de `tasks.md` (SDD — no codear hasta aprobar).
- **Añadidos v3.1** (constitución v3.1.0): tier **público sin cuenta**
  `/api/public/**` (estaciones + clima + stats agregadas), **con la IA solo para
  usuarios logueados**; **heartbeat** y **config remota** del dispositivo
  (`/api/device/heartbeat`, `/api/device/config`) sin telemetría de batería; estado
  **MAINTENANCE** + conectividad ONLINE/OFFLINE derivada; **alertas de salud**
  (estación desconectada, sensor sin respuesta); **estadísticas avanzadas** por
  escuela/municipio/día/mes. El front tendrá una vista pública sin login.
- **Qué se reutiliza vs se rehace**: ver la tabla "Cambio de arquitectura v1 → v3"
  en `specs/001-weatherstation-backend/tasks.md`. Lo de abajo (v1) queda como base.
- **Implementación v3 — Fase 8b ✅ (2026-06-28)**: baseline verde del backend v1
  (`./mvnw -DskipTests compile` → EXIT 0, 93 clases, Java 21). Módulos reutilizados
  verificados y mapeados a su fase de adaptación (T0a).
- **Implementación v3 — Fase 9 ✅ (2026-06-28)**: fundacional. Migración Flyway
  `V3__red_estaciones.sql` (escuelas, estaciones, station_tokens, solicitudes,
  connection_logs, permisos/rol_permisos, lectura_actual, lecturas) + entidades JPA
  + enums (`EstadoEstacion`+MAINTENANCE, `Conectividad`, `EstadoSolicitud`,
  `EventoConexion`; `Rol`+RESPONSABLE) + 8 repos + `TokenGenerator` (SHA-256) +
  `UnauthorizedStationException`. Compila (123 clases) y las migraciones aplican
  limpio en PostgreSQL 16. **Firebase y `estaciones_admin` se conservan** hasta la
  Fase 13 (retirada reubicada a T129c) para no romper el build.
- **Implementación v3 — Fase 10 ✅ (2026-06-28)**: escuelas + rol RESPONSABLE.
  DTOs/Mapper/Service/Controller de escuela (`/escuelas/**`, escritura ADMIN; guard
  de borrado), `UsuarioService`/DTOs con `escuelaId` (obligatorio si RESPONSABLE).
  Compila (128 clases) y **smoke test E2E verde** contra Postgres+Firebase reales
  (Flyway aplica V1→V3 al arrancar; CRUD escuelas, 409 clave duplicada, 400
  ESCUELA_REQUERIDA, 201 con escuelaNombre, 204 borrado, 401 sin token).
- **Implementación v3 — Fase 11 ✅ (2026-06-28)**: gobernanza de estaciones.
  `StationService` (máquina de estados PENDING/APPROVED/REJECTED/DISABLED/MAINTENANCE
  + autorización por propiedad de escuela), `StationTokenService` (token `stk_`,
  hash SHA-256, rotación), `ConnectionLogService`, `SolicitudService`, controllers
  `Station`/`Solicitud` (acciones POST/PUT/DELETE sobre `/estaciones` que conviven
  con los GET de v1), `CurrentUserService`, reglas en `SecurityConfig`. Clases
  `Station*` para no chocar con `Estacion*` de v1. Compila (145 clases) y **smoke
  test E2E verde** (registrar→aprobar→token→regenerar→estados; RESPONSABLE limitado
  a su escuela; tokens solo hasheados en BD).
- **Implementación v3 — Fase 12 ✅ (2026-06-28)**: ingesta del dispositivo. JWT de
  dispositivo (`DeviceJwtService`/`DeviceJwtFilter`, secreto separado, aislamiento
  usuario↔dispositivo), `DeviceAuthService` (handshake), `LecturaValidator` (→422),
  `IngestaService` (upsert `lectura_actual` + histórico por cadencia, idempotente),
  `HeartbeatService`, `DeviceConfigService`, `DeviceController`
  (`/api/device/register|auth|data|heartbeat|config`), rate limiting. Compila (160
  clases) y **smoke E2E verde** (flujo register→aprobar→device-auth→data→Postgres;
  422/401/403/aislamiento/rotación/heartbeat/config/solicitud). **Fix**: logs de
  conexión de fallo con `REQUIRES_NEW` para sobrevivir al rollback. **🎯 El flujo
  nuevo de datos funciona de punta a punta.**
- **Implementación v3 — Fase 13 ✅ (2026-06-28)**: 🎯 **Firebase retirado por
  completo.** `WeatherDataService` (fuente Postgres de lecturas), `EstacionConsultaService`
  + `EstacionController` reescrito (lee de `lectura_actual`/`lecturas`, visibilidad
  por rol), `IaService`/`AlertaRuleEngine` sobre Postgres, **alertas de salud**
  (ESTACION_DESCONECTADA/SENSOR_SIN_RESPUESTA), **estadísticas avanzadas**
  (`/estadisticas`). Eliminados `firebase-admin`, `FirebaseConfig`, paquete
  `firebase/`, `EstacionAdmin*`; tabla `estaciones_admin` retirada (V4). Compila
  (154 clases) y **smoke verde: la app arranca SIN Firebase**, consulta/IA/alertas
  leen Postgres. **Bug corregido**: `alertas.tipo VARCHAR(20)`→`(30)` (V5) para
  `ESTACION_DESCONECTADA`.
- **Implementación v3 — Fase 13b ✅ (2026-06-28)**: API pública sin cuenta.
  `PublicService` + `PublicController` (`/api/public/stations|weather/latest|statistics`,
  solo APPROVED, datos no sensibles), `/api/public/**` `permitAll` + rate limit por
  IP. Compila (159 clases) y **smoke verde** (público ve solo aprobadas; IA y
  gestión exigen cuenta → 401).
- **Implementación v3 — Fase 14 ✅ (2026-06-28)**: despliegue y seguridad.
  `render.yaml`/`DEPLOY.md` sin Firebase + `DEVICE_JWT_SECRET` (autogenerado);
  revisión de seguridad (token de estación solo hasheado, secretos cubiertos);
  Swagger publica **38 rutas** (`OpenApiConfig` a 3.1.0); **rendimiento holgado**
  (p95 local: /actual 14 ms, /historial 24h 18 ms, ingesta 4 ms vs SC <1–2 s).
  ⚠️ Acción del usuario: rotar el token legacy de Firebase en la consola.

- **Implementación v3 — Fase 15 ✅ (2026-06-28)**: front + firmware.
  **Front CLIMBOT** migrado a la API v3 y **compila** (`npm run build` ✓): tipos/
  queries/displays a `StationResponse` (uuid/estado/conectividad), rutas por uuid,
  **vista pública sin cuenta** (`/publico`, sin IA), panel admin de **escuelas**,
  **gobernanza de estaciones** (registrar/aprobar/rechazar/estados + token una vez +
  conexiones), **solicitudes**, rol RESPONSABLE. **Firmware ESP32 v3**
  (`ESTACION1_ESP32_v3.txt`): pines/sensores/BLE intactos, Firebase→REST
  (`/api/device/auth|data|heartbeat`), envío cada 60 s.

## 🏁🏁 PIVOTE v3 COMPLETO — backend + front + firmware

## 🏁 BACKEND v3 COMPLETO (Fases 8b–14)
El backend es **100% PostgreSQL, sin Firebase**, verificado en runtime contra
Postgres real en cada fase. Falta solo la **Fase 15** (front CLIMBOT + firmware
ESP32), componentes separados. Para desplegar en Render: rellenar env vars
(`SPRING_DATASOURCE_*`, `GEMINI_API_KEY`, ADMIN_*) — `JWT_SECRET`/`DEVICE_JWT_SECRET`
se autogeneran. 3 bugs hallados y corregidos por los smoke tests durante el camino
(rotación de logs `REQUIRES_NEW`, `alertas.tipo VARCHAR(20)→(30)`, batería descartada).

---

## Componentes

| Carpeta | Qué es | Estado |
|---------|--------|--------|
| `WeatherStation_ESP32/` | Firmware de las estaciones (referencia, **no se modifica**) | — |
| `WeatherStation_Backend/` | API REST (Java 21 / Spring Boot) — único acceso a Firebase y Gemini | ✅ Completo, listo para Render |
| `WeatherStation_Front/` | Panel web **CLIMBOT** (React + Vite + TS) | ✅ Funcional, falta deploy |
| `WeatherStation_MOVIL/` | App móvil **React Native + Expo** (consume el backend Spring) | 🔄 US1–US4 hechas y verificadas (typecheck/bundle/tests); falta prueba BLE con ESP32 real |
| `WeatherStation_MOVIL_Flutter/` | App Flutter **obsoleta** (apuntaba a Firebase). Archivada como referencia; reemplazada por `WeatherStation_MOVIL/` | 🗄️ Archivada |
| `WeatherStation_WEB/` | Dashboard HTML viejo (referencia, reemplazado por el front React) | — |
| `specs/001-weatherstation-backend/` | Especificaciones SDD (spec-kit) — backend | ✅ |
| `specs/002-app-movil/` | Especificaciones SDD — app móvil React Native (spec→plan→tasks) | ✅ |

## Arquitectura

```
ESP32 → Firebase RTDB → [Backend Spring] → Frontend React (CLIMBOT) / Flutter
                              ├→ PostgreSQL (usuarios, tokens, alertas, logs, config)
                              └→ Gemini API (IA)
```

El **backend es el único** con acceso a Firebase y Gemini. Los clientes solo usan
la API REST (JWT + roles ADMIN/INVESTIGADOR/USUARIO).

## Backend — hecho y verificado (datos reales)

Fases 0–8 (ver `specs/001-weatherstation-backend/tasks.md`):
auth JWT (login/register/refresh+rotación), estaciones (clima actual/históricos/
estadísticas desde Firebase), IA con Gemini (grounded + rate limit), motor de
alertas (`@Scheduled`, dedup/resolución), admin (usuarios + metadata estaciones),
y empaquetado Docker + `render.yaml` + `DEPLOY.md`.

Ajustes posteriores: CORS para el front (5173/4173) y **activar/desactivar
estaciones** (filtra deshabilitadas para no-admin; metadata en PostgreSQL, sin
tocar Firebase).

## Frontend CLIMBOT — hecho

Vista pública (estaciones + clima + detalle), asistente IA, históricos + descarga
CSV (INVESTIGADOR/ADMIN), panel admin (usuarios, activar/desactivar estaciones,
alertas), modo oscuro, fondos animados (aurora + cielo por clima) y branding
CLIMBOT. Detalle en `WeatherStation_Front/README.md`.

## Cómo correr todo en local

1. **PostgreSQL** (Docker):
   ```bash
   docker run --name ws-pg-local -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=weatherstation -p 5433:5432 -d postgres:16
   ```
2. **Backend** (necesita la service account de Firebase y la API key de Gemini por
   variables de entorno — ver `WeatherStation_Backend/DEPLOY.md`):
   ```bash
   cd WeatherStation_Backend
   export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/weatherstation
   export SPRING_DATASOURCE_USERNAME=postgres SPRING_DATASOURCE_PASSWORD=postgres
   export FIREBASE_CREDENTIALS_PATH=/ruta/a/service-account.json
   export FIREBASE_DB_URL=https://weatherstation-esp32-fbc62-default-rtdb.firebaseio.com
   export GEMINI_API_KEY=<tu-key>
   ./mvnw -DskipTests package && java -jar target/WeatherStation_Backend-0.0.1-SNAPSHOT.jar
   ```
   Usuario ADMIN inicial: `admin@weatherstation.local` / `Admin12345` (cambiar).
3. **Frontend**:
   ```bash
   cd WeatherStation_Front && npm install && npm run dev   # http://localhost:5173
   ```

## Pendiente

- **Despliegue**: backend en Render (`render.yaml`/`DEPLOY.md`) y front en Vercel
  (`VITE_API_URL`, `vercel.json` con rewrite SPA, dominio en `CORS_ALLOWED_ORIGINS`).
- **Seguridad**: rotar el token legacy de Firebase del firmware; cambiar las
  credenciales ADMIN por defecto.
- Opcional: tests automatizados (Testcontainers), conectar la app Flutter a la API.

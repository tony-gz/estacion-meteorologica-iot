# Plan de Implementación: WeatherStation Backend v3 (Red de Estaciones)

**Branch**: `001-weatherstation-backend` | **Date**: 2026-06-28 (v2) | **Spec**: [spec.md](./spec.md)

Documentos asociados: [research.md](./research.md) · [data-model.md](./data-model.md)
· [diagramas.md](./diagramas.md) · [contracts/](./contracts/) ·
[quickstart.md](./quickstart.md) · [tasks.md](./tasks.md)

## Summary

Backend Spring Boot (Java 21) que es el **gateway único y el administrador** de una
red de estaciones meteorológicas multi-escuela. Las estaciones ESP32 publican sus
lecturas **a través del backend** (`/api/device/**`); el backend las valida y las
**persiste en PostgreSQL** (almacén único, sin Firebase). Gobierna el ciclo de vida
de cada estación (registro → aprobación → token → conexión → deshabilitación) y
persiste en PostgreSQL **todos** los datos: usuarios, roles, permisos, escuelas,
estaciones, tokens de estación, solicitudes, refresh tokens, **lecturas (actual +
histórico time-series)**, logs de conexión y auditoría, alertas y configuración.
Expone una API REST segura con JWT + roles (usuarios) y token→JWT de dispositivo
(estaciones), calcula estadísticas (SQL) y alertas, y fundamenta la IA en datos
reales. Arquitectura en capas con DTOs en la frontera.

## Technical Context

**Language/Version**: Java 21 · **Framework**: Spring Boot 3.5.16 (Web, Data JPA,
Security, Validation).

**Primary Dependencies** (ya presentes desde v1): jjwt (JWT usuarios y
dispositivos), springdoc-openapi, bucket4j (rate limiting IA+dispositivo), flyway,
Lombok, **spring-boot-starter-mail** (Jakarta Mail para notificaciones de token).
Cliente Gemini vía `RestClient`. **Se retira** `firebase-admin`.

**Storage**: **PostgreSQL como almacén único** (sistema + gobernanza + lecturas
meteorológicas) vía JPA + Flyway. Lecturas en `lectura_actual` (upsert por estación)
y `lecturas` (histórico time-series). Sin Firebase.

**External Services**: Gemini API (único externo).

**Testing**: JUnit 5 + Spring Boot Test + Spring Security Test; Testcontainers
(PostgreSQL); fake para Gemini; pruebas del flujo de dispositivo (auth handshake +
ingesta + validación + persistencia).

**Target Platform**: Contenedor Linux en **Render**.

**Project Type**: Servicio web (API REST) — backend único `WeatherStation_Backend`.

**Performance Goals**: dato actual < 1 s p95; historial 24 h < 2 s p95; ingesta
`/api/device/data` < 1 s p95 (SC-006/007).

**Constraints**: stateless (JWT); secretos solo por entorno; **el ESP32 nunca
accede a la base de datos**; rate limiting en IA y dispositivo; un único datastore
(PostgreSQL).

**Scale/Scope**: red multi-escuela (decenas de escuelas, cientos de estaciones,
miles de usuarios), 39 requisitos funcionales, ~30 endpoints REST, 4 roles, 3
reglas de alerta iniciales, máquina de estados de estación de 4 estados.

## Constitution Check (v3.1.0)

*GATE: debe pasar antes de la fase de diseño y re-verificarse al final.*

| Principio | Cumplimiento en este plan |
|-----------|---------------------------|
| I. Gateway único (acceso exclusivo a PostgreSQL + Gemini) | Solo el backend accede a la BD; ESP32 y clientes pasan por la API. El tier público `/api/public/**` es solo lectura de datos no sensibles; la IA exige cuenta. ✅ |
| II. SDD | Plan derivado de `spec.md` v3; tareas en `tasks.md`. Sin código hasta aprobación. ✅ |
| III. Capas + SOLID | Paquetes por capas; `device`/`station`/`escuela` añadidos; Gemini tras interfaz. ✅ |
| IV. DTOs en frontera | Todos los endpoints usan DTOs; el token de estación en claro solo en `StationTokenResponse` (una vez). ✅ |
| V. Seguridad | JWT usuarios + JWT dispositivo + BCrypt + roles + propiedad por escuela + rate limiting IA/dispositivo/público + manejo global + secretos por entorno; tier público solo lectura. ✅ |
| VI. IA fundamentada | `IaService` lee de PostgreSQL → contexto → Gemini con prompt restrictivo. ✅ |
| VII. ESP32 cliente no confiable | Toda lectura entra por `/api/device/data`, validada antes de persistir. ✅ |
| VIII. Gobernanza de estaciones | Registro/aprobación/token/estado/conexiones implementados en `station`/`device`. ✅ |

**Resultado**: PASS. Sin violaciones que requieran *Complexity Tracking*.

## Arquitectura del Sistema

### Vista de contexto

```
[ESP32 x N] --REST /api/device/**--> [WeatherStation Backend] --JDBC (lee/escribe)--> [PostgreSQL]
                                            +--REST--> [Flutter / Web]
                                            +--HTTPS--> [Gemini API]
```

El backend es la **única** frontera de confianza con acceso a PostgreSQL y Gemini,
y el **único** que persiste lecturas. (Detalle en `diagramas.md`.)

### Capas y responsabilidades

| Capa | Responsabilidad | Conoce a |
|------|-----------------|----------|
| **controller** | HTTP usuarios: validación, mapeo DTO, códigos | service, dto |
| **device.controller** | HTTP dispositivos: handshake e ingesta | service, dto |
| **service** | Negocio: auth, gobernanza de estaciones, ingesta, escuelas, estadísticas, alertas, IA | repository, adaptadores, mapper |
| **repository** | Persistencia PostgreSQL (JPA): sistema + lecturas | entity |
| **gemini (cliente)** | Prompt e invocación de Gemini | Gemini API |
| **security** | Filtros JWT (usuario y dispositivo), authz por rol y propiedad | service, util |
| **dto / mapper / entity** | Contratos de frontera, conversión, modelo persistente | — |
| **exception / config** | Manejo global; beans OpenAPI, CORS, rate limit, scheduling | — |

### Decisiones arquitectónicas clave (detalle en `research.md`)

1. **Lecturas en PostgreSQL** (R1): `lectura_actual` (upsert por estación) +
   `lecturas` (histórico time-series idempotente); estadísticas por SQL. Sin Firebase.
2. **Ingesta validada** (`IngestaService`): valida rangos/timestamp antes de
   persistir; rechaza inválidas (R2).
3. **Auth de dispositivo en dos pasos**: token permanente (hasheado) →
   `/api/device/auth` → JWT de dispositivo corto → `/api/device/data` (R12/R13).
4. **Gobernanza de estaciones**: máquina de estados PENDING/APPROVED/REJECTED/
   DISABLED; tokens rotables; solicitudes; logs de conexión (R7, Principio VIII).
5. **Multi-escuela**: rol `RESPONSABLE` + autorización por propiedad de escuela
   (R14).
6. **Rate limiting** en `/ia/**` (por usuario) y `/api/device/**` (por estación/IP)
   (R5).
7. **Dos secretos JWT**: `JWT_SECRET` (usuarios) y `DEVICE_JWT_SECRET` (dispositivos)
   para rotación independiente (R8/R12).

## Project Structure

### Documentación (este feature)

```text
specs/001-weatherstation-backend/
├── spec.md · plan.md · research.md · data-model.md · diagramas.md
├── contracts/{openapi.yaml, README.md}
└── tasks.md
```

### Estructura de Paquetes (Source Code)

Base package: `com.tony.wheatherstation` (se conserva el typo "wheather" del
proyecto generado). Se añaden los paquetes `device`, `station`, `escuela`.

```text
WeatherStation_Backend/src/main/java/com/tony/wheatherstation/
├── config/         SecurityConfig · OpenApiConfig · CorsConfig
│                   RateLimitConfig · SchedulingConfig
├── security/       JwtAuthenticationFilter · JwtService · CustomUserDetailsService
│                   JwtAuthEntryPoint · RateLimitFilter
│                   device/ DeviceJwtFilter · DeviceJwtService           # 🆕
├── controller/     AuthController · UsuarioController · EstacionController
│                   IaController · AlertaController
│                   EscuelaController · SolicitudController               # 🆕
│                   PublicController (/api/public/**, sin auth)           # 🆕
├── device/         DeviceController (/api/device/** incl. heartbeat, config)  # 🆕
│                   DeviceAuthService · IngestaService · LecturaValidator
│                   HeartbeatService · DeviceConfigService               # 🆕
├── station/        StationService (gobernanza) · StationTokenService     # 🆕
│                   SolicitudService · ConnectionLogService
├── service/        AuthService · UsuarioService · EstacionQueryService
│                   EstadisticaService · AlertaService · AlertaRuleEngine
│                   IaService · EscuelaService                            # 🆕
├── gemini/         GeminiClient · GeminiClientImpl · PromptBuilder
├── repository/     Usuario · RefreshToken · Alerta · Configuracion · Log
│                   Escuela · Estacion · StationToken · Solicitud · ConnectionLog  # 🆕
│                   Permiso · RolPermiso                                  # 🆕
│                   LecturaActual · Lectura  (lecturas en Postgres)       # 🆕
├── entity/         Usuario · RefreshToken · Alerta · LogAuditoria · Configuracion
│                   Escuela · Estacion · StationToken · SolicitudRegistro
│                   ConnectionLog · Permiso · LecturaActual · Lectura (+ enums)  # 🆕
├── domain/         LecturaMeteorologica · EstadisticasClima
├── dto/            auth/ · usuario/ · estacion/ · ia/ · alerta/ · common/
│                   escuela/ · device/                                    # 🆕
├── mapper/         Usuario · Estacion · Lectura · Alerta · Escuela · Conexion  # 🆕
├── exception/      GlobalExceptionHandler · ResourceNotFound · Business
│                   RateLimitExceeded · ExternalService · UnauthorizedStation 🆕
└── util/           TimeUtils · Constantes · TokenGenerator               # 🆕

src/main/resources/
├── application.yaml (+ dev/prod)
└── db/migration/   V1__init.sql … V2 … V3__red_estaciones.sql            # 🆕
```

**Structure Decision**: backend único; se conserva el package
`com.tony.wheatherstation`. Los nuevos módulos `device`, `station` y `escuela`
siguen el principio III; Gemini permanece tras interfaz (DIP). **Se elimina** el
paquete `firebase/` y `FirebaseConfig`: las lecturas son repositorios JPA.

## Modelo de Autenticación (deliverable 10)

> Flujos en `diagramas.md` (§4 dispositivo, §6 usuario). DTOs en `data-model.md`.

### Usuarios (sin cambios respecto a v1)
- JWT Bearer `Authorization: Bearer <accessToken>`; access corto (HS256,
  `JWT_SECRET`), claims `sub`, `rol`, `iat`, `exp`, `jti`.
- Refresh opaco persistido con rotación y detección de reutilización.
- Login/register/refresh como v1; `register` crea `USUARIO`; `RESPONSABLE` y demás
  roles los asigna ADMIN.

### Dispositivos (nuevo)
- **Token de estación**: secreto permanente generado al aprobar; almacenado
  **hasheado** (`station_tokens`); mostrado en claro una sola vez.
- **Handshake** `POST /api/device/auth {uuid, token}` → valida estación `APPROVED`
  + hash + token activo → emite **JWT de dispositivo** (HS256, `DEVICE_JWT_SECRET`,
  claims `sub=uuid`, `type=DEVICE`, `exp` corto = `device.jwt.exp_min`).
- **Ingesta** `POST /api/device/data` con `Authorization: Bearer <deviceToken>`;
  `DeviceJwtFilter` valida el JWT y exige `type=DEVICE`.
- **Aislamiento de tokens**: el filtro de usuario rechaza JWT con `type=DEVICE` en
  rutas de usuario; el filtro de dispositivo rechaza los de usuario en `/api/device/data`.

### Autorización
- `SecurityFilterChain` con reglas por ruta + `@PreAuthorize`; mapeo rol→authority
  (`ROLE_ADMIN`/`ROLE_RESPONSABLE`/`ROLE_INVESTIGADOR`/`ROLE_USUARIO`).
- **Propiedad por escuela**: para RESPONSABLE, el service verifica que la
  estación/solicitud pertenezca a su `escuelaId` (R14).
- Fallos: sin/ inválido → `401` (`JwtAuthEntryPoint`); rol/propiedad insuficiente →
  `403` (`AccessDeniedHandler`); todo en `ApiError`.
- Stateless; CSRF deshabilitado (API con JWT).

## Estrategia de Pruebas

- **Unitarias**: services con fake de `GeminiClient`; `LecturaValidator` con
  datasets límite; `StationTokenService` (rotación/revocación); estadísticas SQL;
  máquina de estados de estación.
- **Slice web**: `@WebMvcTest` por controller (incl. `DeviceController`) validando
  contratos, autorización por rol y por propiedad.
- **Integración**: Testcontainers PostgreSQL; flujo completo registro→aprobación→
  token→`/api/device/auth`→`/api/device/data`→(persistencia en Postgres)→
  `/estaciones/{id}/actual`; rate limit de dispositivo; regeneración de token
  invalida el anterior; idempotencia del histórico.
- **Contrato**: validación contra `contracts/openapi.yaml`.

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Token de estación filtrado | Almacenamiento hasheado; regenerar revoca el anterior; auditoría de uso. |
| Abuso/saturación de la ingesta | Rate limiting por estación/IP; validación estricta; `429`. |
| Reloj del ESP32 desfasado | Ventana de validación de `timestamp` + sello `recibido_en`. |
| Inserciones duplicadas del histórico | `UNIQUE (estacion_id, timestamp)` → inserción idempotente. |
| Crecimiento del histórico | Índices adecuados; opción de particionar `lecturas`/TimescaleDB sin cambiar el modelo. |
| Migración v1→v3 rompe el front | Migración por fases; reutilización de auth/IA/alertas; front se adapta incrementalmente. |
| Secreto BD/Gemini/JWT filtrado | Solo variables de entorno; `DEVICE_JWT_SECRET` separado; revisión en CI. |
| Render free tier "duerme" | Documentar cold start; el ESP32 reintenta el handshake. |

## Complexity Tracking

> Sin violaciones de la constitución v3.0.0. El incremento de complejidad
> (gobernanza de estaciones, ingesta, multi-escuela) es **requisito**, no
> sobre-ingeniería: deriva del cambio de arquitectura aprobado. La consolidación en
> PostgreSQL **reduce** complejidad (un datastore menos).

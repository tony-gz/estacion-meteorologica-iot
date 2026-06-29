# Modelo de Dominio y DTOs — WeatherStation Backend (v2)

Cubre los deliverables **3 (modelo de dominio)** y **9 (modelos DTO)**. Se divide
en: (A) entidades persistidas en **PostgreSQL** (sistema + gobernanza), (B)
**lecturas meteorológicas** persistidas en **PostgreSQL** como series temporales, y
(C) **DTOs** de frontera.

> **Persistencia única: PostgreSQL** (constitución v3.0.0). No hay Firebase: el
> backend valida cada lectura recibida y la guarda en la base de datos. Tipos en
> notación Java. Las entidades NUNCA se serializan hacia el cliente (principio IV):
> siempre se mapean a DTOs. El **token en claro** de una estación solo se devuelve
> **una vez** (al generar/regenerar); en BD se guarda **hasheado**.

---

## A. Entidades PostgreSQL (datos del sistema)

### Diagrama Entidad-Relación

```mermaid
erDiagram
    ESCUELA ||--o{ USUARIO : "tiene responsables"
    ESCUELA ||--o{ ESTACION : "agrupa"
    ESCUELA ||--o{ SOLICITUD_REGISTRO : "recibe"
    USUARIO ||--o{ REFRESH_TOKEN : tiene
    USUARIO ||--o{ LOG_AUDITORIA : genera
    USUARIO ||--o{ ESTACION : "es responsable de"
    USUARIO ||--o{ SOLICITUD_REGISTRO : "solicita"
    ROL ||--o{ ROL_PERMISO : agrupa
    PERMISO ||--o{ ROL_PERMISO : se_asigna
    ESTACION ||--o{ STATION_TOKEN : "autentica con"
    ESTACION ||--o{ CONNECTION_LOG : "registra"
    ESTACION ||--o{ ALERTA : "origina (por uuid)"
    ESTACION ||--|| LECTURA_ACTUAL : "tiene última"
    ESTACION ||--o{ LECTURA : "acumula histórico"
    SOLICITUD_REGISTRO ||--o| ESTACION : "se materializa en"

    ESCUELA {
        UUID id PK
        string nombre
        string clave UK "CCT u otra clave"
        string municipio
        string ubicacion
        double latitud
        double longitud
        string contactoEmail
        instant createdAt
        instant updatedAt
    }
    USUARIO {
        UUID id PK
        string nombre
        string email UK
        string passwordHash
        enum rol
        UUID escuelaId FK "nullable; obligatorio si RESPONSABLE"
        boolean activo
        instant createdAt
        instant updatedAt
    }
    ESTACION {
        UUID id PK
        UUID uuid UK "identificador público de la estación"
        string nombre
        UUID escuelaId FK
        UUID responsableId FK "usuario responsable"
        string ubicacion
        string municipio
        double latitud
        double longitud
        string firmware
        enum estado "PENDING|APPROVED|REJECTED|DISABLED"
        instant fechaRegistro
        instant ultimaConexion
        string motivoRechazo
        instant createdAt
        instant updatedAt
    }
    STATION_TOKEN {
        UUID id PK
        UUID estacionId FK
        string tokenHash UK
        boolean activo
        instant creadoEn
        instant revocadoEn
        instant ultimoUsoEn
    }
    SOLICITUD_REGISTRO {
        UUID id PK
        UUID uuidPropuesto
        string nombre
        UUID escuelaId FK
        UUID solicitanteId FK "nullable (auto-registro device)"
        string ubicacion
        string municipio
        double latitud
        double longitud
        string firmware
        enum estado "PENDING|APPROVED|REJECTED"
        string motivoRechazo
        UUID estacionId FK "set al aprobar"
        instant createdAt
        instant resueltaEn
        UUID resueltaPor FK
    }
    CONNECTION_LOG {
        UUID id PK
        UUID estacionId FK "nullable si no identificada"
        string uuidReportado
        string ip
        string firmware
        enum evento "AUTH_OK|AUTH_FAIL|DATA_OK|DATA_REJECTED|UNAUTHORIZED"
        string detalle
        instant createdAt
    }
    REFRESH_TOKEN {
        UUID id PK
        UUID usuarioId FK
        string tokenHash UK
        instant expiraEn
        boolean revocado
        UUID reemplazadoPor
        instant createdAt
    }
    ALERTA {
        UUID id PK
        UUID estacionUuid
        enum tipo
        enum severidad
        string mensaje
        double valorDisparo
        string variableDisparo
        enum estado
        instant detectadaEn
        instant resueltaEn
    }
    LOG_AUDITORIA {
        UUID id PK
        UUID usuarioId FK
        string accion
        string recurso
        string ip
        instant createdAt
    }
    CONFIGURACION {
        string clave PK
        string valor
        string descripcion
        instant updatedAt
    }
    LECTURA_ACTUAL {
        UUID estacionId PK_FK "una fila por estación (upsert)"
        instant timestamp
        instant recibidoEn
        double temperatura
        double humedad
        double presion
        double vientoKmh
        string vientoDir
        double vientoGrados
        double lluviaMm
    }
    LECTURA {
        bigint id PK
        UUID estacionId FK
        instant timestamp "clave natural con estacionId"
        instant recibidoEn
        double temperatura
        double humedad
        double presion
        double vientoKmh
        string vientoDir
        double lluviaMm
    }
```

### A.1 `Escuela` (`escuelas`) 🆕

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `id` | `UUID` | PK | |
| `nombre` | `String` | not null, 2–150 | |
| `clave` | `String` | único, nullable | CCT u otra clave oficial |
| `municipio` | `String` | | |
| `ubicacion` | `String` | | dirección/descripción |
| `latitud` / `longitud` | `Double` | nullable | ubicación de referencia |
| `contactoEmail` | `String` | nullable, formato email | |
| `createdAt` / `updatedAt` | `Instant` | auditoría | |

**Reglas**: no se elimina una escuela con estaciones activas (o se exige
reasignación). Una estación y un `RESPONSABLE` pertenecen a una escuela.

### A.2 `Usuario` (`usuarios`)

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `id` | `UUID` | PK | |
| `nombre` | `String` | not null, 2–100 | |
| `email` | `String` | not null, **único**, email | login |
| `passwordHash` | `String` | not null | BCrypt; nunca en DTO |
| `rol` | `Rol` (enum) | not null | ver A.3 |
| `escuela` | `Escuela` | FK nullable | **obligatorio si `rol = RESPONSABLE`** |
| `activo` | `boolean` | default true | baja lógica |
| `createdAt` / `updatedAt` | `Instant` | auditoría | |

### A.3 `Rol` (enum) y `Permiso` (granularidad)

```java
public enum Rol { ADMIN, RESPONSABLE, INVESTIGADOR, USUARIO }
```
Mapeo a authorities de Spring Security: `ROLE_ADMIN`, `ROLE_RESPONSABLE`,
`ROLE_INVESTIGADOR`, `ROLE_USUARIO`.

Para granularidad (solicitada: *usuarios, roles, permisos*), se modelan tablas
`permisos` (`id`, `nombre`, `descripcion`) y `rol_permisos` (`rol`, `permisoId`).
En v2 la autorización efectiva se resuelve por **rol**; los permisos finos son
una extensión declarativa (p. ej. `ESTACION_APROBAR`, `ESTACION_REGISTRAR`,
`HISTORICO_VER`, `USUARIO_GESTIONAR`) que documenta y permite evolucionar sin
cambiar el enum.

### A.4 `Estacion` (`estaciones`) 🆕 — reemplaza a `EstacionAdmin`

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `id` | `UUID` | PK | identificador interno |
| `uuid` | `UUID` | único | identificador **público**; usado en `/api/device/auth` y en las rutas REST `{id}` |
| `nombre` | `String` | not null | |
| `descripcion` | `String` | nullable | texto libre |
| `escuela` | `Escuela` | FK not null | |
| `responsable` | `Usuario` | FK nullable | usuario responsable |
| `ubicacion` | `String` | | |
| `municipio` | `String` | | |
| `latitud` / `longitud` | `Double` | nullable | |
| `altitud` | `Double` | nullable | msnm |
| `firmware` | `String` | nullable | último firmware reportado (heartbeat/auth) |
| `hardware` | `String` | nullable | modelo de hardware reportado |
| `ultimoRssi` | `Integer` | nullable | último RSSI reportado en heartbeat (dBm) |
| `estado` | `EstadoEstacion` (enum) | not null, default `PENDING` | `PENDING`/`APPROVED`/`REJECTED`/`DISABLED`/`MAINTENANCE` |
| `fechaRegistro` | `Instant` | not null | |
| `ultimaConexion` | `Instant` | nullable | última publicación/heartbeat aceptado |
| `motivoRechazo` | `String` | nullable | si `REJECTED` |
| **Config remota** | | | (servida por `GET /api/device/config`) |
| `intervaloEnvioSeg` | `Integer` | default 60 | cadencia de envío de lecturas |
| `muestreoSeg` | `Integer` | default 5 | cadencia de muestreo de sensores |
| `zonaHoraria` | `String` | default `America/Mexico_City` | tz para timestamps |
| `createdAt` / `updatedAt` | `Instant` | auditoría | |

> La **conectividad** (`ONLINE`/`OFFLINE`) no es columna: se deriva de
> `ultimaConexion` + `estacion.offline.minutos`.

**Reglas de estado** (Principio VIII):
- Alta → `PENDING`. Solo un ADMIN puede pasar a `APPROVED` (genera token) o
  `REJECTED`.
- `APPROVED` ⇄ `DISABLED` (deshabilitar/reactivar) y `APPROVED` ⇄ `MAINTENANCE`
  (mantenimiento) por ADMIN.
- Solo `APPROVED` puede autenticarse en `/api/device/auth` y publicar (en
  `MAINTENANCE`/`DISABLED` la ingesta se rechaza con `403`).
- El `uuid` no cambia tras crearse (identificador estable de la estación).

```java
public enum EstadoEstacion { PENDING, APPROVED, REJECTED, DISABLED, MAINTENANCE }
```

### A.5 `StationToken` (`station_tokens`) 🆕

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `id` | `UUID` | PK | |
| `estacion` | `Estacion` | FK not null | |
| `tokenHash` | `String` | único, not null | hash (SHA-256/BCrypt) del token; **nunca** el valor en claro |
| `activo` | `boolean` | default true | a lo sumo **uno activo** por estación |
| `creadoEn` | `Instant` | not null | |
| `revocadoEn` | `Instant` | nullable | al regenerar/revocar |
| `ultimoUsoEn` | `Instant` | nullable | última autenticación correcta |

**Reglas**: al **aprobar** o **regenerar**, se revoca el token activo previo
(`activo=false`, `revocadoEn=now`) y se crea uno nuevo; el valor en claro se
entrega una sola vez en la respuesta. En `/api/device/auth` se valida que exista
un token activo cuyo hash coincida.

### A.6 `SolicitudRegistro` (`solicitudes_registro`) 🆕

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `UUID` (PK) | |
| `uuidPropuesto` | `UUID` | uuid que usará la estación si se aprueba |
| `nombre`, `ubicacion`, `municipio`, `latitud`, `longitud`, `firmware` | varios | datos declarados |
| `escuela` | `Escuela` (FK) | escuela destino |
| `solicitante` | `Usuario` (FK, nullable) | quién la pidió (null si auto-registro del dispositivo) |
| `estado` | `EstadoSolicitud` (enum) | `PENDING`/`APPROVED`/`REJECTED` |
| `motivoRechazo` | `String` | si `REJECTED` |
| `estacion` | `Estacion` (FK, nullable) | estación materializada al aprobar |
| `createdAt` / `resueltaEn` / `resueltaPor` | `Instant`/`Usuario` | auditoría |

> Una solicitud `APPROVED` materializa (o vincula) una `Estacion` en `APPROVED` y
> dispara la generación del token. El alta directa por ADMIN/RESPONSABLE puede
> crear la `Estacion` en `PENDING` sin pasar por `SolicitudRegistro`; ambas vías
> convergen en la misma estación.

```java
public enum EstadoSolicitud { PENDING, APPROVED, REJECTED }
```

### A.7 `ConnectionLog` (`connection_logs`) 🆕

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `UUID` (PK) | |
| `estacion` | `Estacion` (FK, nullable) | null si el uuid no corresponde a ninguna |
| `uuidReportado` | `String` | uuid que envió el dispositivo |
| `ip` | `String` | origen |
| `firmware` | `String` | firmware reportado |
| `evento` | `EventoConexion` (enum) | `AUTH_OK`/`AUTH_FAIL`/`DATA_OK`/`DATA_REJECTED`/`HEARTBEAT`/`UNAUTHORIZED` |
| `detalle` | `String` | motivo (p. ej. "token revocado", "presión inválida") |
| `createdAt` | `Instant` | |

> Permite el historial de conexiones (FR-014) y la detección de estaciones no
> autorizadas (FR-021). Nunca registra el token en claro.

### A.8 `RefreshToken` (`refresh_tokens`)

(Sin cambios respecto a v1.) `id`, `usuario` (FK), `tokenHash` (único), `expiraEn`,
`revocado`, `reemplazadoPor` (rotación), `createdAt`.

### A.9 `Alerta` (`alertas`)

Igual que v1, pero el identificador de estación pasa a ser el **`uuid`** de la
estación (`estacionUuid : UUID`, index) en lugar de un String libre.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `UUID` (PK) | |
| `estacionUuid` | `UUID` | index; referencia a `Estacion.uuid` |
| `tipo` | `TipoAlerta` | meteo: `LLUVIA`/`VIENTO_FUERTE`/`CALOR_EXTREMO`; salud: `ESTACION_DESCONECTADA`/`SENSOR_SIN_RESPUESTA` |
| `severidad` | `Severidad` | `BAJA`/`MEDIA`/`ALTA` |
| `mensaje` | `String` | |
| `valorDisparo` | `double` | |
| `variableDisparo` | `String` | |
| `estado` | `EstadoAlerta` | `ACTIVA`/`RESUELTA` |
| `detectadaEn` / `resueltaEn` | `Instant` | |

### A.10 `LogAuditoria` y `Configuracion`

Sin cambios funcionales respecto a v1. Nuevas claves de `configuracion` sugeridas:

`alerta.humedad.umbral=90`, `alerta.presion.caida_hpa=1.0`,
`alerta.viento.umbral=40`, `alerta.temp.umbral=38`, `ia.ratelimit.por_min=5`,
`ia.ratelimit.por_dia=100`, `estacion.offline.minutos=10`,
`device.ratelimit.por_min=30`, `device.jwt.exp_min=60`,
`device.timestamp.ventana_min=15`, `ingesta.historial.cada_min=10`.

---

## B. Lecturas Meteorológicas (PostgreSQL — escritas por el backend)

Las lecturas se persisten en **PostgreSQL** en dos tablas, replicando la
separación "actual vs histórico" de forma eficiente: una tabla de **lectura
actual** (una fila por estación, *upsert* en cada publicación) y una tabla de
**histórico** (serie temporal, insertada según cadencia). No hay Firebase.

### B.1 `LecturaActual` (`lectura_actual`) — snapshot por estación

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `estacionId` | `UUID` | **PK** + FK a `estaciones.id` | una sola fila por estación |
| `timestamp` | `Instant` | not null | hora de la lectura (normalizada) |
| `recibidoEn` | `Instant` | not null | sello de recepción del backend |
| `temperatura`/`humedad`/`presion`/`vientoKmh`/`lluviaMm` | `double` | | |
| `vientoDir` | `String` | nullable | cardinal |
| `vientoGrados` | `Double` | nullable | solo en la lectura actual |

**Reglas**: en cada `POST /api/device/data` válido se hace *upsert*
(`INSERT … ON CONFLICT (estacion_id) DO UPDATE`). Lectura O(1) para
`GET /estaciones/{id}/actual`.

### B.2 `Lectura` (`lecturas`) — histórico time-series

| Campo | Tipo | Restricciones | Notas |
|-------|------|---------------|-------|
| `id` | `Long` | PK (identity) | |
| `estacion` | `Estacion` | FK not null, index | |
| `timestamp` | `Instant` | not null | **único** junto con `estacionId` (idempotencia) |
| `recibidoEn` | `Instant` | not null | |
| `temperatura`/`humedad`/`presion`/`vientoKmh`/`lluviaMm` | `double` | | |
| `vientoDir` | `String` | nullable | (el histórico no guarda `viento_grados`) |

**Índices**: `UNIQUE (estacion_id, timestamp)` (inserción idempotente: reintentos
del ESP32 no duplican) e índice `(estacion_id, timestamp DESC)` para consultas por
rango. **Cadencia**: el histórico se inserta cada `ingesta.historial.cada_min`
(p. ej. 10 min) por estación; la lectura actual se actualiza siempre. **Escala**:
si el volumen crece, particionar por rango de tiempo (o adoptar TimescaleDB) sin
cambiar el modelo lógico.

### B.3 `LecturaMeteorologica` (record de dominio de entrada/salida)

```java
record LecturaMeteorologica(
    Instant timestamp,
    double temperatura,   // °C
    double humedad,       // %
    double presion,       // hPa
    double vientoKmh,     // km/h
    String vientoDir,     // texto cardinal
    Double vientoGrados,  // nullable (solo en lectura actual)
    double lluviaMm       // mm
) {}
```

**Validación de ingesta** (`POST /api/device/data`): rechazar lecturas con
`presion <= 0`, valores no finitos, `humedad` fuera de `[0,100]`, `vientoKmh < 0`,
o `timestamp` fuera de la ventana configurada. Las válidas se persisten en
`lectura_actual` (siempre) y, según la cadencia, en `lecturas`.

### B.4 `EstadisticasClima` (calculado por SQL)

```java
record EstadisticasClima(
    UUID estacionUuid, Instant desde, Instant hasta, int muestras,
    Agregado temperatura, Agregado humedad, Agregado presion,
    Agregado vientoKmh, double lluviaTotalMm
) {
    record Agregado(double min, double max, double promedio) {}
}
```

Se calcula con agregados SQL sobre `lecturas`
(`MIN/MAX/AVG(...)`, `SUM(lluvia_mm)`) filtrando por `estacion_id` y rango de
`timestamp` — en la base de datos, no en memoria.

---

## C. DTOs de Frontera

Convenciones: requests validados con Bean Validation; responses sin campos
sensibles; fechas en ISO-8601 con zona. Paquete raíz `…dto`.

### C.1 Autenticación de usuarios (`dto/auth`)

Sin cambios respecto a v1: `RegisterRequest`, `LoginRequest`, `RefreshRequest`,
`AuthResponse(accessToken, refreshToken, tokenType, expiresIn, UsuarioResponse)`.

### C.2 Usuarios (`dto/usuario`)

```java
record UsuarioRequest(
    @NotBlank @Size(min=2,max=100) String nombre,
    @NotBlank @Email String email,
    @NotBlank @Size(min=8,max=72) String password,
    @NotNull Rol rol,
    UUID escuelaId                 // requerido si rol = RESPONSABLE
) {}

record UsuarioUpdateRequest(
    @Size(min=2,max=100) String nombre, @Email String email,
    Rol rol, UUID escuelaId, Boolean activo,
    @Size(min=8,max=72) String password    // null = no cambiar
) {}

record UsuarioResponse(
    UUID id, String nombre, String email,
    Rol rol, UUID escuelaId, String escuelaNombre,
    boolean activo, Instant createdAt
) {}
```

### C.3 Escuelas (`dto/escuela`) 🆕

```java
record EscuelaRequest(
    @NotBlank @Size(max=150) String nombre,
    String clave, String municipio, String ubicacion,
    Double latitud, Double longitud, @Email String contactoEmail
) {}

record EscuelaResponse(
    UUID id, String nombre, String clave, String municipio,
    String ubicacion, Double latitud, Double longitud,
    String contactoEmail, int totalEstaciones, Instant createdAt
) {}
```

### C.4 Estaciones — gestión (`dto/estacion`) 🆕

```java
// POST /estaciones (ADMIN/RESPONSABLE) y POST /api/device/register
record EstacionRegistroRequest(
    @NotBlank @Size(max=120) String nombre,
    @NotNull UUID escuelaId,
    String ubicacion, String municipio,
    Double latitud, Double longitud,
    @Size(max=40) String firmware
) {}

// PUT /estaciones/{id}
record EstacionUpdateRequest(
    @Size(max=120) String nombre, String ubicacion, String municipio,
    Double latitud, Double longitud, UUID responsableId
) {}

// POST /estaciones/{id}/rechazar  ·  /deshabilitar (motivo opcional)
record EstacionAccionRequest(@Size(max=300) String motivo) {}

// GET /estaciones, GET /estaciones/{id}
record EstacionResponse(
    UUID id, UUID uuid, String nombre, String descripcion,
    UUID escuelaId, String escuelaNombre,
    UUID responsableId, String responsableNombre,
    String ubicacion, String municipio, Double latitud, Double longitud, Double altitud,
    String firmware, String hardware, Integer ultimoRssi,
    EstadoEstacion estado,           // ciclo de vida
    Conectividad conectividad,       // ONLINE/OFFLINE derivado de ultimaConexion
    Instant fechaRegistro, Instant ultimaConexion,
    boolean enLinea,                 // = conectividad == ONLINE (compat)
    LecturaResponse ultimaLectura    // opcional
) {}

// Respuesta de aprobar / regenerar-token — token en claro UNA sola vez
record StationTokenResponse(
    UUID estacionId, UUID uuid,
    String token,                    // valor en claro, mostrado una única vez
    Instant generadoEn,
    String aviso                     // "Guarde este token: no se volverá a mostrar"
) {}

// GET /estaciones/{id}/conexiones
record ConexionResponse(
    Instant timestamp, String ip, String firmware,
    String evento, String detalle
) {}
```

### C.5 Dispositivo (`dto/device`) 🆕

```java
// POST /api/device/auth  (handshake)
record DeviceAuthRequest(
    @NotNull UUID uuid,
    @NotBlank String token,          // token permanente de la estación
    @Size(max=40) String firmware    // firmware actual reportado (opcional)
) {}

record DeviceAuthResponse(
    String deviceToken,              // JWT de dispositivo de vida corta
    String tokenType,                // "Bearer"
    long   expiresIn                 // segundos
) {}

// POST /api/device/data  (Authorization: Bearer <deviceToken>)
record DeviceDataRequest(
    @NotNull @PastOrPresent Instant timestamp,
    @NotNull Double temperatura,
    @NotNull @DecimalMin("0") @DecimalMax("100") Double humedad,
    @NotNull @DecimalMin("0.1") Double presion,
    @NotNull @DecimalMin("0") Double vientoKmh,
    String vientoDir,
    @DecimalMin("0") @DecimalMax("360") Double vientoGrados,
    @NotNull @DecimalMin("0") Double lluviaMm
) {}

record DeviceDataResponse(
    String estado,                   // "ACEPTADA"
    Instant recibidoEn,
    boolean historialActualizado
) {}

// POST /api/device/heartbeat  (Authorization: Bearer <deviceToken>)
// SIN telemetría de batería (requiere hardware adicional). Solo salud básica.
record DeviceHeartbeatRequest(
    @Size(max=40) String firmware,
    @Size(max=60) String hardware,
    Integer rssi,                    // WiFi.RSSI() en dBm (opcional)
    Long uptimeSeg                   // opcional
) {}

// GET /api/device/config  (Authorization: Bearer <deviceToken>)
record DeviceConfigResponse(
    int intervaloEnvioSeg,           // cada cuánto enviar lecturas
    int muestreoSeg,                 // cada cuánto muestrear sensores
    String zonaHoraria,              // p. ej. "America/Mexico_City"
    Instant servidorAhora            // hora del servidor (ayuda a sincronizar)
) {}
```

> **Auto-registro del dispositivo** (`POST /api/device/register`): usa
> `EstacionRegistroRequest`; responde con `uuidPropuesto` y el estado `PENDING`.
> No entrega token hasta que un ADMIN apruebe.
>
> El **heartbeat** actualiza `ultimaConexion`, `firmware`, `hardware`, `ultimoRssi`
> y registra un `ConnectionLog(HEARTBEAT)`; permite derivar `ONLINE`/`OFFLINE` y
> disparar la alerta `ESTACION_DESCONECTADA` cuando se supera el umbral.

### C.6 IA (`dto/ia`) y Alertas (`dto/alerta`)

Sin cambios de forma respecto a v1 (`IaPreguntaRequest`, `IaResumenRequest`,
`IaPrediccionRequest`, `IaResponse`; `AlertaResponse`), salvo que `estacionId`
referencia el `uuid` de la estación.

### C.7 Comunes (`dto/common`)

`ApiError(timestamp, status, error, code, message, path, fieldErrors)` y
`PageResponse<T>` — sin cambios.

### C.8 Público (`dto/publico`) y estadísticas avanzadas (`dto/estadistica`) 🆕

Tier público (`/api/public/**`): **solo lectura, sin IA, sin datos sensibles**.
Reusa una versión reducida de los DTOs existentes.

```java
// GET /api/public/stations  — solo estaciones APPROVED + habilitadas
record PublicEstacionResponse(
    UUID uuid, String nombre, String municipio,
    Double latitud, Double longitud, String escuelaNombre,
    Conectividad conectividad, LecturaResponse ultimaLectura
) {}

// GET /api/public/weather/latest  — última lectura por estación (mapa/listado)
// devuelve List<PublicEstacionResponse>

// GET /api/public/statistics  — agregados no sensibles (red / municipio)
record PublicEstadisticaResponse(
    String ambito,                   // "RED" | "MUNICIPIO:Chilpancingo" | "ESCUELA:..."
    Instant desde, Instant hasta, int estaciones, int muestras,
    Agregado temperatura, Agregado humedad, Agregado presion, Agregado vientoKmh,
    double lluviaTotalMm
) { record Agregado(double min, double max, double promedio) {} }

// GET /estadisticas?agrupacion=DIA|MES&escuelaId=&municipio=&estacionId=  (autenticado)
record EstadisticaAgrupadaResponse(
    String ambito,                   // RED | ESCUELA:{id} | MUNICIPIO:{nombre} | ESTACION:{uuid}
    String agrupacion,               // DIA | MES
    List<Punto> serie
) {
    record Punto(Instant periodo, int muestras,
                 double tempProm, double tempMin, double tempMax,
                 double humProm, double presProm, double vientoProm,
                 double lluviaTotal) {}
}
```

---

## D. Enums de dominio

```java
public enum Rol             { ADMIN, RESPONSABLE, INVESTIGADOR, USUARIO }
public enum EstadoEstacion  { PENDING, APPROVED, REJECTED, DISABLED, MAINTENANCE }
public enum Conectividad    { ONLINE, OFFLINE }   // DERIVADO, no se persiste
public enum EstadoSolicitud { PENDING, APPROVED, REJECTED }
public enum EventoConexion  { AUTH_OK, AUTH_FAIL, DATA_OK, DATA_REJECTED, HEARTBEAT, UNAUTHORIZED }
public enum TipoAlerta      { LLUVIA, VIENTO_FUERTE, CALOR_EXTREMO,
                              ESTACION_DESCONECTADA, SENSOR_SIN_RESPUESTA }
public enum Severidad       { BAJA, MEDIA, ALTA }
public enum EstadoAlerta    { ACTIVA, RESUELTA }
```

> **Nota**: `Conectividad` (`ONLINE`/`OFFLINE`) es un atributo **calculado** a
> partir de `ultimaConexion` + `estacion.offline.minutos`; nunca se guarda como
> estado. No se modela telemetría de batería (requiere hardware adicional en el
> ESP32); el heartbeat solo reporta firmware/hardware/RSSI.

---

## E. Reglas de mapeo (mappers)

| Origen | Destino | Notas |
|--------|---------|-------|
| `Usuario` → `UsuarioResponse` | excluye `passwordHash`; añade `escuelaNombre` | UsuarioMapper |
| `Escuela` → `EscuelaResponse` | calcula `totalEstaciones` | EscuelaMapper |
| `Estacion` (+`LecturaMeteorologica`) → `EstacionResponse` | calcula `enLinea` con `estacion.offline.minutos` | EstacionMapper |
| `StationToken` (nuevo, en claro) → `StationTokenResponse` | el valor en claro solo existe en memoria al generarse | (no se persiste el claro) |
| `LecturaMeteorologica` → `LecturaResponse` | `vientoGrados` nullable (historial) | LecturaMapper |
| `DeviceDataRequest` → `LecturaMeteorologica` → `LecturaActual`/`Lectura` | validación de rangos antes de persistir en PostgreSQL | IngestaService |
| `ConnectionLog` → `ConexionResponse` | passthrough sin campos internos | ConexionMapper |
| `Alerta` → `AlertaResponse` | passthrough | AlertaMapper |

**Invariante de seguridad**: ningún mapper produce un objeto que contenga
`passwordHash`, el **token en claro** de una estación, hashes de tokens,
credenciales de la BD/Gemini ni trazas internas. El token de estación en claro solo aparece en
`StationTokenResponse`, generado en memoria y nunca persistido ni logueado.

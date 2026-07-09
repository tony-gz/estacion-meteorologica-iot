# Especificación Funcional: WeatherStation Backend (Red de Estaciones)

**Feature Branch**: `001-weatherstation-backend`

**Created**: 2026-06-28 · **Updated**: 2026-06-28 (v2 — red multi-escuela)

**Status**: Draft (pendiente de aprobación)

**Input**: Backend central de una **Red de Estaciones Meteorológicas** donde
distintas escuelas instalan sus propias estaciones ESP32 y las conectan a la
plataforma. Las estaciones publican sus lecturas **a través del backend Spring
Boot** (nunca a un almacén externo). El backend es el único componente con acceso
a la base de datos **PostgreSQL** (almacén único de todo el sistema, incluidas las
lecturas) y el que administra el ciclo de vida de las estaciones (registro,
aprobación, tokens, conexión). Expone una API REST segura (JWT + roles) a las
aplicaciones móvil (React Native) y Web y al cliente de IA.

---

## Changelog de arquitectura (v1 → v3 actual)

> v1: ESP32→Firebase, backend solo lee. v2: ESP32→backend→Firebase + gobernanza.
> **v3 (esta versión)**: ESP32→backend→**PostgreSQL** (se retira Firebase). La
> constitución acompaña en `v3.0.0`.

| Tema | Antes (v1) | Ahora (v3) |
|------|------------|------------|
| Flujo de datos | ESP32 → Firebase → Backend (solo lectura) | ESP32 → **Backend** → **PostgreSQL** → clientes |
| Almacén de datos meteorológicos | Firebase (escrito por el ESP32) | **PostgreSQL** (escrito por el backend): `lectura_actual` + `lecturas` |
| Credenciales en el ESP32 | Token/credenciales de Firebase | **Ninguna de almacén**; solo un token de estación emitido por el backend |
| Identidad de estación | Metadata en Firebase `/registro/{id}` | Entidad **`Station`** en PostgreSQL (ciclo de vida) |
| Almacenes | Firebase (meteo) + PostgreSQL (sistema) | **Solo PostgreSQL** (un datastore) |
| Alta de estaciones | No existía | **Registro + aprobación + token** gobernados por el backend |
| Roles | ADMIN, INVESTIGADOR, USUARIO | + **RESPONSABLE** (de una escuela) |
| Multi-escuela | Fuera de alcance | **En alcance** (entidad `Escuela`) |
| Firmware ESP32 | Inmutable | **Se modifica** para usar `/api/device/**` |

---

## Visión General

El sistema es el **cerebro central y el punto de administración** de una red de
estaciones meteorológicas instaladas por varias escuelas. Cada estación (ESP32)
mide temperatura, humedad, presión, viento y lluvia, y **envía esas lecturas al
backend** mediante endpoints REST autenticados. El backend:

1. **Administra las estaciones**: registro, aprobación/rechazo, emisión y
   revocación de tokens, habilitación/deshabilitación, asociación a una escuela y
   a un usuario responsable, e historial de conexiones.
2. **Ingiere y valida** las lecturas de las estaciones autorizadas y las
   **persiste en PostgreSQL** (única vía de escritura).
3. **Centraliza el acceso** a los datos (ningún cliente ni estación toca la base
   de datos ni Gemini).
4. **Autentica y autoriza** a usuarios (JWT + roles) y a estaciones (token →
   JWT de dispositivo).
5. **Sirve** datos actuales, históricos, estadísticas y estado de estaciones.
6. **Evalúa reglas** y genera **alertas** meteorológicas.
7. **Responde preguntas** en lenguaje natural con IA (Gemini) fundamentada en los
   datos reales.

### Actores

| Actor | Descripción |
|-------|-------------|
| **ESP32 (Estación)** | Dispositivo de campo. Cliente **no confiable** que se autentica con su token y publica lecturas y latidos vía `/api/device/**`. No conoce la base de datos. |
| **OBSERVADOR PÚBLICO** | Visitante **sin cuenta**. Solo lectura de estaciones y clima actual vía `/api/public/**`. **No** usa la IA ni ve históricos crudos. |
| **USUARIO** | Persona registrada. Consulta datos actuales y usa la IA. |
| **RESPONSABLE** | Responsable de las estaciones de **su escuela**: solicita el alta, consulta el estado/última conexión/firmware y los datos de sus estaciones. |
| **INVESTIGADOR** | Consulta datos actuales e históricos de toda la red, descarga datos y usa la IA. |
| **ADMIN** | Gobierna toda la plataforma: usuarios, escuelas, estaciones, aprobaciones y tokens; acceso total. |
| **PostgreSQL** | Almacén único (sistema + lecturas meteorológicas). Solo el backend lo lee y escribe. |
| **Gemini API** | Modelo de IA externo invocado por el backend. |
| **Cliente móvil (React Native) / Web** | Front-ends que consumen la API REST. La app móvil (ver spec `002`) añade, además, provisioning WiFi por BLE del ESP32. |

---

## User Scenarios & Testing *(mandatory)*

Historias priorizadas como journeys independientes; cada una es un incremento
desplegable y verificable por separado.

### User Story 1 - Acceso seguro a la plataforma (Priority: P1)

Un usuario se registra/inicia sesión y obtiene un token que le da acceso según su
rol. Base de toda la plataforma.

**Why this priority**: La constitución exige que todo (salvo rutas públicas) esté
autenticado; sin autenticación no hay producto.

**Independent Test**: Registrar usuario, iniciar sesión, recibir access + refresh
token, acceder a un endpoint protegido y ser rechazado sin token o con rol
insuficiente.

**Acceptance Scenarios**:

1. **Given** credenciales válidas, **When** `POST /auth/login`, **Then** recibe
   access token JWT y refresh token.
2. **Given** access token válido, **When** llama a un endpoint protegido, **Then**
   se procesa según su rol.
3. **Given** petición sin token o con token inválido/expirado, **Then** `401`.
4. **Given** rol `USUARIO`, **When** intenta `DELETE /usuarios/{id}`, **Then** `403`.
5. **Given** refresh token válido, **When** `POST /auth/refresh`, **Then** nuevo
   access token (con rotación del refresh).

---

### User Story 2 - Registro y aprobación de una estación (Priority: P1) 🆕

Una escuela o un usuario registrado solicita el alta de una nueva estación. La
estación se da de alta en la plataforma (por ADMIN/RESPONSABLE, mediante solicitud
iniciada por el dispositivo, o por un **usuario autenticado desde el front**) y
queda **pendiente**. Un ADMIN la revisa y **aprueba o rechaza**. Al aprobarla, el
backend **genera un token único** y **lo envía por email al solicitante**.

**Why this priority**: Sin gobernanza de estaciones, ninguna estación puede
publicar de forma segura. Es la base de la red multi-escuela (Principio VIII).

**Independent Test**: Crear/solicitar una estación → aparece como `PENDING` en el
panel → aprobarla → se devuelve un token (una sola vez) y la estación queda
`APPROVED`; el solicitante recibe el token por email; rechazar otra → `REJECTED`
y nunca recibe token.

**Acceptance Scenarios**:

1. **Given** un ADMIN o RESPONSABLE autenticado, **When** `POST /estaciones`
   (o el dispositivo hace `POST /api/device/register`), **Then** se crea una
   estación/solicitud en estado `PENDING` asociada a una escuela.
2. **Given** un usuario autenticado rol `USUARIO`, **When** `POST /solicitudes`
   con nombre e institución libre, **Then** se crea una solicitud `PENDING`
   vinculada al usuario como solicitante.
3. **Given** una solicitud `PENDING`, **When** un ADMIN `POST /solicitudes/{id}/aprobar`,
   **Then** pasa a `APPROVED`, se genera el token, se envía por email al
   solicitante y la respuesta devuelve el token **una única vez**.
   - **Corrección 2026-07-08 (fix de gobernanza)**: al aprobar, si el solicitante es
     `USUARIO` **o** `INVESTIGADOR`, se le asciende a **`RESPONSABLE`** (no a INVESTIGADOR) y
     se le asigna la **escuela** resuelta/creada en la aprobación. Motivo: la estación queda
     con `responsable = solicitante` y las capacidades de gestión (editar, conexiones,
     provisioning BLE, ver no-aprobadas) están gated a RESPONSABLE; ascender a INVESTIGADOR
     dejaba al dueño sin poder gestionar su propia estación. INVESTIGADOR queda como rol de
     **solo lectura de datos de red**, asignado por ADMIN. Bug en `SolicitudService.aprobar()`
     (~L199-204: `setRol(Rol.INVESTIGADOR)`). Requiere **backfill** de usuarios ya
     mal-ascendidos que sean `responsable` de alguna estación.
4. **Given** una solicitud `PENDING`, **When** un ADMIN `POST /solicitudes/{id}/rechazar`,
   **Then** pasa a `REJECTED`, no se emite token y se envía email de rechazo al
   solicitante.
5. **Given** un RESPONSABLE, **When** intenta `aprobar` una solicitud, **Then** `403`
   (solo ADMIN aprueba).
6. **Given** un RESPONSABLE de la escuela A, **When** crea una estación, **Then** se
   asocia a la escuela A y no puede crearla para otra escuela.
7. **Given** un usuario `USUARIO`, **When** `GET /solicitudes/mis-solicitudes`,
   **Then** recibe solo sus propias solicitudes con su estado actual.

---

### User Story 3 - La estación se autentica y publica datos (Priority: P1) 🆕

Una estación `APPROVED` se autentica con su token (handshake) y obtiene un **JWT
de dispositivo** de vida corta con el que envía sus lecturas. El backend valida y
las **persiste en PostgreSQL**. Ninguna estación accede a la base de datos.

**Why this priority**: Es el nuevo camino por el que los datos entran al sistema;
sustituye a la escritura directa del ESP32 en un almacén externo. Junto con US1/US2
forma el MVP de la nueva arquitectura.

**Independent Test**: Con el token de una estación aprobada, `POST /api/device/auth`
devuelve un JWT; con ese JWT, `POST /api/device/data` con una lectura responde
`202` y el dato aparece en `GET /estaciones/{id}/actual`. Con token inválido o de
estación no aprobada → `401/403` y nada se persiste.

**Acceptance Scenarios**:

1. **Given** una estación `APPROVED` con su token, **When** `POST /api/device/auth`
   con `{uuid, token}`, **Then** recibe un JWT de dispositivo de vida corta y se
   registra la conexión (con IP y firmware reportado).
2. **Given** un JWT de dispositivo válido, **When** `POST /api/device/data` con una
   lectura válida, **Then** el backend la valida y la persiste en PostgreSQL
   (`lectura_actual` y, según cadencia, en el histórico `lecturas`), actualiza
   `ultima_conexion` y responde `202`.
3. **Given** un token de estación inexistente o revocado, **When** `POST /api/device/auth`,
   **Then** `401` y se registra un intento no autorizado.
4. **Given** una estación `PENDING`/`REJECTED`/`DISABLED`, **When** intenta
   autenticarse o publicar, **Then** `403` y **no** se persiste nada.
5. **Given** una lectura con campos inválidos (presión ≤ 0, valores no finitos,
   formato incorrecto), **When** `POST /api/device/data`, **Then** `400/422` con
   detalle y no se persiste la lectura inválida.
6. **Given** una estación que supera el límite de publicaciones por minuto, **When**
   sigue publicando, **Then** `429` con `Retry-After`.
7. **Given** un JWT de dispositivo válido, **When** `POST /api/device/heartbeat`
   con firmware/hardware/RSSI (**sin batería**), **Then** se actualiza
   `ultima_conexion`, se registra un `ConnectionLog(HEARTBEAT)` y la conectividad
   queda `ONLINE`; si deja de latir más del umbral, pasa a `OFFLINE`.
8. **Given** un JWT de dispositivo válido, **When** `GET /api/device/config`,
   **Then** recibe su intervalo de envío, muestreo y zona horaria, y los aplica sin
   reflashear.

---

### User Story 4 - Consultar el clima actual y la lista de estaciones (Priority: P1)

Cualquier usuario autenticado ve la última lectura de una estación y la lista de
estaciones **aprobadas y habilitadas**.

**Why this priority**: Valor central para el público; junto con US1–US3 cierra el
MVP.

**Independent Test**: Con token válido, `GET /estaciones` lista solo estaciones
aprobadas/habilitadas; `GET /estaciones/{id}/actual` devuelve la última lectura
(la que el backend persistió en PostgreSQL) como DTO.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** `GET /estaciones`, **Then** recibe
   las estaciones visibles según su rol (USUARIO/INVESTIGADOR: `APPROVED` +
   habilitadas; RESPONSABLE: además las suyas en cualquier estado; ADMIN: todas).
2. **Given** una estación con datos, **When** `GET /estaciones/{id}/actual`, **Then**
   recibe la última lectura con su marca de tiempo.
3. **Given** un `id` inexistente o no visible para el rol, **Then** `404`.
4. **Given** una estación aprobada sin publicaciones recientes, **When** se consulta
   su estado, **Then** el backend la marca como desconectada/sin datos recientes.

---

### User Story 5 - Históricos, últimas 24 h y estadísticas (Priority: P2)

Un investigador analiza la evolución del clima: serie histórica por rango, últimas
24 h y estadísticas agregadas (mín/máx/promedio por variable).

**Independent Test**: Pedir historial de una estación para las últimas N horas
(orden cronológico, filtrado correcto) y estadísticas validadas contra los datos.

**Acceptance Scenarios**:

1. **Given** historial, **When** `GET /estaciones/{id}/historial?desde=&hasta=`,
   **Then** lecturas del rango ordenadas cronológicamente.
2. **Given** historial, **When** `GET /estaciones/{id}/ultimas24h`, **Then** solo
   las últimas 24 h.
3. **Given** un rango con lecturas, **When** `GET /estaciones/{id}/estadisticas`,
   **Then** mín/máx/promedio por variable y lluvia total.
4. **Given** un rango sin lecturas, **Then** respuesta vacía/indicadora, no `500`.
5. **Given** rol `USUARIO`, **When** intenta acceder al historial, **Then** se
   aplica la matriz de permisos (`403`).

---

### User Story 6 - Preguntar a la IA sobre el clima (Priority: P2)

Un usuario hace una pregunta en lenguaje natural y recibe una respuesta
fundamentada exclusivamente en los datos reales de la estación.

**Independent Test**: Enviar una pregunta; verificar que el backend leyó la base de
datos, construyó contexto y que la respuesta solo referencia datos presentes; sin datos
la IA lo declara y se aplica el rate limit.

**Acceptance Scenarios**:

1. **Given** estación con datos, **When** `POST /ia/preguntar`, **Then** respuesta
   basada en los datos de esa estación.
2. **Given** historial, **When** `POST /ia/resumen`, **Then** resumen del periodo.
3. **Given** histórico suficiente, **When** `POST /ia/prediccion`, **Then**
   estimación cualitativa basada en tendencias, con su incertidumbre.
4. **Given** estación sin datos suficientes, **Then** la respuesta declara la
   falta de datos y no inventa.
5. **Given** usuario que supera el límite, **Then** `429`.
6. **Given** Gemini no disponible, **Then** `503` controlado, sin filtrar detalles.

---

### User Story 7 - Alertas meteorológicas automáticas (Priority: P2)

El sistema evalúa reglas sobre los datos de cada estación y genera alertas
consultables por la API.

**Acceptance Scenarios**:

1. **Given** humedad > 90 % y presión en descenso, **Then** alerta de **lluvia**.
2. **Given** viento > 40 km/h, **Then** alerta de **viento fuerte**.
3. **Given** temperatura > 38 °C, **Then** alerta de **calor extremo**.
4. **Given** alertas generadas, **When** `GET /alertas` / `GET /alertas/{id}`,
   **Then** lista filtrable / detalle.
5. **Given** condiciones normales, **Then** sin falsos positivos.

---

### User Story 8 - Administración de la red (Priority: P2/P3) 🆕

Un administrador gestiona usuarios, **escuelas** y el **ciclo de vida completo de
las estaciones** desde el panel.

**Why this priority**: Necesario para operar la red a largo plazo. La gestión de
estaciones (P2) acompaña al MVP; el CRUD de usuarios/escuelas puede ir después.

**Independent Test**: Como ADMIN, crear escuela y usuarios; registrar/aprobar/
rechazar/deshabilitar/reactivar estaciones; regenerar un token; ver el historial
de conexiones; verificar que un no-admin no puede.

**Acceptance Scenarios**:

1. **Given** un ADMIN, **When** CRUD de usuarios (`/usuarios/**`) y de escuelas
   (`/escuelas/**`), **Then** se persisten; un no-ADMIN recibe `403`.
2. **Given** un ADMIN, **When** `deshabilitar`/`reactivar` una estación, **Then**
   cambia su estado; una estación `DISABLED` no puede autenticarse ni publicar.
3. **Given** un ADMIN, **When** `regenerar-token` de una estación, **Then** se
   revoca el token anterior, se emite uno nuevo (mostrado una vez) y el token
   anterior deja de ser válido en `/api/device/auth`.
4. **Given** un ADMIN o el RESPONSABLE de la escuela, **When**
   `GET /estaciones/{id}/conexiones`, **Then** recibe el historial de conexiones
   (timestamp, IP, firmware, resultado).
5. **Given** un RESPONSABLE, **When** consulta estaciones/solicitudes, **Then** ve
   solo las de su escuela.

---

### User Story 9 - Acceso público sin cuenta (Priority: P2) 🆕

Un visitante **sin cuenta** consulta el clima de las estaciones de la red (lista,
mapa, dato actual y estadísticas agregadas) a través del tier público. La IA y los
datos sensibles **no** están disponibles para él.

**Why this priority**: Da visibilidad pública a la red (escuelas, ciudadanía) sin
fricción de registro, manteniendo cerrado lo sensible y costoso (IA, gestión).

**Independent Test**: Sin token, `GET /api/public/stations` y
`GET /api/public/weather/latest` devuelven estaciones aprobadas + su clima actual;
`GET /api/public/statistics` devuelve agregados; cualquier intento a `/ia/**`,
`/usuarios/**` o gestión sin token → `401`.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta, **When** `GET /api/public/stations`, **Then**
   recibe solo estaciones `APPROVED`+habilitadas con datos no sensibles.
2. **Given** un visitante sin cuenta, **When** `GET /api/public/weather/latest`,
   **Then** recibe la última lectura por estación (para mapa/listado público).
3. **Given** un visitante sin cuenta, **When** intenta `POST /ia/preguntar`,
   **Then** `401` (la IA exige cuenta).
4. **Given** el front público, **When** un visitante quiere usar la IA, **Then** se
   le pide iniciar sesión.

---

### Edge Cases

- **Token de estación robado/filtrado**: el ADMIN regenera el token; el anterior
  se revoca y deja de autenticar. Detección de uso de token revocado se audita.
- **ESP32 con firmware viejo que intenta escribir en un almacén externo**: bloqueado
  por diseño (no tiene credenciales de la base de datos; solo existe la API REST).
- **Estación `PENDING`/`MAINTENANCE` que intenta publicar**: `403`; nada se persiste.
- **Estación deja de enviar latidos/lecturas**: el backend la marca `OFFLINE`
  (derivado) y genera la alerta `ESTACION_DESCONECTADA`; al reanudar, se resuelve.
- **Config remota cambiada por el ADMIN**: la estación la recoge en el siguiente
  `GET /api/device/config` (no requiere reflashear).
- **Lectura inválida** (presión 0, NaN, fuera de rango): rechazada en la ingesta
  (`400/422`), no se persiste.
- **Reloj del ESP32 desfasado**: el backend puede sellar el `timestamp` de
  recepción y/o validar que el timestamp reportado esté dentro de una ventana
  razonable (configurable).
- **Doble publicación / reintentos del ESP32**: la escritura de `historial` es
  idempotente por clave de timestamp (sobrescribe la misma clave).
- **Token expirado de usuario en sesión larga**: usa el refresh; si también
  caducó/revocó → `401` y re-login.
- **JWT de dispositivo expirado**: la estación repite el handshake `/api/device/auth`.
- **Pregunta de IA fuera de dominio**: la IA se ciñe a datos meteorológicos.
- **Gemini lento/caído**: timeout + `503` controlado.
- **Rate limit alcanzado** (IA o dispositivo): `429` con `Retry-After`.
- **Zona horaria**: timestamps en hora local UTC-6 (Chilpancingo) sin zona; el
  backend los interpreta de forma consistente y los expone con zona explícita.

---

## Requirements *(mandatory)*

### Functional Requirements

**Autenticación y autorización (usuarios)**

- **FR-001**: El sistema DEBE permitir registrar usuarios (`POST /auth/register`)
  con email único y contraseña, rol por defecto `USUARIO`.
- **FR-002**: El sistema DEBE autenticar usuarios (`POST /auth/login`) y devolver
  access token JWT de vida corta + refresh token.
- **FR-003**: El sistema DEBE renovar el access token (`POST /auth/refresh`) con
  rotación del refresh token.
- **FR-004**: El sistema DEBE almacenar las contraseñas con BCrypt; nunca
  devolverlas ni registrarlas.
- **FR-005**: El sistema DEBE proteger todos los endpoints excepto `/auth/**`,
  `/api/device/register`, `/api/device/auth` y la documentación pública; sin
  credenciales válidas → `401`.
- **FR-006**: El sistema DEBE aplicar autorización por roles (`ADMIN`,
  `RESPONSABLE`, `INVESTIGADOR`, `USUARIO`) según la *Matriz de Permisos*; rol
  insuficiente → `403`.

**Escuelas** 🆕

- **FR-007**: El sistema DEBE permitir a ADMIN gestionar escuelas (`/escuelas/**`:
  listar, ver, crear, actualizar, eliminar) con sus datos (nombre, clave/CCT,
  municipio, ubicación, lat/long, contacto).
- **FR-008**: El sistema DEBE permitir asociar usuarios `RESPONSABLE` y estaciones
  a una escuela.

**Gobernanza de estaciones** 🆕

- **FR-009**: El sistema DEBE mantener una entidad `Station` en PostgreSQL con,
  como mínimo: id, uuid, nombre, escuela, ubicación, municipio, latitud, longitud,
  firmware, token (referencia hasheada), estado, fecha de registro, última
  conexión y usuario responsable.
- **FR-010**: El **ciclo de vida** de una estación DEBE ser uno de `PENDING`,
  `APPROVED`, `REJECTED`, `DISABLED`, `MAINTENANCE`. La **conectividad**
  (`ONLINE`/`OFFLINE`) NO es un estado almacenado: se **deriva** de
  `ultima_conexion` + umbral.
- **FR-011**: El sistema DEBE permitir registrar estaciones (`POST /estaciones`
  por ADMIN/RESPONSABLE) y aceptar solicitudes iniciadas por el dispositivo
  (`POST /api/device/register`), creándolas en estado `PENDING`.
- **FR-012**: El sistema DEBE permitir a ADMIN **aprobar** una estación
  (`POST /estaciones/{id}/aprobar`), lo que la pone en `APPROVED` y **genera
  automáticamente un token único** mostrado **una sola vez**.
- **FR-013**: El sistema DEBE permitir a ADMIN **rechazar** (`/rechazar`),
  **deshabilitar** (`/deshabilitar`), **reactivar** (`/reactivar`) y poner en
  **mantenimiento** (`/mantenimiento`) estaciones, y **regenerar/revocar** su token
  (`/regenerar-token`), invalidando el token anterior.
- **FR-014**: El sistema DEBE exponer el historial de conexiones de cada estación
   (`GET /estaciones/{id}/conexiones`) con timestamp, IP, firmware y resultado.
- **FR-014b**: El sistema DEBE permitir a cualquier usuario autenticado crear una
   solicitud de estación (`POST /solicitudes`) con nombre e institución libre,
   quedando `PENDING` y vinculada al solicitante.
- **FR-014c**: El sistema DEBE exponer `GET /solicitudes/mis-solicitudes` para que
   un usuario vea solo sus propias solicitudes.
- **FR-014d**: El sistema DEBE notificar por email al solicitante cuando su solicitud
   es aprobada (con el token) o rechazada (con el motivo).
- **FR-015**: El sistema DEBE indicar el estado de conexión de cada estación a
  partir de su última publicación (`ultima_conexion` + umbral configurable).
- **FR-016**: El RESPONSABLE solo DEBE ver y gestionar estaciones/solicitudes de
  **su** escuela; el ADMIN, todas.

**Ingesta de datos de las estaciones** 🆕

- **FR-017**: El sistema DEBE autenticar a una estación mediante handshake
  (`POST /api/device/auth` con `{uuid, token}`) devolviendo un **JWT de
  dispositivo** de vida corta; solo estaciones `APPROVED` lo obtienen.
- **FR-018**: El sistema DEBE recibir lecturas de las estaciones
  (`POST /api/device/data`) autenticadas con el JWT de dispositivo, **validar**
  (estación `APPROVED`, formato y rangos) y **persistir en PostgreSQL** las válidas
  (`lectura_actual` siempre; `lecturas` según cadencia).
- **FR-019**: El sistema DEBE ser el **único** con acceso a la base de datos; las
  estaciones NUNCA reciben credenciales de almacenamiento ni acceden a la BD.
- **FR-020**: El sistema DEBE rechazar lecturas inválidas (`400/422`) sin
  persistirlas y registrar el evento.
- **FR-021**: El sistema DEBE aplicar rate limiting a `/api/device/**`; exceso →
  `429`. Las publicaciones inválidas/no autorizadas se auditan
  (detección de estaciones no autorizadas).

**Latido y configuración del dispositivo** 🆕

- **FR-040**: El sistema DEBE aceptar latidos (`POST /api/device/heartbeat`)
  autenticados con el JWT de dispositivo, con firmware, hardware y RSSI (señal).
  **NO** se recolecta telemetría de batería (requiere hardware adicional). El
  latido actualiza `ultima_conexion` y deriva la conectividad `ONLINE`/`OFFLINE`.
- **FR-041**: El sistema DEBE servir la configuración de la estación
  (`GET /api/device/config`): intervalo de envío, muestreo y zona horaria, para
  ajustar el comportamiento del ESP32 sin reflashear.

**Acceso público (sin cuenta)** 🆕

- **FR-042**: El sistema DEBE exponer un tier público de **solo lectura**
  `/api/public/**` (estaciones `APPROVED`+habilitadas, clima actual y estadísticas
  agregadas no sensibles) **sin autenticación**.
- **FR-043**: El tier público **NO** DEBE exponer IA, históricos crudos completos,
  gestión ni datos de usuarios. La IA (`/ia/**`) **exige autenticación**.

**Estaciones y datos (consulta)**

- **FR-022**: El sistema DEBE listar estaciones (`GET /estaciones`) y su detalle
  (`GET /estaciones/{id}`) según la visibilidad por rol.
- **FR-023**: El sistema DEBE devolver el dato actual
  (`GET /estaciones/{id}/actual`), el historial filtrable
  (`GET /estaciones/{id}/historial`), las últimas 24 h
  (`GET /estaciones/{id}/ultimas24h`) y estadísticas
  (`GET /estaciones/{id}/estadisticas`) leídos/agregados desde PostgreSQL.

**Inteligencia Artificial**

- **FR-024**: El sistema DEBE responder preguntas en lenguaje natural
  (`POST /ia/preguntar`) leyendo primero los datos de PostgreSQL y construyendo el contexto.
- **FR-025**: El sistema DEBE generar resúmenes (`POST /ia/resumen`) y
  estimaciones (`POST /ia/prediccion`) basados en datos reales.
- **FR-026**: El sistema DEBE ser el único en invocar Gemini; sus credenciales
  nunca llegan al cliente.
- **FR-027**: La IA DEBE responder usando solo los datos provistos y declarar
  incertidumbre/ausencia de datos en lugar de inventar.
- **FR-028**: El sistema DEBE aplicar rate limiting a `/ia/**`; exceso → `429`.
- **FR-029**: El sistema DEBE manejar fallos/timeout de Gemini con `503`
  controlado.

**Alertas**

- **FR-030**: El sistema DEBE evaluar un motor de reglas y generar alertas
  tipificadas. **Meteorológicas**: lluvia, viento fuerte, calor extremo.
  **De salud**: `ESTACION_DESCONECTADA` (sin latido/publicación tras el umbral) y
  `SENSOR_SIN_RESPUESTA` (lecturas faltantes/inválidas persistentes). **No** hay
  alerta de batería.
- **FR-031**: Reglas mínimas: humedad > 90 % **y** presión en descenso → lluvia;
  viento > 40 km/h → viento fuerte; temperatura > 38 °C → calor extremo;
  `ultima_conexion` > `estacion.offline.minutos` → estación desconectada.
- **FR-032**: El sistema DEBE exponer las alertas (`GET /alertas`,
  `GET /alertas/{id}`), filtrables, ejecutando el motor de forma periódica y
  evitando duplicados de una misma condición activa.
- **FR-032b**: El sistema DEBE ofrecer **estadísticas avanzadas** (agregados SQL):
  promedios diario/mensual, mínimos/máximos, lluvia acumulada, y agregación por
  **estación, escuela y municipio**, además de tendencias.

**Usuarios (gestión)**

- **FR-033**: El sistema DEBE permitir a ADMIN gestionar usuarios (`/usuarios/**`),
  incluyendo asignar el rol `RESPONSABLE` y vincularlos a una escuela.
- **FR-034**: El sistema NO DEBE exponer entidades de usuario; usa DTOs sin
  campos sensibles.

**Transversales**

- **FR-035**: El sistema DEBE devolver errores con formato uniforme (código,
  mensaje, timestamp, ruta) vía manejo global de excepciones.
- **FR-036**: El sistema DEBE validar todas las entradas (Bean Validation) y
  rechazar payloads inválidos con `400` y detalle de campos.
- **FR-037**: El sistema DEBE registrar eventos de seguridad, conexión de
  estaciones y uso de IA, sin secretos ni contraseñas ni tokens en claro.
- **FR-038**: El sistema DEBE publicar su documentación OpenAPI/Swagger.
- **FR-039**: El sistema DEBE ser desplegable en Render mediante variables de
  entorno (sin secretos versionados).

### Matriz de Permisos (resumen)

| Recurso / Acción | PÚBLICO | USUARIO | RESPONSABLE | INVESTIGADOR | ADMIN |
|------------------|:-------:|:-------:|:-----------:|:------------:|:-----:|
| `GET /api/public/**` (estaciones, clima actual, stats agregadas) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /estaciones`, `/estaciones/{id}` (aprobadas) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ver sus estaciones en cualquier estado | ❌ | — | ✅ (su escuela) | — | ✅ |
| `GET /estaciones/{id}/actual` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `historial` / `ultimas24h` / `estadisticas` / descarga | ❌ | ❌ | ✅ (su escuela) | ✅ | ✅ |
| `POST /estaciones` (registrar) | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| Aprobar / rechazar / deshabilitar / reactivar / mantenimiento / regenerar-token | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /estaciones/{id}/conexiones` | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| `POST /solicitudes` (crear solicitud) | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /solicitudes/mis-solicitudes` | ❌ | ✅ | — | — | — |
| `GET /solicitudes` | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| `/escuelas/**` (gestión) | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /ia/*` (**requiere cuenta**) | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /alertas`, `/alertas/{id}` | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gestión de usuarios (`/usuarios/**`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/api/device/**` | — autenticación por **token/JWT de estación**, no por rol de usuario — |||||

> La matriz autoritativa y los detalles finos se fijan en `contracts/`.

### Key Entities *(resumen; detalle en `data-model.md`)*

- **Usuario**: email, hash de contraseña, nombre, rol, escuela (si `RESPONSABLE`),
  estado, fechas. PostgreSQL.
- **Rol / Permiso**: `ADMIN` | `RESPONSABLE` | `INVESTIGADOR` | `USUARIO` y los
  permisos asociados.
- **RefreshToken**: renovación de sesión de usuario (rotación).
- **Escuela** 🆕: nombre, clave/CCT, municipio, ubicación, lat/long, contacto.
- **Station** 🆕: id, uuid, nombre, escuela, ubicación, municipio, lat, long,
  firmware, estado (PENDING/APPROVED/REJECTED/DISABLED), fechaRegistro,
  ultimaConexion, usuario responsable.
- **StationToken** 🆕: token de estación (hasheado), estado (activo/revocado),
  fechas; soporta regeneración.
- **SolicitudRegistro** 🆕: intake de alta (datos de la estación, escuela,
  solicitante, estado PENDING/APPROVED/REJECTED, motivo de rechazo).
- **ConnectionLog** 🆕: historial de conexiones/ingesta de cada estación
  (timestamp, IP, firmware, resultado).
- **LecturaMeteorológica**: medición (timestamp, temperatura, humedad, presión,
  viento km/h, dirección, grados, lluvia mm). Persistida por el backend en
  PostgreSQL (`lectura_actual` + `lecturas`).
- **Alerta**: evento del motor de reglas. PostgreSQL.
- **LogAuditoría / Configuración**: auditoría y parámetros del sistema.

---

## Success Criteria *(mandatory)*

- **SC-001**: Ninguna estación puede escribir en la base de datos directamente; el
  100 % de las lecturas entran por `/api/device/data` y son validadas por el backend.
- **SC-002**: Una estación recién instalada no publica ningún dato hasta ser
  `APPROVED`; las estaciones `PENDING/REJECTED/DISABLED` reciben `403`.
- **SC-003**: Al aprobar una estación se genera un token único; el token en claro
  se muestra exactamente **una vez** y nunca vuelve a aparecer en respuestas/logs.
- **SC-004**: Regenerar el token invalida el anterior de inmediato (el viejo falla
  en `/api/device/auth`).
- **SC-005**: El 100 % de los endpoints de datos requieren autenticación; ninguna
  respuesta expone credenciales de la BD/Gemini ni entidades crudas.
- **SC-006**: La consulta de dato actual responde en < 1 s (p95); el historial de
  24 h en < 2 s (p95).
- **SC-007**: La ingesta `/api/device/data` valida y persiste una lectura válida
  en < 1 s (p95) y rechaza las inválidas sin escribirlas.
- **SC-008**: El 100 % de las respuestas de IA referencian solo datos presentes;
  sin datos suficientes, lo declaran explícitamente.
- **SC-009**: El rate limiting (IA y dispositivo) responde `429` al superar el
  umbral sin afectar a otros.
- **SC-010**: Las tres reglas de alerta se disparan correctamente y no generan
  falsos positivos en condiciones normales.
- **SC-011**: El 100 % de los errores usan el formato uniforme; cero trazas de
  stack o secretos en las respuestas.
- **SC-012**: La documentación Swagger lista el 100 % de los endpoints; el backend
  arranca en Render solo con variables de entorno.

---

## Assumptions

- **PostgreSQL es el almacén único** de todo el sistema: usuarios, roles, permisos,
  escuelas, estaciones, tokens de estación, solicitudes de registro, refresh
  tokens, **lecturas meteorológicas** (`lectura_actual` + `lecturas` time-series),
  alertas, logs de conexión, logs de auditoría y configuración. **Solo el backend**
  accede a la base de datos (credenciales por variable de entorno). No se usa
  Firebase (decisión v3: consolidación en Postgres).
- El **firmware del ESP32 se actualizará** para autenticarse y publicar vía
  `/api/device/**`; el contrato de campos de una lectura se conserva.
- El registro público de usuarios (`/auth/register`) crea `USUARIO`; los roles
  superiores (incluido `RESPONSABLE`) los asigna un ADMIN.
- Los timestamps del ESP32 están en hora local UTC-6 sin zona; el backend asume
  esa zona salvo configuración contraria y puede sellar la hora de recepción.
- El despliegue objetivo es Render; los secretos se inyectan por entorno/secret.

---

## Out of Scope (v2)

- Control remoto/comandos hacia las estaciones (más allá de la ingesta de datos).
- Configuración WiFi/BLE de las estaciones (firmware + app móvil). El *cómo* de
  la app móvil vive en la spec `002-weatherstation-movil`; el backend no participa
  en el handshake BLE.
- Notificaciones push (las gestiona el cliente; el backend expone alertas). Push
  queda fuera de alcance también en la spec `002` (fase posterior).
- Dashboards/visualización (front-ends Web y móvil React Native).
- Federación entre múltiples backends/regiones; v2 asume una sola plataforma con
  múltiples escuelas.
- Aprovisionamiento automático de certificados por dispositivo (mTLS); v2 usa
  token de estación + JWT de dispositivo.

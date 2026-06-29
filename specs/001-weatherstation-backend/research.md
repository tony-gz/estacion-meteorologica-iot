# Research & Decisiones Técnicas — WeatherStation Backend v2

Cada decisión sigue el formato **Decisión / Justificación / Alternativas
descartadas**. Tras la consolidación en PostgreSQL (v3.0.0) **se retira Firebase**:
R1 pasa a describir el almacenamiento de lecturas en Postgres. Las decisiones de
gobernanza/dispositivo (R11–R15) se conservan.

---

## R1. Almacenamiento de lecturas en PostgreSQL (time-series) — sin Firebase

**Decisión**: **PostgreSQL es el almacén único**, también de los datos
meteorológicos. Dos tablas:
- `lectura_actual`: una fila por estación (PK = `estacion_id`), *upsert* en cada
  publicación → lectura O(1) para `GET /estaciones/{id}/actual`.
- `lecturas`: histórico time-series con `UNIQUE (estacion_id, timestamp)`
  (idempotente) e índice `(estacion_id, timestamp DESC)` para rangos. El histórico
  se inserta con cadencia `ingesta.historial.cada_min` (p. ej. 10 min); la actual
  se actualiza siempre.

**Justificación**: con la ingesta vía backend (v2), Firebase quedó como un segundo
almacén redundante detrás del backend (el ESP32 ya no escribe y los clientes ya no
leen Firebase, prohibido por el Principio I). Consolidar en Postgres da: una sola
transacción (lectura + estación + log atómicos), consultas SQL nativas para
historial/estadísticas (MIN/MAX/AVG, SUM), un solo backup/migración, una credencial
menos y ningún Admin SDK. El volumen es modesto (actual = upsert; histórico cada
~10 min), perfectamente manejable por Postgres.

**Escala**: si el histórico crece mucho, particionar `lecturas` por rango de tiempo
o adoptar **TimescaleDB**, sin cambiar el modelo lógico.

**Realtime**: si en el futuro se requiere push en vivo a los clientes, se expone en
el backend (SSE/WebSocket leyendo de Postgres + caché de "última lectura"), **no**
reintroduciendo Firebase (los clientes no pueden escuchar la BD directamente,
Principio I).

**Alternativas descartadas**:
- *Mantener Firebase como almacén meteorológico*: dos datastores, Admin SDK, puente
  async→sync, riesgo de divergencia, agregaciones en memoria. Sin beneficio en v3.
- *ESP32 escribe directo*: modelo v1; expone credenciales y pierde el control.

---

## R2. Contrato de datos y validación de ingesta

**Decisión**: el contrato de campos de una lectura (`timestamp`, `temperatura`,
`humedad`, `presion`, `viento_kmh`, `viento_dir`, `viento_grados`, `lluvia_mm`) se
conserva, pero la **frontera de confianza es el backend**: `IngestaService`
revalida toda lectura recibida en `/api/device/data` (rangos: `presion>0`,
`humedad∈[0,100]`, `vientoKmh≥0`, finitud, `timestamp` dentro de la ventana
`device.timestamp.ventana_min`) antes de persistirla en PostgreSQL.

**Justificación**: cumple el Principio VII redefinido (estación = cliente no
confiable). Las lecturas inválidas se rechazan (`422`) y se auditan, no se
propagan.

**Alternativas descartadas**: confiar en que el firmware filtra (v1 lo asumía como
"best effort"); ahora el backend es la autoridad.

---

## R3. Estrategia JWT de usuarios (access + refresh)

Sin cambios respecto a v1: access JWT corto (HS256, secreto por entorno) +
refresh opaco persistido con rotación y detección de reutilización (`jjwt`). El
claim `rol` ahora incluye `RESPONSABLE`.

---

## R4. Integración con Gemini

Sin cambios respecto a v1: `GeminiClient` tras interfaz, `generateContent` vía
`RestClient`, API key por entorno, `gemini-2.5-flash`, prompt restrictivo
(grounded). `estacionId` del request es el `uuid` de la estación.

---

## R5. Rate limiting — IA **y** dispositivo

**Decisión**: **Bucket4j** (token bucket en memoria) para `/ia/**` (por usuario) y
para `/api/device/**` (por estación/uuid e IP). Excedido → `429` + `Retry-After`.
Límites configurables (`ia.ratelimit.*`, `device.ratelimit.por_min`).

**Justificación**: protege coste (IA) y evita saturación/abuso de la ingesta. En
memoria basta para una instancia en Render; migrar a Redis si se escala
horizontalmente.

**Alternativas descartadas**: filtro casero; gateway externo (innecesario en v2).

---

## R6. Motor de reglas de alertas

Sin cambios de lógica respecto a v1 (lluvia/viento/calor, tendencia de presión,
dedupe ACTIVA/RESUELTA, `@Scheduled`). Cambio menor: itera sobre estaciones
`APPROVED`+habilitadas de PostgreSQL y referencia la estación por `uuid`.

---

## R7. Persistencia única (PostgreSQL) — ampliada

**Decisión**: PostgreSQL vía Spring Data JPA + **Flyway** como **almacén único de
todo el sistema, incluidas las lecturas**. Tablas: `usuarios` (+`escuela_id`, rol
`RESPONSABLE`), `roles`/`permisos`/`rol_permisos`, `refresh_tokens`, **`escuelas`**,
**`estaciones`**, **`station_tokens`**, **`solicitudes_registro`**,
**`connection_logs`**, **`lectura_actual`**, **`lecturas`**, `alertas`,
`logs_auditoria`, `configuracion`.

**Justificación**: una sola fuente de verdad (Principio I/v3): Postgres cubre
sistema + gobernanza + meteorología. Flyway versiona el esquema; la migración
v1→v3 se hace en `V3__red_estaciones.sql` (crea tablas nuevas, incl. lecturas, y
migra/retira `estaciones_admin`).

**Alternativas descartadas**: mantener un segundo almacén (Firebase) para
meteorología — redundante y sin beneficio (ver R1).

---

## R8. Despliegue en Render

100 % por variables de entorno. **Nuevos secretos**: `DEVICE_JWT_SECRET` (firma de
los JWT de dispositivo; separado del de usuarios para rotarlo de forma
independiente). **Ya no hay** `FIREBASE_CREDENTIALS`/`FIREBASE_DB_URL`: el único
datastore es PostgreSQL (Render Postgres o externo).

---

## R9. Documentación de API (OpenAPI/Swagger)

Sin cambios: `springdoc-openapi`. Se añaden dos esquemas de seguridad: `bearerAuth`
(usuario) y `deviceAuth` (dispositivo). El contrato fuente vive en
`contracts/openapi.yaml`.

---

## R10. Zona horaria y manejo de tiempo

Como v1 (UTC-6 sin zona, normalización en `TimeUtils`). **Adición**: en la
ingesta el backend valida que el `timestamp` reportado por el ESP32 esté dentro de
una ventana razonable respecto a la hora de recepción (reloj desfasado) y sella
`recibido_en`; si el reloj del dispositivo es poco fiable, puede preferirse la hora
de recepción como clave de historial (configurable).

---

## R11. Identidad de estación: `id` interno + `uuid` público (NUEVO)

**Decisión**: cada estación tiene `id` (UUID, PK interna) y `uuid` (UUID público,
inmutable). El `uuid` es el identificador que conoce el dispositivo y el que se usa
en las rutas REST `{id}`; las lecturas se referencian por la FK a la estación.

**Justificación**: el `uuid` es estable, no enumerable y no revela el orden de
alta; evita exponer secuencias o la PK interna a los clientes/dispositivos.

**Alternativas descartadas**: usar un id legible tipo `estacion1` (enumerable,
colisiona entre escuelas); exponer la PK interna.

---

## R12. Autenticación de dispositivos: token de estación → JWT de dispositivo (NUEVO)

**Decisión**: handshake en dos pasos.
1. Al **aprobar** la estación, el backend genera un **token permanente** aleatorio
   (alta entropía, prefijo `stk_`), guarda solo su **hash** (`station_tokens`) y lo
   muestra **una sola vez**.
2. La estación llama a `POST /api/device/auth` con `{uuid, token}`; el backend
   valida (estación `APPROVED`, hash coincide, token activo) y emite un **JWT de
   dispositivo** de vida corta (`device.jwt.exp_min`, claim `type=DEVICE`,
   `sub=uuid`) firmado con `DEVICE_JWT_SECRET`.
3. `POST /api/device/data` se autentica con ese JWT (filtro `DeviceJwtFilter`).

**Justificación**:
- Limita la exposición del token permanente (viaja solo en el handshake; los
  envíos frecuentes usan el JWT corto).
- Permite **revocación** real: regenerar el token invalida el anterior; el JWT
  caduca solo. Coincide con los dos endpoints `/auth` y `/data` del enunciado.
- El JWT de dispositivo es stateless y barato de validar en cada lectura.

**Almacenamiento del token**: se guarda **hasheado** (SHA-256 con sal, o BCrypt).
Comparación en `/auth`. Nunca se persiste ni loguea en claro.

**Alternativas descartadas**:
- *Token estático en cada petición*: simple, pero expone el secreto permanente en
  cada envío (cada ~segundos) y complica la rotación. Reservado como fallback.
- *HMAC por petición (firma + nonce)*: más resistente a replay, pero más complejo
  en el firmware del ESP32; se puede adoptar más adelante sin cambiar el modelo de
  datos.
- *mTLS por dispositivo*: aprovisionar certificados por estación escolar es
  operativamente caro para v2.

---

## R13. Generación y ciclo de vida del token de estación (NUEVO)

**Decisión**: token = `stk_` + 32 bytes aleatorios (base64url) de un
`SecureRandom`. A lo sumo **un** `StationToken` activo por estación. Aprobar o
`regenerar-token` revoca el activo previo (`activo=false`, `revocadoEn=now`) y crea
uno nuevo dentro de la misma transacción. `ultimoUsoEn` se actualiza en cada
`/auth` correcto.

**Justificación**: rotación y revocación simples y auditables; un solo token
activo evita ambigüedad. La unicidad del `tokenHash` previene colisiones.

---

## R14. Gobernanza multi-escuela y autorización por propiedad (NUEVO)

**Decisión**: rol `RESPONSABLE` ligado a una `escuela_id`. La autorización combina
**rol** (Spring Security) con **propiedad** (la estación/solicitud pertenece a la
escuela del responsable), verificada en la capa de servicio. ADMIN no tiene
restricción de propiedad.

**Justificación**: la matriz de permisos no basta por sí sola para "su escuela";
la comprobación de pertenencia es lógica de negocio y vive en el service
(`@PreAuthorize` para el rol + chequeo de `escuelaId` en el método). Los permisos
finos (`permisos`/`rol_permisos`) documentan capacidades y permiten evolucionar sin
tocar el enum de roles.

**Alternativas descartadas**: ACL completa (Spring Security ACL) — sobredimensionada
para v2; basta el filtro por `escuelaId`.

---

## R15. Migración desde v1 (NUEVO)

**Decisión**: el backend y el front ya construidos (v1, lectura sobre Firebase) se
**migran**, no se desechan:
- **Reutilizable casi sin cambios**: auth de usuarios, IA, motor de alertas,
  manejo de errores, OpenAPI; la lógica de estadísticas se conserva pero pasa a
  agregados SQL.
- **A reemplazar**: `EstacionAdmin` → `Estacion`; la identidad de estación
  (Firebase `/registro` → PostgreSQL); el adaptador Firebase →
  `LecturaActualRepository`/`LecturaRepository` (Postgres); se **retira** el
  Firebase Admin SDK y sus credenciales.
- **Nuevo**: módulo de dispositivo (`/api/device/**`, ingesta, JWT dispositivo),
  escuelas, gobernanza de estaciones, tokens, solicitudes, logs de conexión,
  tablas de lecturas.
- **Firmware ESP32**: se reescribe la parte de publicación (de Firebase directo a
  `/api/device/**`); fuera del alcance del backend pero coordinado con su contrato.
- **Front CLIMBOT**: añadir panel de escuelas, registro/aprobación de estaciones,
  gestión de tokens e historial de conexiones; el resto se conserva.

**Justificación**: maximiza reutilización y reduce el riesgo del pivote.

---

## R16. Tier público de solo lectura (NUEVO)

**Decisión**: exponer `/api/public/**` **sin autenticación**, solo lectura y solo
datos no sensibles (estaciones `APPROVED`+habilitadas, clima actual, estadísticas
agregadas). La **IA NO es pública** (`/ia/**` exige cuenta); tampoco la gestión,
los históricos crudos ni los datos de usuarios. Rate limiting por IP en el tier
público.

**Justificación**: da visibilidad ciudadana/escolar a la red sin fricción de
registro, manteniendo cerrado lo costoso (IA/Gemini) y lo sensible. En el front,
una vista pública sin cuenta muestra estaciones + clima; para usar la IA, login.

**Alternativas descartadas**: abrir todo sin auth (expone IA y gestión); exigir
cuenta para todo (fricción innecesaria para consulta pública).

---

## R17. Conectividad derivada, heartbeat y configuración remota (NUEVO)

**Decisión**:
- **Ciclo de vida** (`EstadoEstacion`) y **conectividad** (`ONLINE`/`OFFLINE`) son
  conceptos separados: la conectividad se **deriva** de `ultimaConexion` +
  `estacion.offline.minutos`, no se persiste. Se añade el estado de ciclo de vida
  `MAINTENANCE`.
- **Heartbeat** `POST /api/device/heartbeat`: firmware, hardware, RSSI; actualiza
  `ultimaConexion` y campos de salud. **Sin telemetría de batería** (requiere un
  pin/divisor extra en el ESP32; queda fuera de alcance).
- **Config remota** `GET /api/device/config`: intervalo de envío, muestreo y zona
  horaria por estación, para ajustar el ESP32 sin reflashear.

**Justificación**: mezclar conectividad con ciclo de vida es un *smell* (un mismo
campo con semánticas distintas); separarlos simplifica reglas y consultas. El
heartbeat habilita la alerta `ESTACION_DESCONECTADA` y un dashboard de salud.

**Alternativas descartadas**: guardar ONLINE/OFFLINE como estado (se desincroniza);
incluir batería (no hay hardware para medirla).

---

## R18. Estadísticas avanzadas por SQL (NUEVO)

**Decisión**: agregados por día/mes y por ámbito (estación/escuela/municipio/red)
con SQL sobre `lecturas` (`date_trunc` + `GROUP BY`, `AVG/MIN/MAX/SUM`). Versión
pública agregada en `/api/public/statistics`; versión detallada autenticada en
`/estadisticas?agrupacion=DIA|MES`.

**Justificación**: PostgreSQL agrega de forma nativa y eficiente; evita cálculo en
memoria. Encaja con la consolidación en Postgres (R1).

**Alternativas descartadas**: pre-cálculo en tablas materializadas (optimización
futura si el volumen lo exige; no necesario en v3.1).

---

## Resumen de dependencias del `pom.xml`

| Dependencia | Propósito | Estado |
|-------------|-----------|--------|
| `io.jsonwebtoken:jjwt-api/impl/jackson` | JWT usuarios **y** dispositivos | ya en v1 |
| `org.springdoc:springdoc-openapi-starter-webmvc-ui` | Swagger/OpenAPI | ya en v1 |
| `com.bucket4j:bucket4j-core` | Rate limiting IA **+ dispositivo** | ya en v1 |
| `org.flywaydb:flyway-core` (+ postgresql) | Migraciones (incl. V3 red estaciones + lecturas) | ya en v1 |
| (opcional) `spring-boot-starter-actuator` | Healthcheck Render | opcional |
| ~~`com.google.firebase:firebase-admin`~~ | **Se RETIRA** (sin Firebase) | quitar del pom |

> No se añaden dependencias nuevas; además **se retira** `firebase-admin`: el stack
> queda más ligero que en v1/v2.

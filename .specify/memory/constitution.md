# Constitución — WeatherStation Backend (Red de Estaciones CLIMBOT)

Plataforma IoT central para una **Red de Estaciones Meteorológicas Inteligentes**
en la que distintas escuelas instalan y conectan sus propias estaciones. Esta
constitución rige todas las decisiones de diseño, especificación e implementación
del backend. Cualquier especificación (`spec.md`), plan (`plan.md`) o tarea
(`tasks.md`) DEBE cumplirla; las violaciones se justifican explícitamente en la
sección *Complexity Tracking* del plan o se rechazan.

> **Sync Impact (enmienda 3.0.0)** — Se **retira Firebase**. Con la arquitectura de
> ingesta vía backend (v2.0.0), Firebase quedó como un segundo almacén redundante
> detrás del backend; sus dos razones originales (el ESP32 escribía directo y los
> clientes leían directo) ya no existen. Ahora **todo** se almacena en PostgreSQL,
> incluidos los datos meteorológicos (lecturas como series temporales).
> - **Principio I redefinido** (incompatible → MAJOR): el backend es el único con
>   acceso a la **base de datos** (PostgreSQL) y a Gemini; desaparece toda mención a
>   Firebase/Admin SDK.
> - **Principio VII**: el ESP32 sigue siendo un cliente no confiable; sus lecturas se
>   validan y se persisten en PostgreSQL.
> - **Restricciones tecnológicas**: se elimina Firebase Realtime Database y el
>   Firebase Admin SDK; los datos meteorológicos viven en PostgreSQL (tabla de
>   lectura actual + histórico time-series).
> - **Resumen de versiones**: 1.0.0 (ESP32→Firebase, backend solo lee) → 2.0.0
>   (ESP32→backend→Firebase + gobernanza) → 3.0.0 (ESP32→backend→PostgreSQL,
>   sin Firebase) → **3.1.0** (tier público `/api/public/**` con IA solo
>   autenticada; heartbeat/config de dispositivo; estado `MAINTENANCE` +
>   conectividad derivada; alertas de salud — **sin** telemetría de batería).

## Principios Fundamentales

### I. El backend es la única puerta a los datos (Gateway Único)

El backend es el **único** componente con acceso a la **base de datos**
(PostgreSQL, fuente de verdad de TODO el sistema, incluidos los datos
meteorológicos) y a la API de Gemini. Ningún otro componente —incluidas las
estaciones ESP32 y las aplicaciones cliente— accede a la base de datos
directamente.

- PROHIBIDO exponer credenciales de la base de datos o de Gemini a clientes o a
  las estaciones.
- PROHIBIDO que un endpoint devuelva entidades crudas o filas de la base sin pasar
  por la capa de servicio (mapeo a DTO, validación, control de acceso).
- Toda la lógica de negocio (ingesta y validación de lecturas, alertas, contexto
  de IA, estadísticas, gobernanza de estaciones) reside en el backend.

### II. Especificación antes que código (Spec-Driven Development)

Ningún módulo se implementa sin su especificación aprobada. El orden es
inviolable: **constitution → spec → plan → tasks → implement**.

- El *qué* y el *porqué* viven en `spec.md` (sin detalles de implementación).
- El *cómo* vive en `plan.md`, `research.md`, `data-model.md` y `contracts/`.
- Todo requisito funcional es rastreable hasta al menos un caso de uso y al
  menos un endpoint o tarea.

### III. Arquitectura en capas y SOLID (NO NEGOCIABLE)

El código se organiza en capas con dependencias unidireccionales:

```
controller → service → repository → (PostgreSQL | Gemini)
                ↑            ↑
              dto         entity/mapper
```

- Los **controllers** solo orquestan HTTP: validan entrada, delegan en services,
  devuelven DTOs. No contienen lógica de negocio ni acceso a datos.
- Los **services** contienen la lógica de negocio y son la única capa que
  coordina repositorios y proveedores externos.
- Los **repositories**/adaptadores aíslan PostgreSQL y Gemini detrás de interfaces.
- Una capa nunca salta a otra no adyacente ni invierte la dirección de la flecha.
- Se aplican los principios SOLID; en particular, dependencias hacia
  abstracciones (interfaces) para los proveedores externos.

### IV. DTOs en la frontera, nunca entidades

- TODA respuesta y TODA petición de la API usa DTOs dedicados.
- PROHIBIDO serializar entidades JPA hacia el cliente. El mapeo entidad↔DTO se
  hace en mappers explícitos.
- Los DTOs no exponen campos sensibles (p. ej. `passwordHash`, hashes de tokens
  de estación, secretos). El **token en claro** de una estación solo se muestra
  **una vez**, en el momento de generarse o regenerarse.

### V. Seguridad por defecto

- Autenticación **stateless** con JWT. Existen **dos sujetos** de autenticación:
  - **Usuarios** (humanos): access token de vida corta + refresh token rotativo;
    contraseñas con **BCrypt**.
  - **Estaciones** (dispositivos): un token permanente por estación (almacenado
    **hasheado**) que se intercambia, vía handshake, por un **JWT de dispositivo**
    de vida corta usado para publicar datos.
- Autorización basada en **roles** (`ADMIN`, `RESPONSABLE`, `INVESTIGADOR`,
  `USUARIO`) aplicada en cada endpoint; denegación por defecto.
- Todo endpoint exige autenticación **salvo** estas excepciones explícitas:
  `/auth/**`, los endpoints de dispositivo (`/api/device/**`, autenticados con
  credenciales de estación, nunca con sesión de usuario), la documentación pública
  y el **tier público de solo lectura** `/api/public/**`.
- El tier `/api/public/**` es **solo lectura y solo datos no sensibles**
  (estaciones aprobadas, lecturas actuales, estadísticas agregadas). NO expone
  gestión, IA, históricos crudos completos ni datos de usuarios. La **IA exige
  autenticación** (no está disponible para observadores anónimos).
- **Rate limiting** obligatorio en los endpoints de IA y en los de dispositivo
  (`/api/device/**`) para limitar coste y abuso.
- Manejo **global** de excepciones: respuestas de error uniformes, sin filtrar
  trazas internas ni secretos.
- Los secretos (BD, Gemini, JWT de usuario, JWT de dispositivo) provienen de
  variables de entorno o `secrets`; nunca se versionan.

### VI. La IA no inventa (Grounded AI)

Las respuestas de IA se fundamentan **exclusivamente** en datos registrados por
las estaciones (leídos de la base de datos) más reglas/estadísticas del backend.

- El backend obtiene primero los datos, construye el contexto y solo entonces
  invoca a Gemini.
- El prompt instruye al modelo a responder únicamente con los datos provistos y a
  declarar incertidumbre cuando falten datos. PROHIBIDO presentar alucinaciones
  como hechos.
- Si no hay datos suficientes, la respuesta lo indica explícitamente.

### VII. La estación ESP32 es un cliente no confiable

Las estaciones NO son una fuente de verdad ni un componente de confianza. Toda
lectura producida por un ESP32 entra al sistema **exclusivamente** a través de la
API REST del backend, que la **autentica, autoriza y valida** antes de
persistirla en la base de datos.

- PROHIBIDO que el ESP32 acceda a la base de datos o conozca sus credenciales.
- El **firmware del ESP32 se modifica** para hablar con el contrato REST del
  backend (`/api/device/**`). El contrato de datos (campos de una lectura:
  `timestamp`, `temperatura`, `humedad`, `presion`, `viento_kmh`, `viento_dir`,
  `viento_grados`, `lluvia_mm`) se conserva, pero la **frontera de confianza** es
  el backend, no el firmware.
- El backend revalida todo lo que recibe (estación existente y `APPROVED`, token
  válido, formato y rangos de los datos) y descarta/marca lo inválido.

### VIII. Gobernanza de estaciones

El backend administra el ciclo de vida completo de cada estación de la red.

- Toda estación se **registra** (alta por un ADMIN/RESPONSABLE o solicitud
  iniciada por el dispositivo) y queda en estado `PENDING`.
- Ninguna estación publica datos hasta ser **aprobada** por un ADMIN; al aprobarse
  se genera automáticamente su **token único** de autenticación.
- Estados de **ciclo de vida** de una estación: `PENDING`, `APPROVED`, `REJECTED`,
  `DISABLED`, `MAINTENANCE`. Solo una estación `APPROVED` (no deshabilitada ni en
  mantenimiento) puede autenticarse y publicar.
- La **conectividad** (`ONLINE`/`OFFLINE`) NO es un estado almacenado: el backend
  la **deriva** del último latido/publicación (`ultima_conexion` + umbral) y la
  expone como atributo calculado.
- El ADMIN puede **rechazar, deshabilitar, reactivar, poner en mantenimiento**
  estaciones y **regenerar o revocar** sus tokens. Cada estación pertenece a una
  **escuela** y tiene un **usuario responsable**.
- Las estaciones reportan **latidos** (heartbeat) y obtienen su **configuración**
  del backend (intervalo de envío, muestreo, zona horaria) sin reflashear.
- El backend registra un **historial de conexiones** (auditoría) de cada estación,
  detecta intentos de publicación no autorizados y genera alertas de salud cuando
  una estación queda **desconectada** o un **sensor no responde**.

## Restricciones Tecnológicas

Stack obligatorio (no se sustituye sin enmienda a esta constitución):

- **Lenguaje/Runtime**: Java 21, Spring Boot 3.5.16, Maven.
- **Persistencia única**: PostgreSQL vía Spring Data JPA. Almacena **todo** el
  sistema: usuarios, roles, permisos, escuelas, estaciones, tokens de estación,
  solicitudes de registro, refresh tokens, **lecturas meteorológicas** (lectura
  actual + histórico como series temporales), alertas, logs de conexión, logs de
  auditoría y configuración. Migraciones con **Flyway**.
- **IA**: Gemini API (invocada solo por el backend).
- **Seguridad**: Spring Security + JWT (usuarios y dispositivos) + BCrypt.
- **Calidad de código**: Lombok, Bean Validation, manejo global de excepciones.
- **Documentación de API**: OpenAPI / Swagger (springdoc).
- **Despliegue objetivo**: Render (servicio web + PostgreSQL gestionado).

Dependencias que se añaden en la fase correspondiente del roadmap (no antes):
librería JWT (jjwt o similar), cliente HTTP/SDK de Gemini, springdoc-openapi,
Bucket4j (rate limiting), Flyway. **Ya no se usa** el Firebase Admin SDK.

## Flujo de Desarrollo y Puertas de Calidad

- **Orden SDD**: cada feature pasa por spec → plan → tasks → implement.
- **Constitution Check**: `plan.md` incluye una verificación contra estos
  principios antes y después del diseño. Si algo se viola, se documenta en
  *Complexity Tracking* con justificación o se rediseña.
- **Entrega incremental**: el roadmap se divide en fases; cada fase entrega valor
  verificable de forma independiente (MVP primero).
- **Trazabilidad**: requisito → caso de uso → endpoint/contrato → tarea.
- **Sin secretos en el repo**: revisión obligatoria de que ninguna credencial se
  versione. El token legacy de Firebase del firmware antiguo debe retirarse: el
  firmware nuevo solo necesita su token de estación emitido por el backend.

## Gobernanza

Esta constitución prevalece sobre cualquier otra práctica. Las enmiendas se
documentan en este archivo con incremento de versión semántica:

- **MAJOR**: eliminación/redefinición incompatible de un principio.
- **MINOR**: nuevo principio o sección, o ampliación material de guía.
- **PATCH**: aclaraciones y correcciones sin cambio normativo.

Toda revisión de especificación o de código verifica el cumplimiento. La
complejidad añadida debe justificarse; ante la duda, se elige la opción más
simple (YAGNI).

**Versión**: 3.1.0 | **Ratificada**: 2026-06-28 | **Última enmienda**: 2026-06-28
(v3.0.0: consolidación en PostgreSQL, se retira Firebase. v3.1.0: tier público de
solo lectura `/api/public/**` con IA solo autenticada; heartbeat/config de
dispositivo; estado `MAINTENANCE` y conectividad derivada; alertas de salud)

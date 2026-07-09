# Especificación Funcional: App Móvil — Red de Estaciones (CLIMBOT)

**Feature Branch**: `002-app-movil`

**Created**: 2026-07-06

**Status**: Approved (2026-07-06) · **Incremento 002.1** en revisión (2026-07-08):
provisioning completo por BLE + credenciales de estación + fix de roles. Ver
[`plan-provisioning-completo.md`](./plan-provisioning-completo.md).

**Input**: App móvil de la Red de Estaciones Meteorológicas (CLIMBOT) que
**reemplaza** la app Flutter obsoleta (`WeatherStation_MOVIL`). La app anterior
leía datos de Firebase; en la arquitectura v3 (ver constitución `3.1.0` y spec
`001-weatherstation-backend`) **Firebase se retiró** y el **backend Spring Boot es
la única fuente de datos** (API REST + JWT). Esta app consume esa API y añade una
capacidad que la Web no puede ofrecer: la **configuración WiFi de la estación
ESP32 por Bluetooth (BLE)**.

---

## Contexto y relación con otras features

- **Depende de** la spec `001-weatherstation-backend`: consume su API REST
  (contrato en `specs/001-weatherstation-backend/contracts/openapi.yaml`). No
  introduce endpoints nuevos en el backend.
- **Comparte el modelo de acceso** de la Web (`WeatherStation_Front`): mismos
  roles, mismo flujo JWT (access + refresh con rotación), mismo tier público.
- **No** toca la base de datos ni a Gemini directamente (Principio I de la
  constitución: el backend es la única puerta a los datos).
- El **provisioning BLE** es una conversación **directa app ↔ ESP32**; el backend
  **no participa** en el handshake BLE.

### Actores

| Actor | Descripción |
|-------|-------------|
| **OBSERVADOR PÚBLICO** | Usa la app **sin cuenta**. Solo lectura de estaciones aprobadas y clima actual. No IA, no históricos crudos. |
| **USUARIO** | Persona registrada. Consulta datos actuales, históricos/gráficas y usa el asistente de IA. |
| **RESPONSABLE** | Responsable de las estaciones de **su escuela** (el "contribuyente" de hardware): solicita el alta, consulta estado/última conexión, **provisiona la estación por BLE** y ve sus credenciales. Al aprobarse su solicitud, un USUARIO/INVESTIGADOR pasa a este rol (ver §Gobernanza). |
| **INVESTIGADOR** | Consumidor de **datos** de toda la red (actuales e históricos) + IA. **Sin** hardware ni provisioning; lo asigna un ADMIN. |
| **ADMIN** | Todas las capacidades anteriores según lo que exponga el backend a su rol. |
| **ESP32 (Estación)** | Dispositivo de campo. En arranque expone un servicio BLE para recibir credenciales WiFi. La app es su configurador. |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta pública del clima sin cuenta (Priority: P1)

Cualquier persona abre la app y ve, sin registrarse, la lista de estaciones
aprobadas y el clima actual de cada una (temperatura, humedad, presión, viento,
lluvia).

**Why this priority**: Es el uso más amplio y la puerta de entrada de la app; no
requiere autenticación ni las partes más complejas (BLE, IA). Entrega valor por sí
sola y es el MVP mínimo desplegable.

**Independent Test**: Instalar la app, **sin iniciar sesión**, abrir la pantalla
pública y verificar que se listan las estaciones aprobadas y sus lecturas
actuales, sin exponer IA ni históricos crudos ni datos de usuarios.

**Acceptance Scenarios**:

1. **Given** la app recién abierta sin sesión, **When** el usuario entra a la vista
   pública, **Then** ve las estaciones aprobadas con su lectura actual.
2. **Given** la vista pública, **When** el usuario intenta acceder al asistente de
   IA o a históricos crudos, **Then** la app le pide iniciar sesión.
3. **Given** sin conectividad de red, **When** el usuario abre la app, **Then**
   recibe un mensaje de error claro y la opción de reintentar.

---

### User Story 2 - Acceso autenticado: datos, históricos e IA (Priority: P1)

Un usuario inicia sesión con correo y contraseña y obtiene acceso, según su rol, a
los datos actuales, históricos con gráficas y al asistente de IA.

**Why this priority**: Es el núcleo de valor para usuarios registrados y desbloquea
las funciones reservadas (IA e históricos). Sin sesión no hay diferenciación de
rol.

**Independent Test**: Iniciar sesión con credenciales válidas, ver el histórico de
una estación en gráfica, hacer una pregunta al asistente de IA y recibir respuesta;
comprobar que al expirar el access token la sesión se renueva sin volver a pedir
contraseña; cerrar sesión limpia las credenciales del dispositivo.

**Acceptance Scenarios**:

1. **Given** credenciales válidas, **When** el usuario inicia sesión, **Then**
   queda autenticado y ve las funciones propias de su rol.
2. **Given** una sesión activa cuyo access token expiró, **When** el usuario navega,
   **Then** la sesión se renueva de forma transparente (refresh con rotación) sin
   pedir contraseña.
3. **Given** un usuario autenticado, **When** consulta el histórico de una estación,
   **Then** ve la serie temporal en una gráfica con el rango seleccionable.
4. **Given** un usuario autenticado, **When** pregunta al asistente de IA, **Then**
   recibe una respuesta fundamentada en datos reales.
5. **Given** el refresh token inválido/expirado, **When** falla la renovación,
   **Then** la app cierra sesión y lleva al login.
6. **Given** una sesión, **When** el usuario cierra sesión, **Then** las credenciales
   se eliminan del almacenamiento seguro del dispositivo.

---

### User Story 3 - Configuración WiFi de la estación por BLE (Priority: P2)

Un RESPONSABLE (o ADMIN) enciende una estación ESP32 nueva y, desde la app,
configura la red WiFi del dispositivo por Bluetooth: la app descubre la estación,
le envía el SSID y la contraseña, y observa si el dispositivo logró conectarse.

**Why this priority**: Es el **diferenciador** de la app móvil frente a la Web (la
Web no puede hablar BLE). Es esencial para poner en marcha estaciones en campo,
pero depende de tener el resto de la app funcionando, por eso P2.

**Independent Test**: Con una estación ESP32 encendida y en modo de configuración
BLE, abrir el flujo de configuración WiFi, seleccionar la estación descubierta,
introducir SSID + contraseña, enviarlos y ver un estado de "conectado" reportado
por la estación.

**Acceptance Scenarios**:

1. **Given** una estación ESP32 encendida y anunciando su servicio BLE, **When** el
   usuario abre el configurador WiFi, **Then** la app la descubre y la muestra como
   dispositivo seleccionable.
2. **Given** una estación seleccionada, **When** el usuario envía SSID + contraseña,
   **Then** la estación intenta conectarse y la app muestra el estado reportado
   (conectando / conectado / error de credenciales).
3. **Given** los permisos de Bluetooth/ubicación denegados, **When** el usuario abre
   el configurador, **Then** la app explica por qué los necesita y ofrece abrir los
   ajustes del sistema.
4. **Given** que ninguna estación responde en un tiempo razonable, **When** termina
   el escaneo, **Then** la app informa que no encontró estaciones y permite
   reintentar.

---

### User Story 4 - Gestión de estaciones del responsable (Priority: P3)

Un RESPONSABLE solicita el alta de una nueva estación y consulta el estado y la
última conexión de las estaciones de su escuela.

**Why this priority**: Completa el ciclo de vida desde el móvil, pero el alta y la
aprobación ya están cubiertos por el backend y la Web; en móvil es una comodidad.

**Independent Test**: Como RESPONSABLE, enviar una solicitud de alta desde la app y
verla reflejada como pendiente; abrir el detalle de una estación propia y ver su
estado y su última conexión.

**Acceptance Scenarios**:

1. **Given** un RESPONSABLE autenticado, **When** solicita el alta de una estación,
   **Then** la solicitud queda registrada como pendiente en el backend.
2. **Given** un RESPONSABLE, **When** abre una estación de su escuela, **Then** ve su
   estado (aprobada / mantenimiento / deshabilitada) y su última conexión.

---

### User Story 5 - Provisioning completo por BLE + credenciales de la estación (Priority: P2)

Un RESPONSABLE (o ADMIN) pone en marcha una estación ESP32 nueva enviándole **en una sola
operación por BLE** todo lo que necesita para operar: **UUID** de la estación, **token de
acceso**, **SSID + contraseña** del WiFi y la **URL del backend**. Además, la app le permite
**ver el UUID** de la estación en cualquier momento (respaldo si no llegó el correo) y, si
es ADMIN, **regenerar el token** cuando haga falta.

**Why this priority**: Cierra el ciclo de puesta en marcha en campo sin depender de
reflashear el firmware por cada estación (hoy el UUID/token van hardcodeados). Extiende la
US3 (que solo enviaba WiFi) al provisioning completo, y resuelve el respaldo de credenciales.
Depende de la app funcionando y del firmware, por eso P2.

**Independent Test**: con un ESP32 en modo de configuración, seleccionar la estación
objetivo, enviar el paquete completo por BLE y ver que la estación **conecta al WiFi y
autentica contra el backend** (`AUTH_OK`); comprobar que la app muestra el UUID de la
estación y que un ADMIN puede regenerar el token viéndolo una sola vez.

**Acceptance Scenarios**:

1. **Given** una estación ESP32 encendida y su UUID/token conocidos por el actor, **When**
   el RESPONSABLE/ADMIN envía el paquete BLE (uuid+token+ssid+pass+url), **Then** la
   estación persiste la configuración, conecta al WiFi y la app muestra el estado hasta un
   resultado terminal (`AUTH_OK` = autenticó contra el backend, o error legible).
2. **Given** un RESPONSABLE/ADMIN autenticado, **When** abre una estación, **Then** ve su
   **UUID** con opción de copiarlo (respaldo si no llegó el correo).
3. **Given** un ADMIN, **When** regenera el token de una estación, **Then** la app muestra
   el token en claro **una sola vez** con aviso de que el anterior queda **invalidado** y la
   estación deberá re-provisionarse.
4. **Given** un RESPONSABLE que no puede recuperar el token (por seguridad no se almacena en
   claro), **When** va a provisionar, **Then** la app le permite **pegar** el token recibido
   por correo.
5. **Given** un paquete BLE malformado o incompleto, **When** el firmware lo recibe,
   **Then** reporta `BAD_CONFIG` y la app permite reintentar.

---

### Edge Cases

- **Token corrupto o almacenamiento seguro no disponible**: la app trata la sesión
  como inexistente y lleva al login sin crashear.
- **Reloj del dispositivo desfasado**: los timestamps se muestran con zona horaria
  explícita tal como los entrega el backend; la app no recalcula UTC por su cuenta.
- **BLE no soportado o apagado**: la app detecta la ausencia de Bluetooth y guía al
  usuario en vez de fallar silenciosamente.
- **Pérdida de conexión BLE a mitad del envío de credenciales**: la app informa que
  la configuración no se completó y permite reintentar sin dejar la estación en un
  estado ambiguo desde la perspectiva del usuario.
- **Respuesta de la API con rol insuficiente (403)**: la app oculta o deshabilita la
  acción correspondiente en vez de mostrar un error crudo.
- **Migración desde la app Flutter**: no hay datos locales que migrar; la app nueva
  parte de sesión limpia.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y sesión**

- **FR-001**: La app DEBE permitir usarse **sin cuenta** para la vista pública
  (estaciones aprobadas + clima actual) consumiendo solo el tier público del backend.
- **FR-002**: La app DEBE permitir iniciar sesión con correo y contraseña y obtener
  acceso según el rol devuelto por el backend.
- **FR-003**: La app DEBE renovar la sesión de forma transparente usando el refresh
  token (con rotación) cuando el access token expire, sin pedir la contraseña.
- **FR-004**: La app DEBE guardar los tokens de sesión en el **almacenamiento seguro
  del dispositivo**, nunca en texto plano accesible por otras apps.
- **FR-005**: La app DEBE permitir cerrar sesión, eliminando las credenciales del
  dispositivo.
- **FR-006**: La app DEBE reservar el asistente de IA y los históricos crudos a
  usuarios **autenticados**; el observador público no accede a ellos.

**Datos y visualización**

- **FR-007**: La app DEBE mostrar la lista de estaciones y el clima actual de cada
  una (temperatura, humedad, presión, viento, lluvia).
- **FR-008**: La app DEBE mostrar el histórico de una estación como serie temporal en
  una gráfica, con rango de tiempo seleccionable, para usuarios autenticados.
- **FR-009**: La app DEBE permitir a un usuario autenticado hacer preguntas en
  lenguaje natural al asistente de IA y mostrar la respuesta del backend.
- **FR-010**: La app DEBE mostrar las alertas meteorológicas que exponga el backend.
- **FR-011**: La app DEBE mostrar todos los tiempos con su zona horaria explícita tal
  como los entrega el backend, sin recalcular la conversión de UTC en el cliente.

**Roles y gobernanza (vista móvil)**

- **FR-012**: La app DEBE respetar los permisos por rol: solo muestra u ofrece las
  acciones que el rol del usuario permite según el backend.
- **FR-013**: La app DEBE permitir a un RESPONSABLE **solicitar el alta** de una
  estación.
- **FR-014**: La app DEBE permitir a un RESPONSABLE consultar el **estado** y la
  **última conexión** de las estaciones de su escuela.

**Configuración WiFi por BLE**

- **FR-015**: La app DEBE descubrir por BLE las estaciones ESP32 que estén anunciando
  su servicio de configuración (nombre `Meteo-{estacionId}`).
- **FR-016** *(modificado en 002.1)*: La app DEBE enviar a la estación seleccionada, por
  BLE y en **un solo paquete**, la configuración completa de operación: **UUID** de la
  estación, **token de acceso**, **SSID + contraseña** del WiFi y la **URL del backend**.
  (Sustituye al envío previo de solo SSID+contraseña de la US3.)
- **FR-017**: La app DEBE observar y mostrar el **estado de conexión** que la estación
  reporte durante y después del envío de credenciales, hasta un resultado terminal:
  `AUTH_OK` (la estación autenticó contra el backend) o un error legible.
- **FR-018**: La app DEBE solicitar y gestionar los permisos de **Bluetooth** (y
  ubicación cuando el sistema lo exija para BLE), explicando su propósito y guiando al
  usuario si están denegados.
- **FR-019** *(reforzado en 002.1)*: La app **NO** DEBE enviar al backend las credenciales
  WiFi **ni el token de acceso** de la estación, ni registrarlos en logs; el paquete de
  provisioning es exclusivamente app ↔ ESP32. (Verificable: ninguna llamada a la API lleva
  ssid/pass/token; no aparecen en `console`/logs.)

**Credenciales de la estación (002.1)**

- **FR-022**: La app DEBE mostrar a RESPONSABLE/ADMIN el **UUID** de la estación, con opción
  de copiarlo, como respaldo si no llegó el correo con las credenciales.
- **FR-023**: La app DEBE mostrar el **token de acceso en claro únicamente** en el momento
  de generarlo (aprobación) o **regenerarlo**, con aviso de que no se volverá a mostrar. El
  backend guarda solo el hash: la app **NO** puede recuperar un token existente.
- **FR-024**: La app DEBE permitir a un **ADMIN** regenerar el token de una estación,
  advirtiendo que **invalida el token anterior** y obliga a re-provisionar. Regenerar y
  aprobar son acciones **solo ADMIN** (el backend no cambia su autorización).
- **FR-025**: La app DEBE permitir a un RESPONSABLE **pegar** manualmente el token (recibido
  por correo) para provisionar, dado que no puede regenerarlo ni recuperarlo del backend.
- **FR-026** *(seguridad del provisioning BLE)*: El token y la contraseña WiFi viajan por
  BLE app↔ESP32. **Postura de riesgo (aceptada)**: el provisioning es **presencial**, de
  **corto alcance** y de **un solo uso**; la app **NO** registra el token ni la contraseña
  en logs; y el token es **regenerable/revocable por un ADMIN** si se sospecha compromiso
  (Principio VIII). **Endurecimiento recomendado (SHOULD, futuro)**: habilitar
  *bonding*/cifrado del enlace BLE en la app y el firmware. La app DEBERÍA advertir al
  usuario de hacer el provisioning en un entorno de confianza.

**Errores y estado**

- **FR-020**: La app DEBE mostrar mensajes de error legibles y opciones de reintento
  ante fallos de red, de BLE o de la API, sin exponer detalles técnicos crudos.
- **FR-021**: La app DEBE tratar cualquier respuesta `401` no recuperable como sesión
  terminada y llevar al login.

### Key Entities *(vistas por la app; el dueño del dato es el backend)*

- **Sesión**: access token + refresh token + usuario (id, nombre, rol). Vive en el
  almacenamiento seguro del dispositivo.
- **Estación**: identidad, escuela, estado (aprobada / mantenimiento / deshabilitada),
  última conexión y su lectura actual. Proviene del backend.
- **Lectura**: medición de una estación (temperatura, humedad, presión, viento,
  lluvia) con marca de tiempo y zona horaria. Actual (para la vista) e histórica (para
  gráficas).
- **Alerta**: evento meteorológico que expone el backend.
- **Dispositivo BLE de estación**: representación efímera durante el provisioning
  (nombre anunciado y el **paquete de configuración** a enviar: `uuid`, `token`, `ssid`,
  `password`, `url` del backend; más el estado de conexión reportado). La contraseña WiFi y
  el token no se loguean; el paquete no se envía al backend (es app ↔ ESP32).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un observador sin cuenta puede ver el clima actual de una estación en
  **menos de 15 segundos** desde que abre la app (con red normal).
- **SC-002**: Un usuario puede iniciar sesión y llegar al histórico o al asistente de
  IA de una estación en **3 acciones o menos** desde la pantalla inicial.
- **SC-003**: La renovación de sesión ocurre de forma transparente en el **100 %** de
  los casos en que el refresh token es válido, sin que el usuario vuelva a escribir la
  contraseña.
- **SC-004** *(actualizado en 002.1)*: Un RESPONSABLE/ADMIN provisiona por BLE una estación
  encendida (paquete completo) y recibe confirmación **`AUTH_OK`** (WiFi **y** autenticación
  contra el backend) en **menos de 2 minutos**, sin instrucciones externas, en al menos el
  **90 %** de los intentos con credenciales correctas.
- **SC-005**: La app **no** expone IA, históricos crudos ni datos de usuarios a
  observadores sin cuenta (verificable revisando cada pantalla pública).
- **SC-006**: **Cero** dependencias de Firebase en la app final (verificable en las
  dependencias del proyecto): toda la información proviene del backend.

## Assumptions

- **Reutilización del acceso Web**: la app reutiliza el contrato de API, los tipos y
  el patrón de autenticación (JWT + refresh) ya implementados en
  `WeatherStation_Front`; no se rediseñan.
- **El backend no cambia**: esta feature no añade endpoints; si algo faltara (p. ej.
  para push en el futuro) sería una feature aparte que modifique la spec `001`.
- **Sin notificaciones push** en esta versión (se pospone; requeriría trabajo backend
  nuevo de registro de token de dispositivo y envío). Documentado en *Out of Scope*.
- **Plataforma objetivo Android** para la validación de esta versión; el código es
  multiplataforma pero iOS no se valida aún.
- **El firmware ESP32 ya expone el servicio BLE** de configuración con el nombre y las
  características esperadas. *(Corregido en 002.1: en el firmware v3 `iniciarBLE()` nunca se
  llama — el BLE está inerte — y el UUID/token/URL van hardcodeados. El incremento 002.1 SÍ
  cambia el firmware: activar BLE, recibir el paquete único y persistirlo en NVS.)*
- **Conectividad**: se asume red disponible para las funciones de datos; el
  provisioning BLE funciona sin red (es local al dispositivo).
- **Stack de implementación** (detalle que se fija en `plan.md`): React Native con
  Expo (development build) y compilación en la nube (EAS); almacenamiento seguro de
  tokens del dispositivo; librería BLE nativa. Se registra aquí como dependencia, no
  como requisito funcional.

## Out of Scope (esta versión)

- **Notificaciones push** de alertas (fase posterior; requiere ampliar el backend).
- **iOS** validado/publicado (foco Android por ahora).
- **Gestión administrativa completa** (aprobar/rechazar estaciones, usuarios,
  escuelas): se mantiene en la Web; la app se limita a lo que el rol necesita en
  campo.
- **Modo offline / caché persistente** de lecturas históricas.
- ~~**Cambios en el firmware ESP32** o en el backend.~~ *(Revisado en 002.1: el firmware SÍ
  entra en alcance para el provisioning completo. El **backend** sigue sin cambios en la
  app, salvo un **fix de gobernanza** aparte —spec `001`— que corrige el ascenso de rol al
  aprobar una solicitud: debe ser **RESPONSABLE**, no INVESTIGADOR. Ver `plan-provisioning-completo.md` §7.)*

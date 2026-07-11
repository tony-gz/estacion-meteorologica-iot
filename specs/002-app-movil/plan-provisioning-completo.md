# Plan — Provisioning completo por BLE + credenciales en la app (incremento 002.1)

**Branch**: `002-app-movil` | **Fecha**: 2026-07-08 | **Estado**: PROPUESTO (pendiente de aprobar)

Extiende la feature 002. Nace de dos observaciones en campo:

1. **Bug**: al abrir el detalle de una estación decía "no existe" (ya corregido, ver §1).
2. **Necesidad**: RESPONSABLE/ADMIN deben poder, desde la app, **provisionar una
   estación ESP32 completa por BLE** (no solo WiFi) y **ver sus credenciales** (UUID
   siempre; token cuando el backend lo entrega), como respaldo si no llega el correo.

## Decisiones tomadas (usuario, 2026-07-08)

| Tema | Decisión |
|------|----------|
| **Token** | Mantener seguridad: el token en claro se muestra **solo** al aprobar la solicitud o al **regenerarlo**; NO se cambia el backend para guardarlo en claro. UUID siempre visible. |
| **Roles** | La sección de provisioning + credenciales es para **RESPONSABLE + ADMIN** (el "investigador que contribuye" ≙ RESPONSABLE en este sistema). |
| **URL backend** | Sí viaja en el paquete BLE (`uuid+token+ssid+pass+url`), para reapuntar estaciones sin reflashear. |
| **Bug detalle** | Arreglado ya, fuera del flujo SDD (fix trivial). |

---

## §1. Fix del bug de detalle (YA APLICADO)

**Causa raíz**: la lista navegaba al detalle con `item.id` (PK de BD), pero el backend
resuelve `GET /estaciones/{id}` por **`findByUuid`**. PK ≠ uuid → 404 → "no existe".
Afectaba también historial, gráficas, estadísticas y conexiones (misma cadena de param).

**Cambio**: `EstacionesScreen.tsx` ahora pasa `item.uuid` (y `keyExtractor` usa `uuid`).
Un solo punto corrige toda la cadena. `tsc --noEmit` limpio. Falta **rebuild + prueba**
en dispositivo.

---

## §2. Hallazgos que condicionan el diseño

1. **El BLE del firmware v3 está inerte**: `iniciarBLE()` existe pero **nunca se llama**
   en `setup()` (salta directo a `esperarConfiguracionBLE()`). Hoy el WiFi entra por
   `#define`/NVS, no por BLE. US3 nunca funcionó E2E. **Hay que arreglarlo** (1 línea)
   como parte de este incremento.
2. **Token hasheado en el backend** (`StationToken` guarda solo SHA-256). El valor en
   claro existe **una sola vez**, al generarse. Endpoints que lo devuelven (ambos
   **ADMIN**): `POST /solicitudes/{id}/aprobar` y `POST /estaciones/{id}/regenerar-token`.
   ⇒ **No hay forma de "recuperar" un token existente.** El UUID sí (es público).
3. **La app hoy no muestra UUID ni token** en ninguna pantalla, y el paquete BLE actual
   solo manda SSID+PASS+APPLY (`provisioning.ts`).
4. **Alcance real**: toca **3 componentes** y rompe supuestos de la spec 002
   ("firmware NO cambia", "solo SSID+password"). Es expansión de spec, no ajuste menor.

### Wrinkle de roles + token (a tener presente)

Como regenerar/aprobar son **ADMIN-only** y el token no se puede recuperar:
- **ADMIN**: puede aprobar/regenerar → obtiene el token en claro en la app → provisiona
  en un tap.
- **RESPONSABLE**: NO puede recuperar el token del backend. Para provisionar por BLE debe
  **pegar el token** que recibió por correo. La app le ofrece un campo para ello.

El **UUID** sí se muestra a ambos (RESPONSABLE + ADMIN).

---

## §3. Diseño por componente

### 3.1 Firmware ESP32 (`ESTACION1_ESP32_v3.txt`) — complejidad baja-media (~1-2 h)

- **Arreglar** la llamada faltante a `iniciarBLE()` en `setup()`.
- Negociar **MTU 512** (`BLEDevice::setMTU(512)`) para que quepa el JSON en un write.
- Nueva característica **CONFIG** `beb5483e-...-b26ac` (write): recibe un JSON único
  `{"uuid","token","ssid","pass","url"}` (parseo con ArduinoJson, ya incluido).
- Convertir `EST_UUID`, `EST_TOKEN`, `BACKEND_URL` de `#define` a **variables `String`**
  cargadas de NVS (con los `#define` como *fallback*). Sustituir sus ~6 usos en
  `obtenerDeviceToken()`, `enviarLectura()`, `enviarHeartbeat()` y logs.
- Extender NVS (`Preferences`, namespace `wifi`): persistir además `uuid`, `token`, `url`.
- **STATUS** nuevos: `CONFIG_OK` (paquete válido), `BAD_CONFIG` (JSON inválido / faltan
  campos). Tras conectar WiFi, hacer el handshake `/api/device/auth` con el nuevo
  uuid+token y emitir `AUTH_OK` o `AUTH_FAIL:{code}` → **confirma end-to-end** que las
  credenciales sirven, no solo que hubo WiFi.
- Mantener SSID/PASS/CMD/STATUS actuales por compatibilidad; el flujo nuevo usa CONFIG.

### 3.2 App móvil (`WeatherStation_MOVIL`)

**Capa BLE** (`src/ble/`):
- `provisioning.ts`: nueva función `provisionCompleto({uuid, token, ssid, pass, url})` que
  hace `requestMTU(512)`, escribe **un** paquete JSON en CONFIG, y observa STATUS
  (incluye `CONFIG_OK`/`BAD_CONFIG`/`AUTH_OK`/`AUTH_FAIL`). El flujo SSID/PASS/APPLY queda
  como *fallback* legado.
- `status.ts`: mapear los nuevos estados.

**Pantalla de configuración** (`ConfigWifiBLEScreen.tsx`):
- Recibir por navegación la estación objetivo `{ uuid, nombre, token? }` (hoy no recibe
  params). Prefill de `uuid` (+ `token` si se acaba de generar/regenerar en esta sesión).
- Campos: SSID, password WiFi, y **token** (editable / pegable para RESPONSABLE), URL del
  backend (prefill con la de producción, editable).
- Mostrar progreso con los STATUS nuevos hasta `AUTH_OK` (éxito real) o error.

**Nueva sección "Credenciales de la estación"** (nueva pantalla `CredencialesScreen` o
bloque en el detalle):
- **UUID**: siempre visible + botón *copiar*.
- **Token**: si se acaba de generar/regenerar en esta sesión, mostrarlo con aviso "se ve
  una sola vez, cópialo". Si no, explicar que por seguridad no se puede recuperar y ofrecer
  (solo ADMIN) **"Regenerar token"** (con confirmación: *invalida el anterior; habrá que
  re-provisionar*).
- Botón **"Provisionar por BLE"** que abre `ConfigWifiBLE` con `{uuid, token?}` precargado.

**Datos** (`src/lib/queries.ts` + `types.ts`): usar el tipo `StationToken` (ya existe,
sin usar) y añadir mutations:
- `useRegenerarToken(uuid)` → `POST /estaciones/{id}/regenerar-token` (ADMIN).
- (Opcional, si ADMIN aprueba desde la app) `useAprobarSolicitud(id)` →
  `POST /solicitudes/{id}/aprobar` para capturar el token en el momento del alta.

**Roles/gating**: la sección de credenciales + provisioning se muestra a
`tieneRol('RESPONSABLE','ADMIN')`; el botón *Regenerar* y *Aprobar* solo a `ADMIN`.

### 3.3 Backend — **sin cambios de código**

Los endpoints necesarios ya existen (`regenerar-token`, `aprobar`, `device/auth`). Solo se
consumen desde la app. (Si más adelante se quisiera que RESPONSABLE regenere su propio
token, sería un cambio de autorización en `SecurityConfig` = otra decisión, otra spec.)

---

## §4. Contrato BLE — cambios

Ver `contracts/ble-gatt.md` (se actualiza en este incremento): nueva característica CONFIG,
MTU 512, formato JSON del paquete, y STATUS `CONFIG_OK`/`BAD_CONFIG`/`AUTH_OK`/`AUTH_FAIL`.

---

## §5. Requisitos nuevos/modificados (para spec.md)

- **US5** (nueva, P2): Provisioning completo por BLE + credenciales (RESPONSABLE/ADMIN).
- **FR-016 (modificado)**: la app envía en **un paquete BLE** SSID, password, **UUID,
  token y URL** del backend (no solo SSID+password).
- **FR-022**: mostrar el **UUID** de la estación a RESPONSABLE/ADMIN, con copiar.
- **FR-023**: mostrar el **token en claro solo** al generarlo/regenerarlo; nunca
  recuperarlo; ADMIN puede regenerar (con aviso de invalidación).
- **FR-024**: confirmar el resultado real del provisioning vía STATUS del firmware hasta
  `AUTH_OK` (autenticó contra el backend) o error legible.
- **Assumptions/Out-of-Scope**: en este incremento el **firmware SÍ cambia**; el backend
  **no**.

---

## §6. Tareas (borrador, se formaliza en tasks.md tras aprobar)

**Firmware** (T-FW): 1) llamar `iniciarBLE()`; 2) MTU 512 + char CONFIG; 3) callback JSON;
4) macros→variables NVS + sustituir usos; 5) STATUS nuevos + handshake AUTH_OK.

**App** (T-APP): 6) `provisionCompleto` + status nuevos; 7) params + campos en
`ConfigWifiBLEScreen`; 8) pantalla/bloque Credenciales; 9) mutations
`regenerar-token`/`aprobar` + tipos; 10) gating por rol; 11) tests + `tsc`/`eslint`.

**Contrato/spec** (T-DOC): 12) `ble-gatt.md`; 13) `spec.md` (US5+FRs); 14) `data-model.md`
(paquete BLE con uuid/token/url).

**Validación** (T-VAL): 15) rebuild release; 16) provisioning E2E con ESP32 real hasta
`AUTH_OK` (SC-004).

---

## §7. Modelo de roles y permisos (revisado 2026-07-08)

**Decisión**: mantener los **4 roles** (`ADMIN, RESPONSABLE, INVESTIGADOR, USUARIO`) y
**corregir la inconsistencia del ascenso**. NO se retira ningún rol.

### Definición canónica (fuente de verdad: backend `SecurityConfig` + servicios)

| Rol | Función | Alcance |
|-----|---------|---------|
| **USUARIO** | Registrado básico: clima actual + IA + solicitar alta + ver sus solicitudes. | Global (solo aprobadas) |
| **INVESTIGADOR** | USUARIO + lee **históricos/estadísticas** de toda la red. Consumidor de datos, **sin hardware**. Lo asigna ADMIN. | Red (solo lectura) |
| **RESPONSABLE** | USUARIO + analytics + **gestiona las estaciones de su escuela**: registrar/editar, conexiones, **provisioning BLE**, ve sus estaciones no aprobadas. | Su escuela |
| **ADMIN** | Todo + gobernanza (aprobar/rechazar, regenerar token, mantenimiento, deshabilitar) + escuelas + usuarios. | Global |

### Bug de gobernanza a corregir (backend — spec 001)

`SolicitudService.aprobar()` (líneas ~199-204) asciende al solicitante `USUARIO` a
**INVESTIGADOR**, pero la estación queda con `responsable = solicitante` y todas las
capacidades de gestión (editar, conexiones, provisioning, ver no-aprobadas) están gated a
**RESPONSABLE**. ⇒ el aportante no puede gestionar su propia estación.

**Fix (T-BE)**: en `aprobar()`, si el solicitante es `USUARIO` **o** `INVESTIGADOR`,
ponerlo en **RESPONSABLE** y asignarle la `escuela` resuelta/creada en la aprobación
(consistente con `UsuarioService:124`, que exige escuela para RESPONSABLE). No degradar
ADMIN. **Backfill**: revisar usuarios ya ascendidos a INVESTIGADOR que sean `responsable`
de alguna estación y remapearlos a RESPONSABLE (script/consulta única).

### Efecto en este incremento

- El gating de provisioning BLE + credenciales queda **RESPONSABLE + ADMIN**, ahora
  coherente (los contribuyentes se vuelven RESPONSABLE al aprobarse su alta).
- **Regenerar token** y **aprobar solicitud** siguen **ADMIN-only** (sin cambio de auth).
- INVESTIGADOR (investigador puro, sin hardware) **no** provisiona ni ve credenciales.

## §8. Riesgos

- **MTU/tamaño**: si el cliente no negocia MTU o escribe en trozos, el JSON podría
  fragmentarse. Mitigación: `requestMTU(512)` + validar `CONFIG_OK`; si falla, *fallback*
  a escrituras por campo.
- **Token irrecuperable**: si el usuario no copia el token al generarlo, solo queda
  regenerar (re-provisionar). La UI debe insistir en copiarlo.
- **TLS inseguro en ESP32** (`setInsecure()`): ya existente; fuera de alcance aquí, anotado.
- **Compatibilidad**: mantener el flujo legado evita romper firmwares viejos durante la
  transición.

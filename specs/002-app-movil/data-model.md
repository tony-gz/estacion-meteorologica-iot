# Data Model — App Móvil (Fase 1)

La app **no posee** datos: la fuente de verdad es el backend (spec `001`). Aquí se
describen (a) los DTOs que la app consume, como tipos TS espejo, y (b) el modelo local
de la sesión y del provisioning BLE (efímero, no se persiste ni se envía al backend).

## 1. Tipos espejo de DTOs (consumidos del backend)

Se **portan** desde `WeatherStation_Front/src/lib/types.ts` (ya alineados con los DTOs
v3). Resumen de los relevantes para la app:

| Tipo | Campos clave | Origen (endpoint) |
|------|--------------|-------------------|
| `Rol` | `ADMIN \| RESPONSABLE \| INVESTIGADOR \| USUARIO` | `/auth/login` |
| `AuthResponse` | `accessToken`, `refreshToken`, `expiresIn`, `usuario` | `/auth/login`, `/auth/refresh` |
| `Usuario` | `id`, `nombre`, `email`, `rol`, `escuelaId/Nombre`, `activo` | `/auth/login` |
| `Lectura` | `timestamp`, `temperatura`, `humedad`, `presion`, `vientoKmh`, `vientoDir`, `lluviaMm` | `/estaciones/{id}/actual`, `/historial` |
| `Estacion` | `id`, `uuid`, `nombre`, `estado`, `conectividad`, `ultimaConexion`, `enLinea`, `ultimaLectura`, `escuela/responsable` | `/estaciones`, `/estaciones/{id}` |
| `PublicEstacion` | subconjunto no sensible de estación + lectura actual | `/api/public/weather/latest`, `/api/public/stations` |
| `Alerta` | `tipo`, `severidad`, `estado`, `timestamp`, `estacionId` | `/alertas` |
| `Solicitud` | `estado`, estación asociada | `/solicitudes` |
| `IaResponse` | respuesta del asistente | `/ia/preguntar`, `/ia/resumen`, `/ia/prediccion` |

**Regla de validación heredada**: los timestamps se muestran con la zona horaria que
entrega el backend; la app **no** recalcula UTC (FR-011).

## 2. Sesión (local, en SecureStore)

| Campo | Tipo | Notas |
|-------|------|-------|
| `accessToken` | string | JWT de vida corta. Se adjunta como `Authorization: Bearer`. |
| `refreshToken` | string | Rotativo. Se usa en `/auth/refresh`; se reemplaza tras cada refresh. |
| `usuario` | `Usuario` | Se usa para gating por rol en la UI. |

- **Estados de sesión**: `anónimo` (solo público) → `autenticado` (login OK) →
  `refrescando` (access expirado, refresh en curso) → `expirado` (refresh falla → logout).
- **Transición de logout**: borra las tres claves de SecureStore y vuelve a `anónimo`.
- **Gating por rol**: `RESPONSABLE`/`ADMIN` ven solicitar-alta, estado de sus estaciones,
  **provisioning BLE** y **credenciales** (UUID siempre; token solo al generar/regenerar).
  Regenerar token y aprobar solicitud son **solo ADMIN**. `INVESTIGADOR`/`USUARIO` ven
  datos+IA (INVESTIGADOR además históricos de red); acciones no permitidas se ocultan (no se
  muestran errores 403 crudos, FR-012). Ver matriz de roles en `plan-provisioning-completo.md` §7.

## 3. Provisioning BLE (efímero — nunca se persiste ni viaja al backend)

**Paquete de configuración completo (002.1)** — se envía como **un JSON** en la
característica CONFIG (ver [`contracts/ble-gatt.md`](./contracts/ble-gatt.md)):

| Campo | Tipo | Notas |
|-------|------|-------|
| `deviceId` | string | Id BLE del periférico descubierto. |
| `nombreAnunciado` | string | `Meteo-{EST_UUID}` (UUID completo). La app filtra por prefijo `Meteo-`. |
| `uuid` | string | UUID de la estación (prefill desde la estación elegida). |
| `token` | string | Token de acceso. Prefill si se acaba de generar/regenerar; si no, el usuario lo **pega** (FR-025). **No** se loguea (FR-019). |
| `ssid` | string | Red WiFi a la que conectará la estación. |
| `password` | string | Contraseña WiFi. **No** se loguea ni se envía a la API (FR-019). |
| `url` | string | URL del backend (prefill con la de producción; editable). Opcional. |
| `estadoConexion` | string | Notificado por STATUS. Valores en [`contracts/ble-gatt.md`](./contracts/ble-gatt.md): `CONFIG_OK`/`BAD_CONFIG`, `CONNECTING:{ssid}`, `WIFI_OK:{ip}`, **`AUTH_OK`** (éxito real), `AUTH_FAIL:{code}`, `NO_AP`, `BAD_PASSWORD`, `WIFI_FAIL`. |

- **Máquina de estados (002.1)**:
  `escanear → encontrado → conectar(GATT) → MTU 512 → descubrir servicios →
   escribir CONFIG(JSON) → CONFIG_OK → CONNECTING → WIFI_OK → AUTH_OK | (BAD_CONFIG | AUTH_FAIL | WIFI_FAIL | timeout)`.
- **Fallback legado** (solo WiFi): `escribir SSID → PASS → APPLY → WIFI_OK`.
- **Limpieza**: al salir o completar, se desconecta el periférico y se descartan del
  memoria `token`/`ssid`/`password`.

### Token de estación (`StationToken`) — modelo local efímero

| Campo | Tipo | Notas |
|-------|------|-------|
| `estacionId`/`uuid` | string | Identidad de la estación. |
| `token` | string | En claro **solo** al aprobar/regenerar; no se persiste ni se cachea (FR-023). |
| `generadoEn` | ISO | Marca de generación. |
| `aviso` | string | "Guarde este token: no se volverá a mostrar." (del backend). |

Fuente: `POST /solicitudes/{id}/aprobar` y `POST /estaciones/{id}/regenerar-token` (ADMIN).

## Entidades explícitamente ausentes

- No hay modelo de **push/notification token** (fuera de alcance).
- No hay **caché offline** de lecturas (sin almacenamiento persistente de datos meteo).

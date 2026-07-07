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
- **Gating por rol**: `RESPONSABLE` ve solicitar-alta y estado de sus estaciones;
  `INVESTIGADOR`/`USUARIO` ven datos+IA; acciones no permitidas se ocultan (no se muestran
  errores 403 crudos, FR-012).

## 3. Provisioning BLE (efímero — nunca se persiste ni viaja al backend)

| Campo | Tipo | Notas |
|-------|------|-------|
| `deviceId` | string | Id BLE del periférico descubierto. |
| `nombreAnunciado` | string | `Meteo-{EST_UUID}` (UUID completo, p. ej. `Meteo-60ce6191-...`). La app filtra por prefijo `Meteo-`. |
| `ssid` | string | Red WiFi a la que conectará la estación. Se escribe en la característica SSID. |
| `password` | string | Contraseña WiFi. Se escribe en la característica PASS. **No** se loguea ni se envía a la API (FR-019). |
| `estadoConexion` | string | Notificado por STATUS. Valores reales del firmware en [`contracts/ble-gatt.md`](./contracts/ble-gatt.md): `SSID_OK`, `PASS_OK`, `CONNECTING:{ssid}`, `WIFI_OK:{ip}` (éxito), `NO_AP`, `BAD_PASSWORD`, `WIFI_FAIL`, `ERR_NO_SSID`. |

- **Máquina de estados del flujo BLE**:
  `escanear → encontrado → conectar(GATT) → descubrir servicios →
   escribir SSID → escribir PASS → (opcional CMD "connect") →
   observar STATUS → CONNECTED | WIFI_FAIL | timeout`.
- **Limpieza**: al salir de la pantalla o completar, se desconecta el periférico y se
  descartan `ssid`/`password` de memoria.

## Entidades explícitamente ausentes

- No hay modelo de **push/notification token** (fuera de alcance).
- No hay **caché offline** de lecturas (sin almacenamiento persistente de datos meteo).

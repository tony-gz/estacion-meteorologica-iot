# Contrato BLE (GATT) — App móvil ↔ ESP32

Fuente de verdad: firmware `WeatherStation_ESP32/ESTACION1_ESP32_v3.txt`. Este contrato
es **directo app ↔ dispositivo**; el backend **no** participa.

## Anuncio (advertising)

- **Nombre BLE**: `Meteo-{EST_UUID}` — usa el **UUID completo** de la estación, no un id
  corto. Ejemplo real: `Meteo-60ce6191-cf10-48eb-88ae-045cda08568c`.
  > Corrección respecto al borrador inicial: no es `Meteo-estacion1`. La app debe filtrar
  > por prefijo `Meteo-` y mostrar el UUID; el usuario elige el dispositivo por su nombre.
- El ESP32 re-anuncia automáticamente tras cada desconexión.

## Servicio y características

**Servicio**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

| Característica | UUID | Operación (app) | Contenido |
|---------------|------|-----------------|-----------|
| SSID | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | **write** | string SSID |
| PASS | `beb5483e-36e1-4688-b7f5-ea07361b26a9` | **write** | string contraseña WiFi |
| STATUS | `beb5483e-36e1-4688-b7f5-ea07361b26aa` | **read + notify** | string de estado (ver abajo) |
| CMD | `beb5483e-36e1-4688-b7f5-ea07361b26ab` | **write** | comando; se usa `APPLY` (flujo legado) |
| **CONFIG** *(002.1)* | `beb5483e-36e1-4688-b7f5-ea07361b26ac` | **write** | **paquete único JSON** con toda la config (ver §Provisioning completo) |

> **MTU**: para que el paquete CONFIG (~250–300 bytes) quepa en un solo *write*, la app
> **DEBE** negociar MTU (`requestMTU(512)`) tras conectar, y el firmware lo declara
> (`BLEDevice::setMTU(512)`). Si el MTU no sube, la app hace *fallback* al flujo legado por
> características separadas (SSID/PASS/APPLY).

## Flujo de provisioning **completo** (002.1 — recomendado)

1. **Escanear** y filtrar por nombre que empiece con `Meteo-`.
2. **Conectar** (GATT); **negociar MTU 512**; suscribirse a **notify** de STATUS.
3. **Escribir CONFIG** con el paquete JSON único (ver abajo).
   - JSON válido y campos mínimos → STATUS `CONFIG_OK`; el ESP32 persiste en NVS y aplica.
   - JSON malformado / faltan campos → STATUS `BAD_CONFIG` (error terminal; la app permite
     reintentar re-enviando el paquete).
4. El ESP32 intenta conectar al WiFi → `CONNECTING:{ssid}` → `WIFI_OK:{ip}` o error.
5. Con WiFi arriba, el ESP32 hace el handshake `POST /api/device/auth` con el uuid+token
   recibidos → **`AUTH_OK`** (terminal éxito) o **`AUTH_FAIL:{code}`** (terminal error:
   uuid/token inválidos o backend inalcanzable).
6. **Observar STATUS** hasta terminal (`AUTH_OK` / error) o timeout (~45 s, incluye red).

### Paquete JSON de CONFIG

```json
{
  "uuid":  "60ce6191-cf10-48eb-88ae-045cda08568c",
  "token": "stk_…",
  "ssid":  "MiRedWiFi",
  "pass":  "secreto",
  "url":   "https://weatherstation-backend.onrender.com"
}
```

- `uuid`, `token`, `ssid`, `pass` son **obligatorios**; `url` es **opcional** (si falta, el
  firmware usa la del `#define`/NVS previa).
- El firmware persiste `uuid`, `token`, `url`, `ssid`, `pass` en NVS (namespace `wifi`) y
  los usa en `obtenerDeviceToken()` / `enviarLectura()` / `enviarHeartbeat()`.

## Flujo de provisioning **legado** (US3 — solo WiFi, *fallback*)

1. **Escanear** y filtrar por `Meteo-`.
2. **Conectar** (GATT); suscribirse a **notify** de STATUS.
3. **Escribir SSID** → STATUS `SSID_OK`.
4. **Escribir PASS** → STATUS `PASS_OK`.
5. **Escribir CMD = `APPLY`** → intenta conectar (sin SSID: `ERR_NO_SSID`).
6. **Observar STATUS** hasta terminal o timeout. *(No cambia uuid/token/url del firmware.)*

## Valores de STATUS (emitidos por el firmware)

| Valor | Significado | UI sugerida |
|-------|-------------|-------------|
| `CONFIG_OK` *(002.1)* | Paquete CONFIG válido y persistido | progreso |
| `BAD_CONFIG` *(002.1)* | JSON malformado / faltan campos | error, reintentar paquete |
| `SSID_OK` | SSID recibido (flujo legado) | progreso |
| `PASS_OK` | Contraseña recibida (flujo legado) | progreso |
| `CONNECTING:{ssid}` | Intentando conectar a esa red | "Conectando a {ssid}…" |
| `WIFI_OK:{ip}` | WiFi conectada; obtuvo IP | "WiFi ✅ ({ip})" — progreso en 002.1 |
| `AUTH_OK` *(002.1)* | **Éxito real**: autenticó contra el backend | "Estación en línea ✅" — terminal |
| `AUTH_FAIL:{code}` *(002.1)* | Falló el handshake `/api/device/auth` (ver códigos abajo) | error, revisar token/URL |
| `NO_AP` / `NO_SSID_AVAIL` | Red no encontrada | error, reintentar SSID |
| `BAD_PASSWORD` | Contraseña incorrecta | error, reintentar PASS |
| `WIFI_FAIL` | Falló la conexión (genérico) | error, reintentar |
| `ERR_NO_SSID` | `APPLY` sin SSID previo (legado) | error de flujo |
| `NO_CREDS` | Arrancó sin credenciales guardadas | informativo |
| `REBOOTING` | El dispositivo se reinicia | informativo |

- **Terminal de éxito**: `AUTH_OK` (002.1) — confirma WiFi **y** autenticación. En el flujo
  legado (solo WiFi), el terminal de éxito sigue siendo `WIFI_OK:{ip}`.
- **Terminales de error**: `AUTH_FAIL:{code}`, `NO_AP`, `BAD_PASSWORD`, `WIFI_FAIL`, `ERR_NO_SSID`.
- **Timeout** de la app si no llega estado terminal en un tiempo razonable (~45 s en 002.1,
  que incluye el handshake de red; ~30 s en el flujo legado solo-WiFi).

### Códigos de `AUTH_FAIL:{code}` (002.1)

| `{code}` | Significado | UI sugerida |
|----------|-------------|-------------|
| `401` | uuid/token inválidos o no coinciden (backend rechazó el handshake) | "Token o UUID incorrectos. Revísalos o regenera el token." |
| `NET` | Backend inalcanzable (DNS/red/TLS) tras conectar al WiFi | "No se pudo contactar el backend. Revisa la URL." |
| `TIMEOUT` | El handshake no respondió en el plazo del firmware | "El backend no respondió. Reintenta." |

## Reglas

- La contraseña WiFi **y el token de acceso** **no** se registran en logs ni se envían a la
  API (FR-019). El paquete CONFIG es app ↔ ESP32.
- **Seguridad del enlace (FR-026)**: el paquete CONFIG (incluye el token de estación) viaja
  por BLE **sin cifrado de enlace** en esta versión. Riesgo **aceptado** por ser provisioning
  presencial, de corto alcance y un solo uso; el token es **regenerable/revocable** por un
  ADMIN si se compromete. *Endurecimiento futuro (SHOULD)*: bonding/cifrado BLE en app y
  firmware. La app debería sugerir provisionar en un entorno de confianza.
- Al salir de la pantalla, la app **desconecta** el periférico y descarta credenciales de
  memoria.
- Permisos Android: `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` (API 31+) y
  `ACCESS_FINE_LOCATION` (API ≤ 30) para poder escanear.

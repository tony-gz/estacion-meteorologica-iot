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
| CMD | `beb5483e-36e1-4688-b7f5-ea07361b26ab` | **write** | comando; se usa `APPLY` |

## Flujo de provisioning (secuencia)

1. **Escanear** y filtrar por nombre que empiece con `Meteo-`.
2. **Conectar** (GATT) al periférico elegido; suscribirse a **notify** de STATUS.
3. **Escribir SSID** → el ESP32 responde STATUS `SSID_OK`.
4. **Escribir PASS** → el ESP32 responde STATUS `PASS_OK`.
5. **Escribir CMD = `APPLY`** → el ESP32 intenta conectarse a la WiFi.
   - Si no había SSID: STATUS `ERR_NO_SSID`.
6. **Observar STATUS** hasta un resultado terminal o timeout.

## Valores de STATUS (emitidos por el firmware)

| Valor | Significado | UI sugerida |
|-------|-------------|-------------|
| `SSID_OK` | SSID recibido | progreso |
| `PASS_OK` | Contraseña recibida | progreso |
| `CONNECTING:{ssid}` | Intentando conectar a esa red | "Conectando a {ssid}…" |
| `WIFI_OK:{ip}` | **Éxito**; obtuvo IP | "Conectada ✅ ({ip})" — terminal |
| `NO_AP` / `NO_SSID_AVAIL` | Red no encontrada | error, reintentar SSID |
| `BAD_PASSWORD` | Contraseña incorrecta | error, reintentar PASS |
| `WIFI_FAIL` | Falló la conexión (genérico) | error, reintentar |
| `ERR_NO_SSID` | `APPLY` sin SSID previo | error de flujo |
| `NO_CREDS` | Arrancó sin credenciales guardadas | informativo |
| `REBOOTING` | El dispositivo se reinicia | informativo |

- **Terminal de éxito**: `WIFI_OK:{ip}`.
- **Terminales de error**: `NO_AP`, `BAD_PASSWORD`, `WIFI_FAIL`, `ERR_NO_SSID`.
- **Timeout** de la app si no llega estado terminal en un tiempo razonable (p. ej. 30 s).

## Reglas

- La contraseña WiFi **no** se registra en logs ni se envía a la API (FR-019).
- Al salir de la pantalla, la app **desconecta** el periférico y descarta credenciales de
  memoria.
- Permisos Android: `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` (API 31+) y
  `ACCESS_FINE_LOCATION` (API ≤ 30) para poder escanear.

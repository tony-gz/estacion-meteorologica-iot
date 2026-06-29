# Contratos REST — WeatherStation Backend v2 (deliverable 8)

Contrato fuente: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1). Este README es la
versión legible. En ejecución, springdoc publica Swagger UI en `/swagger-ui.html`
y el JSON en `/v3/api-docs`.

## Convenciones generales

- **Base URL local**: `http://localhost:8080` · **Prod**: Render.
- **Autenticación de usuarios**: `Authorization: Bearer <accessToken>` salvo en
  rutas públicas.
- **Autenticación de estaciones**: `POST /api/device/auth` con `{uuid, token}` →
  JWT de dispositivo (`type=DEVICE`), usado en `POST /api/device/data`.
- **Rutas públicas** (sin token): `/auth/**`, `/api/device/register`,
  `/api/device/auth`, documentación.
- **Formato de fechas**: ISO-8601 con zona (`2026-06-28T10:15:00-06:00`).
- **Errores**: cuerpo uniforme `ApiError` (`timestamp, status, error, code,
  message, path, fieldErrors`).
- **Roles**: `ADMIN`, `RESPONSABLE`, `INVESTIGADOR`, `USUARIO` (claim `rol`).
- **Identificador de estación** en rutas (`{id}`): el **uuid público** de la
  estación.
- **Códigos comunes**: `400` validación, `401` no autenticado, `403` no
  autorizado, `404` no encontrado, `409` conflicto, `422` lectura fuera de rango,
  `429` rate limit, `503` servicio externo caído.

## Matriz de autorización por endpoint

| Método | Ruta | Público | USUARIO | RESPONSABLE | INVESTIGADOR | ADMIN |
|--------|------|:------:|:------:|:-----------:|:-----------:|:----:|
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` | ✅ | — | — | — | — |
| POST | `/api/device/register` | ✅¹ | — | — | — | — |
| POST | `/api/device/auth` | ✅¹ | — | — | — | — |
| POST | `/api/device/data` · `/api/device/heartbeat` · GET `/api/device/config` | token de estación (JWT dispositivo) |||||
| GET | `/api/public/stations` · `/api/public/weather/latest` · `/api/public/statistics` | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET | `/escuelas` · `/escuelas/{id}` | ❌ | ✅ | ✅ | ✅ | ✅ |
| POST/PUT/DELETE | `/escuelas/**` | ❌ | ❌ | ❌ | ❌ | ✅ |
| GET | `/estaciones` · `/estaciones/{id}` | ❌ | ✅² | ✅² | ✅² | ✅ |
| POST | `/estaciones` (registrar) | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| PUT | `/estaciones/{id}` | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| DELETE | `/estaciones/{id}` | ❌ | ❌ | ❌ | ❌ | ✅ |
| POST | `/estaciones/{id}/aprobar`·`/rechazar`·`/deshabilitar`·`/reactivar`·`/mantenimiento`·`/regenerar-token` | ❌ | ❌ | ❌ | ❌ | ✅ |
| GET | `/estaciones/{id}/conexiones` | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| GET | `/estaciones/{id}/actual` | ❌ | ✅ | ✅ | ✅ | ✅ |
| GET | `/estaciones/{id}/historial`·`/ultimas24h`·`/estadisticas` | ❌ | ❌ | ✅ (su escuela) | ✅ | ✅ |
| GET | `/estadisticas` (avanzadas agrupadas por día/mes/escuela/municipio) | ❌ | ❌ | ✅ (su escuela) | ✅ | ✅ |
| GET | `/solicitudes` · `/solicitudes/{id}` | ❌ | ❌ | ✅ (su escuela) | ❌ | ✅ |
| POST | `/solicitudes/{id}/aprobar`·`/rechazar` | ❌ | ❌ | ❌ | ❌ | ✅ |
| GET/POST/PUT/DELETE | `/usuarios/**` | ❌ | ❌ | ❌ | ❌ | ✅ |
| POST | `/ia/*` (**requiere cuenta**) | ❌ | ✅ | ✅ | ✅ | ✅ |
| GET | `/alertas` · `/alertas/{id}` | ❌ | ✅ | ✅ | ✅ | ✅ |

> ¹ Públicos pero **rate-limited** y auditados; `/api/device/auth` exige token de
> estación válido y estación `APPROVED`.
> ² Visibilidad por rol: USUARIO/INVESTIGADOR ven solo `APPROVED` + habilitadas;
> RESPONSABLE ve además las de su escuela en cualquier estado; ADMIN ve todas.
>
> **Tier público** `/api/public/**`: solo lectura, sin cuenta, datos no sensibles
> (estaciones aprobadas, clima actual, stats agregadas). **La IA NO es pública**:
> `/ia/**` exige cuenta. **Latido/config de dispositivo** (`/api/device/heartbeat`,
> `/api/device/config`) usan el JWT de dispositivo. El heartbeat **no** lleva
> batería (solo firmware/hardware/RSSI).

---

## Dispositivo (ESP32)

### POST /api/device/register
Alta iniciada por el dispositivo. Crea una solicitud `PENDING`. No entrega token.
```json
// Request
{ "nombre": "Estación Prepa 1", "escuelaId": "…", "ubicacion": "Patio",
  "municipio": "Chilpancingo", "latitud": 17.55, "longitud": -99.50,
  "firmware": "3.0.0" }
// 202
{ "id": "…", "uuidPropuesto": "…", "estado": "PENDING", "escuelaNombre": "…",
  "createdAt": "…" }
```

### POST /api/device/auth
Handshake: token permanente → JWT de dispositivo de vida corta.
```json
// Request
{ "uuid": "7b1f2c34-…", "token": "stk_live_…", "firmware": "3.0.0" }
// 200
{ "deviceToken": "eyJ…", "tokenType": "Bearer", "expiresIn": 3600 }
```
Errores: `401` (uuid/token inválido o token revocado), `403` (estación no
`APPROVED`), `429`.

### POST /api/device/data
`Authorization: Bearer <deviceToken>`. El backend valida y persiste en PostgreSQL.
```json
// Request
{ "timestamp": "2026-06-28T10:15:00-06:00", "temperatura": 24.5, "humedad": 60,
  "presion": 1013.2, "vientoKmh": 12.3, "vientoDir": "NE", "vientoGrados": 45.0,
  "lluviaMm": 0.0 }
// 202
{ "estado": "ACEPTADA", "recibidoEn": "…", "historialActualizado": true }
```
Errores: `400` (formato), `401` (JWT inválido/expirado), `403` (estación
deshabilitada), `422` (fuera de rango: presión ≤ 0, humedad fuera de 0–100…),
`429`, `503` (base de datos no disponible).

---

## Autenticación de usuarios

`POST /auth/register` → crea `USUARIO`. `POST /auth/login`, `POST /auth/refresh`
(rotación). Respuesta `AuthResponse` (igual que v1). El `UsuarioResponse` ahora
incluye `escuelaId`/`escuelaNombre` (no nulos para `RESPONSABLE`).

## Escuelas (ADMIN para escribir)

- **GET `/escuelas`**, **GET `/escuelas/{id}`** (autenticado).
- **POST `/escuelas`** (`EscuelaRequest`) → `201 EscuelaResponse` | `409` (clave
  duplicada).
- **PUT `/escuelas/{id}`**, **DELETE `/escuelas/{id}`** (ADMIN; `409` si tiene
  estaciones).

## Estaciones — gobernanza

- **GET `/estaciones?escuelaId=&estado=`** → `EstacionResponse[]` (visibilidad por
  rol).
- **POST `/estaciones`** (ADMIN/RESPONSABLE) → `201` estación `PENDING`.
- **PUT `/estaciones/{id}`** → actualizar metadata.
- **POST `/estaciones/{id}/aprobar`** (ADMIN) → `200 StationTokenResponse` con el
  **token en claro mostrado una sola vez**.
- **POST `/estaciones/{id}/rechazar|deshabilitar`** (motivo opcional),
  **`/reactivar`** → `EstacionResponse`.
- **POST `/estaciones/{id}/regenerar-token`** (ADMIN) → `200 StationTokenResponse`
  (revoca el token anterior).
- **GET `/estaciones/{id}/conexiones`** (ADMIN/RESPONSABLE) → `ConexionResponse[]`.

Ejemplo `StationTokenResponse` (única vez que aparece el token):
```json
{ "estacionId": "…", "uuid": "7b1f2c34-…", "token": "stk_live_9f2c…",
  "generadoEn": "…", "aviso": "Guarde este token: no se volverá a mostrar." }
```

## Estaciones — datos meteorológicos (lectura)

- **GET `/estaciones/{id}/actual`** → `LecturaResponse` | `404`.
- **GET `/estaciones/{id}/historial?desde=&hasta=`** → `LecturaResponse[]`
  (cronológico; por defecto últimas 24 h).
- **GET `/estaciones/{id}/ultimas24h`** → `LecturaResponse[]`.
- **GET `/estaciones/{id}/estadisticas?desde=&hasta=`** → `EstadisticasResponse`.

```json
{ "timestamp": "2026-06-28T10:15:00-06:00", "temperatura": 24.5, "humedad": 60,
  "presion": 1013.2, "vientoKmh": 12.3, "vientoDir": "NE", "vientoGrados": 45.0,
  "lluviaMm": 0.0 }
```

## Solicitudes de registro

- **GET `/solicitudes?estado=&escuelaId=`** (ADMIN; RESPONSABLE su escuela).
- **GET `/solicitudes/{id}`**.
- **POST `/solicitudes/{id}/aprobar`** (ADMIN) → crea estación `APPROVED` +
  `StationTokenResponse`.
- **POST `/solicitudes/{id}/rechazar`** (motivo opcional).

## Usuarios (ADMIN)

Igual que v1 (`GET/POST/PUT/DELETE /usuarios/**`); `UsuarioRequest`/
`UsuarioUpdateRequest` aceptan `rol` (incl. `RESPONSABLE`) y `escuelaId`. Ninguna
respuesta incluye `passwordHash`.

## IA (rate limited)

`POST /ia/preguntar|resumen|prediccion` → `IaResponse`. `429`/`503`. Sin datos
suficientes, `advertencias` lo declara y la `respuesta` no inventa. `estacionId`
es el uuid de la estación.

## Alertas

- **GET `/alertas?estacionId=&tipo=&estado=`** → `AlertaResponse[]`.
- **GET `/alertas/{id}`** → `AlertaResponse` | `404`.

## Ejemplo de `ApiError`
```json
{ "timestamp": "2026-06-28T10:20:00-06:00", "status": 403, "error": "Forbidden",
  "code": "ESTACION_NO_APROBADA",
  "message": "La estación no está aprobada para publicar",
  "path": "/api/device/data", "fieldErrors": {} }
```

# Contrato: API del backend consumida por la app móvil

La app **no define** endpoints nuevos; consume los de la spec `001`
(`specs/001-weatherstation-backend/contracts/openapi.yaml`). Este documento fija
**qué** subconjunto usa cada pantalla, para trazabilidad spec → tasks.

## Sin sesión (tier público, solo lectura)

| Endpoint | Uso en la app | Historia |
|----------|---------------|----------|
| `GET /api/public/stations` | Lista de estaciones aprobadas (vista pública) | US1 |
| `GET /api/public/weather/latest` | Clima actual por estación (vista pública) | US1 |
| `GET /api/public/statistics` | Estadísticas agregadas públicas (opcional) | US1 |

## Autenticación

| Endpoint | Uso | Historia |
|----------|-----|----------|
| `POST /auth/login` | Iniciar sesión → access+refresh+usuario | US2 |
| `POST /auth/refresh` | Renovación transparente (rotación) | US2 |
| `POST /auth/register` | (Opcional) alta de usuario desde la app | US2 |

## Con sesión (según rol)

| Endpoint | Uso | Historia |
|----------|-----|----------|
| `GET /estaciones` | Lista de estaciones (autenticado) | US2 |
| `GET /estaciones/{id}` | Detalle de estación | US2/US4 |
| `GET /estaciones/{id}/actual` | Lectura actual | US2 |
| `GET /estaciones/{id}/historial` | Serie temporal para la gráfica | US2 |
| `GET /estaciones/{id}/ultimas24h` | Atajo 24h para la gráfica | US2 |
| `GET /estaciones/{id}/estadisticas` | Estadísticas de estación | US2 |
| `GET /estaciones/{id}/conexiones` | Última conexión / historial (responsable) | US4 |
| `POST /ia/preguntar` | Pregunta en lenguaje natural al asistente | US2 |
| `POST /ia/resumen` | Resumen IA de una estación | US2 |
| `POST /ia/prediccion` | Predicción IA | US2 |
| `GET /alertas` | Alertas meteorológicas | US2 |
| `POST /solicitudes` *(o `POST /estaciones`)* | Solicitar alta de estación (responsable) | US4 |
| `GET /solicitudes/mis-solicitudes` | Estado de mis solicitudes | US4 |

> El alta de estación desde el front usa el flujo de solicitudes de la spec `001`
> (FR-014c). Confirmar en implementación el endpoint exacto según el openapi vigente.

## Reglas de consumo

- Todas las llamadas autenticadas envían `Authorization: Bearer {accessToken}`.
- En `401` recuperable → un intento de `POST /auth/refresh` y reintento; si falla →
  logout (misma política que el interceptor del Front).
- La app **no** llama a `/api/device/**` (eso es del ESP32) ni a endpoints de
  administración que su rol no permita.

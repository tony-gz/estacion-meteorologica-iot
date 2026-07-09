# Implementation Plan: App Móvil — Red de Estaciones (CLIMBOT)

**Branch**: `002-app-movil` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-app-movil/spec.md`

## Summary

App móvil Android que reemplaza la app Flutter obsoleta (`WeatherStation_MOVIL_Flutter`,
basada en Firebase). Consume **exclusivamente** el backend Spring Boot (spec `001`)
por API REST + JWT, reutilizando el contrato y el modelo de acceso ya probados en la
web (`WeatherStation_Front`). Añade la capacidad que la web no puede dar: **provisioning
WiFi del ESP32 por BLE**. Stack: **React Native + Expo (development build) + EAS Build**,
TypeScript. Tokens en **almacenamiento seguro** del dispositivo. Sin Firebase, sin push
(pospuesto).

> **Incremento 002.1 (2026-07-08)**: provisioning completo por BLE (paquete único
> uuid+token+ssid+pass+url), sección de credenciales de estación, y fix de gobernanza de
> roles (ascenso a RESPONSABLE). Su diseño, matriz de roles y tareas están en
> [`plan-provisioning-completo.md`](./plan-provisioning-completo.md); afecta a US5 y a
> FR-016/022–026. El firmware ESP32 pasa a estar **en alcance** para este incremento.

## Technical Context

**Language/Version**: TypeScript 5.x sobre React Native 0.7x (vía Expo SDK 52+)

**Primary Dependencies**:
- Expo (dev client) + EAS Build (compilación en la nube)
- `@react-navigation/native` + native-stack + bottom-tabs (navegación imperativa, `src/navigation/`)
- `@tanstack/react-query` + `axios` (misma capa de datos que el Front)
- `expo-secure-store` (tokens JWT cifrados en el dispositivo)
- `react-native-ble-plx` (BLE nativo) + `expo-dev-client` (config plugin; no corre en Expo Go)
- `expo-permissions`/`react-native-permissions` para Bluetooth y ubicación
- librería de gráficas RN (p. ej. `react-native-gifted-charts` / `victory-native`) — se elige en research
- `react-native-dotenv`/`expo-constants` para `API_URL`

**Storage**: Ninguno propio persistente salvo el **almacenamiento seguro** para tokens
(SecureStore). La fuente de verdad es el backend. Sin caché offline en esta versión.

**Testing**: `jest` + `@testing-library/react-native` (unit/componentes); pruebas de
integración manuales guiadas por `quickstart.md` (BLE requiere hardware ESP32 real).

**Target Platform**: Android (API 26+). Código multiplataforma; iOS no se valida aún.

**Project Type**: Mobile app (cliente de la API `001`).

**Performance Goals**: arranque a vista pública < 15 s con red normal (SC-001); UI
fluida a 60 fps en listas/gráficas; provisioning BLE completo < 2 min (SC-004).

**Constraints**: BLE obliga a **development build** (no Expo Go). Sin credenciales de
BD/Gemini en el cliente (Principio I). IA e históricos crudos **solo autenticado**.
El tier público es solo lectura. Provisioning BLE nunca toca el backend.

**Scale/Scope**: ~8–10 pantallas (pública, login, lista estaciones, detalle, gráficas,
IA, solicitud de alta, configurador BLE, estado de estación). Un solo backend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

La constitución rige el backend; como **cliente**, esta app debe cumplir los principios
que la afectan:

| Principio | Cómo lo cumple la app | Estado |
|-----------|-----------------------|--------|
| **I. Backend única puerta a los datos** | La app solo llama a la API REST; jamás toca PostgreSQL ni Gemini directamente. BLE es config local app↔ESP32, no un almacén de datos. | ✅ PASS |
| **II. Spec antes que código (SDD)** | spec `002` aprobada → este plan → tasks → implement. Nada de código antes de tasks. | ✅ PASS |
| **III. Arquitectura en capas / SOLID** | Capas en el cliente: `screens → hooks/queries → api (axios) → backend`. UI sin lógica de red; datos vía hooks. | ✅ PASS |
| **IV. DTOs en la frontera** | La app consume DTOs; sus tipos TS son espejo de los DTOs (reutiliza `types.ts` del Front). No inventa entidades crudas. | ✅ PASS |
| **V. Seguridad por defecto** | JWT access+refresh con rotación; tokens en SecureStore (cifrado), no en claro; IA/históricos solo autenticado; respeta 401/403 y roles. | ✅ PASS |
| **Tier público** | Solo lee `/api/public/**`; no expone IA, históricos crudos ni datos de usuarios sin sesión. | ✅ PASS |

Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/002-app-movil/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (decisiones: navegación, gráficas, BLE, EAS)
├── data-model.md        # Fase 1 (entidades vistas por la app + modelo BLE)
├── quickstart.md        # Fase 1 (cómo correr, dev build, probar BLE)
├── contracts/           # Fase 1 (endpoints consumidos + contrato BLE GATT)
│   ├── api-consumed.md
│   └── ble-gatt.md
├── checklists/
│   └── requirements.md  # ya creado en /speckit-specify
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea este comando)
```

### Source Code (repository root)

La app nueva vive en `WeatherStation_MOVIL/` (nombre liberado tras archivar la Flutter
en `WeatherStation_MOVIL_Flutter/`). Estructura Expo propuesta:

```text
WeatherStation_MOVIL/
├── app.json / app.config.ts     # config Expo + plugins (ble-plx, secure-store)
├── eas.json                     # perfiles de build (development, preview, production)
├── package.json
├── src/
│   ├── lib/                     # capa reutilizada/portada del Front web
│   │   ├── api.ts               # axios + interceptor refresh (SecureStore async)
│   │   ├── tokens.ts            # SecureStore (reemplaza localStorage)
│   │   ├── types.ts             # espejo de DTOs (portado de WeatherStation_Front)
│   │   ├── queries.ts           # hooks react-query (estaciones, historial, ...)
│   │   └── format.ts            # formateo (fechas con zona explícita)
│   ├── auth/
│   │   └── AuthContext.tsx      # sesión + rol (portado, con SecureStore)
│   ├── ble/
│   │   ├── bleManager.ts        # escaneo/conexión react-native-ble-plx
│   │   └── provisioning.ts      # UUIDs + envío SSID/PASS + lectura STATUS
│   ├── components/              # SensorCard, Grafica, EstadoBadge, AlertBanner...
│   ├── screens/                 # Publico, Login, Estaciones, Detalle, Graficas,
│   │                            # AsistenteIA, SolicitarEstacion, ConfigWifiBLE
│   └── navigation/              # stack/tabs + rutas protegidas por rol
└── __tests__/                   # jest + testing-library/react-native
```

**Structure Decision**: App Expo autocontenida en `WeatherStation_MOVIL/`. Se **porta**
la capa `lib/` (api, types, queries, format) y `auth/` desde `WeatherStation_Front`,
sustituyendo `localStorage` por `expo-secure-store` (API asíncrona) y el proxy `/api`
de Vite por `API_URL` desde `expo-constants`. BLE aislado en `src/ble/`. La Flutter
archivada (`WeatherStation_MOVIL_Flutter/`) queda solo como referencia de UI.

## Complexity Tracking

> Sin violaciones de la constitución que justificar. Sección vacía.

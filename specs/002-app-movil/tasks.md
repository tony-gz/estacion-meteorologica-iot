---
description: "Task list — App Móvil React Native (CLIMBOT)"
---

# Tasks: App Móvil — Red de Estaciones (CLIMBOT)

**Input**: Design documents from `specs/002-app-movil/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: La spec no exige TDD. Se incluyen pruebas **mínimas** (unit de la capa de
tokens/BLE parsing) y la validación manual guiada por `quickstart.md`. Marcadas como
opcionales donde corresponde.

**Organización**: por historia de usuario (US1→US4), en orden de prioridad, para entrega
incremental. Ruta base de la app: `WeatherStation_MOVIL/`.

## Format: `[ID] [P?] [Story] Descripción con ruta`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes)
- **[US#]**: historia a la que pertenece (solo en fases de historia)

## Path Conventions

- App Expo en `WeatherStation_MOVIL/` (nombre liberado; la Flutter vieja quedó en
  `WeatherStation_MOVIL_Flutter/`).
- Código en `WeatherStation_MOVIL/src/`; fuente reutilizable en `WeatherStation_Front/src/lib`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar el proyecto Expo y las dependencias base.

- [X] T001 Inicializar app Expo (TypeScript) en `WeatherStation_MOVIL/` con `expo-dev-client` (`npx create-expo-app`), fijando SDK 52+.
- [X] T002 Añadir dependencias base en `WeatherStation_MOVIL/package.json`: `@tanstack/react-query`, `axios`, `expo-secure-store`, `expo-constants`, `@react-navigation/native` + `@react-navigation/native-stack` + `@react-navigation/bottom-tabs` (+ `react-native-screens`, `react-native-safe-area-context`).
- [X] T003 [P] Añadir dependencias BLE y permisos: `react-native-ble-plx` (+ su config plugin) y utilidades de permisos en `WeatherStation_MOVIL/package.json`.
- [X] T004 [P] Añadir librería de gráficas RN (`react-native-gifted-charts` o `victory-native`) en `WeatherStation_MOVIL/package.json`.
- [X] T005 Configurar `WeatherStation_MOVIL/app.config.ts`: nombre/slug/paquete, plugin de `react-native-ble-plx`, permisos Android (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`) y `API_URL` vía `expo-constants`/env.
- [X] T006 [P] Crear `WeatherStation_MOVIL/eas.json` con perfiles `development` (dev client), `preview` y `production`.
- [X] T007 [P] Configurar linting/format (oxlint o eslint + prettier) y `tsconfig.json` en `WeatherStation_MOVIL/`.
- [X] T008 [P] Añadir script de verificación "sin Firebase" (SC-006) al `package.json` (grep de `firebase` que falle si aparece).

**Checkpoint**: `npx expo start --dev-client` levanta la app vacía en un development build.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: capa de datos/auth compartida por TODAS las historias. Bloqueante.

- [X] T009 Portar tipos DTO a `WeatherStation_MOVIL/src/lib/types.ts` desde `WeatherStation_Front/src/lib/types.ts` (Rol, AuthResponse, Usuario, Lectura, Estacion, PublicEstacion, Alerta, Solicitud, IaResponse).
- [X] T010 Implementar `WeatherStation_MOVIL/src/lib/tokens.ts` sobre **expo-secure-store** (get/set/clear async de access, refresh, usuario) — reemplazo del `localStorage` del Front.
- [X] T011 Portar/adaptar `WeatherStation_MOVIL/src/lib/api.ts`: instancia axios con `baseURL = API_URL` (expo-constants), interceptor de request **async** que lee el token de SecureStore, e interceptor de respuesta con refresh (rotación) y logout en 401 no recuperable (navegación RN, no `location.href`).
- [X] T012 [P] Portar `WeatherStation_MOVIL/src/lib/format.ts` (formateo de fechas con **zona explícita** del backend; sin recálculo de UTC — FR-011).
- [X] T013 Implementar `WeatherStation_MOVIL/src/auth/AuthContext.tsx` (estado de sesión, rol, login/logout, hidratación desde SecureStore) adaptado de `WeatherStation_Front/src/auth/AuthContext.tsx`.
- [X] T014 Configurar `WeatherStation_MOVIL/src/lib/queryClient.ts` (QueryClientProvider) y envolver la app en `App.tsx` (NavigationContainer + QueryClientProvider + AuthProvider).
- [X] T015 Definir la navegación base con **@react-navigation** en `WeatherStation_MOVIL/src/navigation/`: stack **público** y stack **protegido** (native-stack + bottom-tabs), con gate por sesión/rol (FR-012).
- [X] T016 [P] Crear componentes UI compartidos en `WeatherStation_MOVIL/src/components/`: `SensorCard`, `EstadoBadge`, `AlertBanner`, `ErrorRetry`, `Loading`.

**Checkpoint**: la app arranca, resuelve sesión desde SecureStore y enruta a público o protegido.

---

## Phase 3: User Story 1 — Vista pública sin cuenta (P1) 🎯 MVP

**Goal**: cualquiera ve estaciones aprobadas y clima actual sin iniciar sesión.

**Independent Test**: abrir la app sin sesión → lista de estaciones + lectura actual; IA/históricos piden login.

- [X] T017 [P] [US1] Hook `usePublicEstaciones`/`usePublicWeather` en `WeatherStation_MOVIL/src/lib/queries.ts` consumiendo `GET /api/public/stations` y `GET /api/public/weather/latest`.
- [X] T018 [US1] Pantalla pública `WeatherStation_MOVIL/src/screens/PublicoScreen.tsx`: lista de estaciones aprobadas con `SensorCard` (temp, humedad, presión, viento, lluvia).
- [X] T019 [US1] Estado de carga/error con reintento en la vista pública (FR-020) y mensaje claro sin red.
- [X] T020 [US1] Gating: los accesos a IA/históricos desde la vista pública redirigen a login (FR-006).
- [X] T021 [P] [US1] (Opcional) `GET /api/public/statistics` para un resumen agregado en la vista pública.

**Checkpoint**: US1 entregable y demostrable de forma independiente (MVP).

---

## Phase 4: User Story 2 — Acceso autenticado: datos, históricos e IA (P1)

**Goal**: login JWT con refresh; datos actuales, históricos en gráfica y asistente de IA.

**Independent Test**: login → ver histórico en gráfica → preguntar a la IA → refresh transparente al expirar el access → logout limpia SecureStore.

- [X] T022 [US2] Pantalla `WeatherStation_MOVIL/src/screens/LoginScreen.tsx`: `POST /auth/login`, guarda tokens+usuario en SecureStore vía AuthContext.
- [X] T023 [US2] Verificar/ajustar el refresh transparente (`POST /auth/refresh` con rotación) en `api.ts` para RN y probar el caso de refresh inválido → logout (FR-003, FR-021).
- [X] T024 [P] [US2] Hooks `useEstaciones`, `useEstacion`, `useHistorial`, `useEstadisticas` en `queries.ts` (`GET /estaciones`, `/estaciones/{id}`, `/estaciones/{id}/historial`, `/estaciones/{id}/estadisticas`).
- [X] T025 [US2] Pantalla `WeatherStation_MOVIL/src/screens/EstacionesScreen.tsx` (lista autenticada) y `EstacionDetalleScreen.tsx` (lectura actual + estado).
- [X] T026 [US2] Componente `WeatherStation_MOVIL/src/components/Grafica.tsx` con la librería RN (serie temporal, rango seleccionable) y pantalla `GraficasScreen.tsx` (FR-008).
- [X] T027 [P] [US2] Hooks de IA en `queries.ts`: `POST /ia/preguntar`, `/ia/resumen`, `/ia/prediccion`.
- [X] T028 [US2] Pantalla `WeatherStation_MOVIL/src/screens/AsistenteIAScreen.tsx` (solo autenticado) con input de pregunta y render de respuesta (FR-009).
- [X] T029 [P] [US2] Hook `useAlertas` (`GET /alertas`) y visualización con `AlertBanner` (FR-010).
- [X] T030 [US2] Botón/acción de logout que limpia SecureStore y vuelve a público (FR-005).

**Checkpoint**: US2 entregable; con US1+US2 la app cubre todo el consumo de datos.

---

## Phase 5: User Story 3 — Config WiFi de la estación por BLE (P2) ⭐ diferenciador

**Goal**: un RESPONSABLE/ADMIN configura la WiFi del ESP32 por Bluetooth desde la app.

**Independent Test**: con un ESP32 encendido anunciando `Meteo-{uuid}`, escanear → seleccionar → enviar SSID+PASS → ver `WIFI_OK:{ip}`.

- [X] T031 [US3] Gestión de permisos BLE en `WeatherStation_MOVIL/src/ble/permissions.ts`: solicitar `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` (API 31+) y `ACCESS_FINE_LOCATION` (≤30); guiar a ajustes si se deniegan (FR-018).
- [X] T032 [US3] `WeatherStation_MOVIL/src/ble/bleManager.ts`: inicializar `react-native-ble-plx`, escanear y **filtrar por prefijo `Meteo-`**, detectar BLE apagado/no soportado.
- [X] T033 [US3] `WeatherStation_MOVIL/src/ble/provisioning.ts`: conectar GATT al servicio `4fafc201-…`, escribir SSID (`…b26a8`) y PASS (`…b26a9`), escribir CMD `APPLY` (`…b26ab`), suscribir notify de STATUS (`…b26aa`) — según `contracts/ble-gatt.md`.
- [X] T034 [US3] Parser de estados STATUS en `provisioning.ts` (`SSID_OK`, `PASS_OK`, `CONNECTING:{ssid}`, `WIFI_OK:{ip}`, `NO_AP`, `BAD_PASSWORD`, `WIFI_FAIL`, `ERR_NO_SSID`) con máquina de estados y **timeout** (~30 s).
- [X] T035 [US3] Pantalla `WeatherStation_MOVIL/src/screens/ConfigWifiBLEScreen.tsx`: lista de dispositivos descubiertos, formulario SSID/PASS, progreso y resultado terminal (FR-015–FR-017).
- [X] T036 [US3] Garantizar que SSID/PASS **no** se loguean ni se envían a la API (FR-019) y que al salir se desconecta el periférico y se descartan de memoria.
- [X] T037 [P] [US3] (Opcional) Test unit del parser de STATUS en `WeatherStation_MOVIL/__tests__/ble-status.test.ts`.

**Checkpoint**: US3 entregable (requiere hardware ESP32 real para el test end-to-end).

---

## Phase 6: User Story 4 — Gestión de estaciones del responsable (P3)

**Goal**: un RESPONSABLE solicita alta de estación y consulta estado/última conexión.

**Independent Test**: como RESPONSABLE, enviar solicitud de alta (queda pendiente) y ver estado + última conexión de una estación propia.

- [X] T038 [P] [US4] Hooks en `queries.ts`: solicitar alta (`POST /solicitudes` o `POST /estaciones` según openapi), `GET /solicitudes/mis-solicitudes`, `GET /estaciones/{id}/conexiones`.
- [X] T039 [US4] Pantalla `WeatherStation_MOVIL/src/screens/SolicitarEstacionScreen.tsx` (formulario de solicitud, solo rol RESPONSABLE/ADMIN — FR-013).
- [X] T040 [US4] En `EstacionDetalleScreen.tsx`, sección de estado (APPROVED/MAINTENANCE/DISABLED) y última conexión para estaciones de la escuela del responsable (FR-014).

**Checkpoint**: US4 entregable; ciclo de vida básico cubierto desde el móvil.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T041 [P] Tema/estilos consistentes (claro/oscuro) en `WeatherStation_MOVIL/src/theme/` reutilizando la identidad del Front.
- [X] T042 [P] Manejo global de errores de API legible (mapear 401/403/500) y `mensajeError` compartido.
- [X] T043 [P] Test unit de `tokens.ts` (SecureStore mock) en `WeatherStation_MOVIL/__tests__/tokens.test.ts`.
- [ ] T044 Ejecutar `quickstart.md` V1–V4 y registrar resultados. **Automatizable ya hecho**: V4 "sin Firebase" ✅, typecheck ✅, bundle ✅, tests 9/9 ✅. **Pendiente (requiere entorno del usuario)**: V1/V2 contra el backend en marcha y V3 con ESP32 real.
- [ ] T045 [P] Generar build `preview` con EAS y probar en dispositivo físico Android. **Pendiente**: requiere cuenta EAS / compilación local por cable del usuario (`npm run android`).
- [X] T046 Archivar/limpiar `WeatherStation_MOVIL_Flutter/` (README que indique que quedó como referencia) y actualizar `PROGRESO.md`.

---

## Phase 8: Incremento 002.1 — Provisioning completo por BLE + credenciales + fix de roles

**Goal**: enviar en **un paquete BLE** uuid+token+ssid+pass+url; mostrar credenciales
(UUID siempre, token al generar/regenerar); dejar los roles coherentes. Ver
[`plan-provisioning-completo.md`](./plan-provisioning-completo.md) y US5.

**Independent Test**: con un ESP32 real, enviar el paquete completo y ver `AUTH_OK` (WiFi +
autenticación contra el backend); ver el UUID en la app; un ADMIN regenera el token y lo ve
una sola vez.

### 8a. Documentación / contratos (formalización SDD) — ✅ hecho

- [X] T047 Actualizar `spec.md` (US5, FR-016 mod., FR-022–FR-025, actores, assumptions/scope).
- [X] T048 Actualizar `contracts/ble-gatt.md` (característica CONFIG, MTU 512, paquete JSON, STATUS `CONFIG_OK`/`BAD_CONFIG`/`AUTH_OK`/`AUTH_FAIL`).
- [X] T049 Actualizar `data-model.md` (paquete BLE completo + `StationToken` local) y `plan-provisioning-completo.md`.

### 8b. Firmware ESP32 (`WeatherStation_ESP32/ESTACION1_ESP32_v3.txt`)

- [X] T050 [FW] Arreglar el BLE inerte: **llamar `iniciarBLE()`** en `setup()` antes de esperar configuración (hoy nunca se invoca).
- [X] T051 [FW] Negociar **MTU 512** y añadir la característica **CONFIG** (`…b26ac`, write) con callback que parsea el **JSON** (ArduinoJson), valida campos mínimos y emite `CONFIG_OK`/`BAD_CONFIG`.
- [X] T052 [FW] Convertir `EST_UUID`/`EST_TOKEN`/`BACKEND_URL` de `#define` a **variables `String`** (cargadas de NVS, con `#define` como *fallback*) y sustituir sus usos en `obtenerDeviceToken()`, `enviarLectura()`, `enviarHeartbeat()` y logs.
- [X] T053 [FW] Extender NVS (namespace `wifi`): `guardar/leer` de `uuid`, `token`, `url` además de ssid/pass; persistir tras provisioning exitoso.
- [X] T054 [FW] Tras `WIFI_OK`, hacer el handshake `/api/device/auth` con las nuevas credenciales y emitir **`AUTH_OK`** o **`AUTH_FAIL:{code}`** (confirmación end-to-end).

### 8c. App móvil (`WeatherStation_MOVIL/`)

- [X] T055 [US5] `src/ble/provisioning.ts`: `provisionCompleto({uuid,token,ssid,pass,url})` — `requestMTU(512)`, escribir el JSON en CONFIG, observar STATUS; mantener el flujo legado como *fallback* si el MTU no sube (FR-016). **No loguear token/pass** (FR-019); si el MTU no alcanza para el paquete, caer al flujo legado.
- [X] T056 [P] [US5] `src/ble/status.ts`: mapear `CONFIG_OK`/`BAD_CONFIG`/`AUTH_OK`/`AUTH_FAIL:{code}` (códigos `401`/`NET`/`TIMEOUT`); ajustar terminal de éxito a `AUTH_OK` y timeout ~45 s (FR-017).
- [X] T057 [US5] Navegación: `ConfigWifiBLE` recibe `{uuid, nombre, token?}`; en `ConfigWifiBLEScreen.tsx` añadir campos **token** (pegable, FR-025) y **URL** (prefill `https://weatherstation-backend.onrender.com`, editable, **validar https/formato** — U2) + prefill de uuid. Mostrar aviso de "provisiona en un entorno de confianza" (FR-026).
- [X] T058 [P] [US5] `src/lib/queries.ts` + `types.ts`: usar el tipo `StationToken`; `useRegenerarToken` (`POST /estaciones/{id}/regenerar-token`) y `useAprobarSolicitud` (`POST /solicitudes/{id}/aprobar`) — ambos ADMIN.
- [X] T059 [US5] Sección **Credenciales** como **bloque dentro de `EstacionDetalleScreen`** (decidido; evita navegación extra): UUID + copiar (FR-022); token en claro solo tras generar/regenerar con aviso (FR-023); botón **Regenerar** (ADMIN, con confirmación de invalidación, FR-024); botón **Provisionar por BLE** que abre el configurador con prefill de `{uuid, token?}`.
- [X] T060 [US5] Gating por rol: sección y provisioning para `RESPONSABLE`/`ADMIN`; **Regenerar**/**Aprobar** solo `ADMIN` (FR-012).
- [X] T061 [P] [US5] Tests: parser de STATUS nuevos (incl. `AUTH_FAIL:{code}`) y del *fallback* legado cuando el MTU no sube en `__tests__/ble-status.test.ts`; **test que verifique que `token`/`pass` no se loguean ni se incluyen en ninguna llamada axios** (FR-019); `tsc --noEmit` + `eslint` limpios.

### 8d. Backend (fix de gobernanza — spec `001`)

- [ ] T062 [BE] Implementar **T-GOV1** (ascenso a RESPONSABLE + escuela en `SolicitudService.aprobar`) y **T-GOV2** (backfill). Ver `specs/001-weatherstation-backend/tasks.md`.

### 8e. Validación

- [ ] T063 Rebuild release del APK con la app 002.1 y **provisioning E2E** con ESP32 real hasta `AUTH_OK` (SC-004); registrar en `quickstart.md`.

**Checkpoint**: una estación nueva se pone en marcha por completo desde la app (BLE) sin
reflashear, con confirmación real de que autentica contra el backend.

---

## Dependencies & Execution Order

- **Setup (T001–T008)** → antes de todo.
- **Foundational (T009–T016)** → bloquea todas las historias (capa api/auth/nav).
- **US1 (T017–T021)** → primer incremento entregable (**MVP**). Solo depende de Foundational.
- **US2 (T022–T030)** → depende de Foundational; independiente de US1 salvo navegación compartida.
- **US3 (T031–T037)** → depende de Foundational + auth (rol). Independiente de US1/US2 en código (módulo `src/ble/`).
- **US4 (T038–T040)** → depende de Foundational + auth. Reusa `EstacionDetalleScreen` de US2.
- **Polish (T041–T046)** → al final.
- **Incremento 002.1 (Phase 8)** → depende de US3 (capa BLE) + US2 (auth/rol) + US4
  (detalle/queries). Dentro de la fase: **Firmware (T050–T054)** y **App (T055–T061)** son
  paralelos entre sí y sincronizan en la validación E2E (T063). **Backend (T062)** es
  independiente (spec 001) pero necesario para que el gating de RESPONSABLE tenga sentido.
  La doc (T047–T049) ya está hecha.

### Grafo de historias

```
Setup → Foundational → ├─ US1 (MVP)
                       ├─ US2 ───────────────┐
                       ├─ US3 (BLE) ─────────┤
                       └─ US4 ───────────────┤
                                             └─ 002.1: US5 (provisioning completo +
                                                credenciales) + fix roles → Polish
                       Firmware ESP32 (T050–T054) ∥ App (T055–T061) → E2E (T063)
```

## Parallel Execution Examples

- **Setup**: T003, T004, T006, T007, T008 en paralelo (archivos de config distintos).
- **Foundational**: T012 y T016 en paralelo con T009–T011 (módulos separados).
- **US2**: T024, T027, T029 (hooks en `queries.ts` — coordinar si tocan el mismo archivo; si no, secuenciar).
- **US3**: T037 (test) en paralelo con la UI una vez que el parser existe.

## Implementation Strategy

1. **MVP** = Setup + Foundational + **US1** (vista pública). Desplegable y demostrable solo.
2. Incremento 2 = **US2** (login + datos + IA) → app completa de consumo.
3. Incremento 3 = **US3** (BLE) → diferenciador de campo; requiere ESP32 real para validar.
4. Incremento 4 = **US4** (gestión responsable) + **Polish**.

Cada incremento pasa su *Independent Test* y los escenarios correspondientes de
`quickstart.md` antes de avanzar.

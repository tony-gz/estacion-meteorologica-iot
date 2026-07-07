# Research — App Móvil (Fase 0)

Decisiones técnicas que resuelven los "NEEDS CLARIFICATION" del Technical Context.

## D1 — Framework y build: Expo (dev client) + EAS

- **Decisión**: React Native con **Expo SDK 52+** usando **development build**
  (`expo-dev-client`) y compilación en la nube con **EAS Build**.
- **Rationale**: Reutiliza el ecosistema JS/TS del Front; EAS evita depender de una
  instalación local de Android Studio (opcional, solo para emulador). El *development
  build* es obligatorio porque BLE usa un módulo nativo que **no** corre en Expo Go.
- **Alternativas rechazadas**:
  - *Expo Go puro*: no soporta `react-native-ble-plx` (módulo nativo). ❌
  - *React Native CLI (bare)*: obliga a Android Studio + Gradle manual; más fricción y
    sin ventaja aquí. ❌
  - *PWA del Front*: sin BLE. ❌ (ya descartado por el usuario).

## D2 — BLE: react-native-ble-plx

- **Decisión**: `react-native-ble-plx` con su **config plugin** de Expo.
- **Rationale**: Es la librería BLE de RN más madura, con plugin oficial para Expo
  (prebuild). Cubre escaneo por nombre, conexión GATT, write y notify — todo lo que el
  firmware ESP32 expone.
- **Contrato GATT** (del firmware `WeatherStation_ESP32`, ver `contracts/ble-gatt.md`):
  - Nombre anunciado: `Meteo-{estacionId}`
  - Servicio: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
  - Características: SSID `...b26a8` (write), PASS `...b26a9` (write),
    STATUS `...b26aa` (read/notify), CMD `...b26ab` (write)
- **Permisos**: Android 12+ requiere `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`; Android ≤11
  requiere `ACCESS_FINE_LOCATION` para escanear. Se declaran en `app.config.ts` y se
  solicitan en runtime antes de escanear.
- **Alternativas rechazadas**: `expo-bluetooth` (inexistente/experimental). ❌

## D3 — Almacenamiento seguro de tokens: expo-secure-store

- **Decisión**: `expo-secure-store` (Keystore en Android) en vez de `localStorage`.
- **Rationale**: Cumple Principio V (tokens nunca en claro). Es la contraparte segura y
  asíncrona del `tokenStore` del Front.
- **Impacto**: `tokens.ts` y el interceptor de refresh en `api.ts` pasan a ser
  **asíncronos**; el interceptor de request de axios lee el token con `await`.
- **Alternativas**: `AsyncStorage` (no cifrado) ❌; `react-native-keychain` (válida pero
  añade dependencia nativa extra frente a la de Expo). ❌

## D4 — Reutilización de la capa de datos del Front

- **Decisión**: **Portar** `lib/{api,types,queries,format}.ts` y `auth/AuthContext.tsx`
  desde `WeatherStation_Front`, adaptando: (a) SecureStore async, (b) `API_URL` vía
  `expo-constants` en vez del proxy `/api` de Vite, (c) navegación (`location.href` →
  navegación RN).
- **Rationale**: Los tipos ya son espejo de los DTOs del backend y las queries ya están
  probadas contra la API real; minimiza divergencia y bugs.
- **Alternativas**: reescribir desde cero ❌ (duplica esfuerzo y riesgo de desalineación).

## D5 — Navegación

- **Decisión**: **`@react-navigation`** (`@react-navigation/native` + native-stack +
  bottom-tabs), con navegadores definidos en `src/navigation/` y pantallas en
  `src/screens/`. Un stack **público** y un stack **protegido** por sesión/rol.
- **Rationale**: Mantiene todo el código bajo `src/` (igual que la capa `lib/` portada
  del Front), es explícito y no obliga a la convención de enrutado por archivos en `app/`.
  Menos retrabajo al portar y una sola convención en el proyecto.
- **Alternativa rechazada**: `expo-router` (enrutado por archivos en `app/`). Válido y
  moderno, pero fragmenta la estructura `src/` y mezcla convenciones con la parte portada.
  Reversible si el equipo lo prefiere más adelante.

## D6 — Gráficas

- **Decisión**: `react-native-gifted-charts` (o `victory-native`) para la serie temporal
  del histórico.
- **Rationale**: Recharts (del Front) es solo web; se necesita una librería RN nativa.
  Se elige por rendimiento en listas/scroll y soporte de líneas/áreas.
- **Alternativas**: `react-native-svg-charts` (menos mantenida). ❌

## D7 — Notificaciones push

- **Decisión**: **Fuera de alcance** en esta versión (confirmado con el usuario).
- **Rationale**: Requeriría trabajo backend nuevo (registro de token de dispositivo +
  envío FCM), que hoy la spec `001` declara fuera de alcance. Se abordará como feature
  aparte que modifique la `001`.

## Configuración de entorno

- **Node.js** LTS + `npm`/`pnpm`.
- **Expo CLI** (`npx expo`) + cuenta **EAS** (gratuita) para builds en la nube.
- **Android Studio**: opcional (emulador/SDK). Alternativa: dispositivo Android físico
  por USB con depuración activada + el *development build* instalado.
- Variable `API_URL` apuntando al backend (Render en prod, IP LAN del backend en dev —
  el ESP32 y el móvil deben poder alcanzarlo).

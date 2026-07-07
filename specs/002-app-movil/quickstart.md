# Quickstart — App Móvil (Expo + BLE)

Guía para levantar y **validar** la app. No incluye código de implementación (eso vive
en `tasks.md` y la fase de implementación).

## Prerrequisitos

- **Node.js** LTS + `npm` (o `pnpm`).
- **Expo CLI**: se usa vía `npx expo` (no requiere instalación global).
- Cuenta **Expo/EAS** (gratuita) para builds en la nube: `npx eas login`.
- Un **dispositivo Android físico** con depuración USB **o** un emulador (requiere
  Android Studio SDK). Recuerda: **Expo Go no sirve** para BLE; hace falta un
  *development build*.
- Backend `001` accesible: define `API_URL` (Render en prod, o `http://{IP_LAN}:8080`
  en dev; el móvil y el ESP32 deben poder alcanzarlo).
- Para validar BLE: una **estación ESP32 encendida** con el firmware v3, en modo de
  configuración (BLE anunciando `Meteo-{uuid}` durante los primeros 60 s tras el arranque).

## Setup

```bash
cd WeatherStation_MOVIL
npm install
# configurar API_URL (p. ej. en app.config.ts / .env / expo-constants)
```

## Generar el development build (una vez, o al cambiar dependencias nativas)

```bash
npx eas build --profile development --platform android
# instala el APK/AAB resultante en el dispositivo (link o descarga de EAS)
```

## Correr en desarrollo

```bash
npx expo start --dev-client
# abre la app (development build ya instalada) y escanea el QR / conecta por LAN
```

## Escenarios de validación (mapear a Success Criteria)

### V1 — Vista pública sin cuenta (SC-001, SC-005)
1. Abrir la app **sin iniciar sesión**.
2. **Esperado**: se listan estaciones aprobadas con su clima actual en < 15 s.
3. Intentar abrir IA o históricos crudos → **Esperado**: la app pide iniciar sesión.

### V2 — Login, histórico e IA (SC-002, SC-003)
1. Iniciar sesión con credenciales válidas.
2. Abrir una estación → ver histórico en gráfica (≤ 3 acciones desde el inicio).
3. Preguntar al asistente de IA → recibir respuesta.
4. Forzar expiración del access token (esperar o acortar `expiresIn` en pruebas) y
   navegar → **Esperado**: la sesión se renueva sola sin pedir contraseña.
5. Cerrar sesión → **Esperado**: SecureStore queda limpio (no hay tokens residuales).

### V3 — Provisioning WiFi por BLE (SC-004)  *(requiere ESP32 real)*
1. Encender la estación; en < 60 s abrir el configurador WiFi en la app.
2. **Esperado**: aparece el dispositivo `Meteo-{uuid}` en el escaneo.
3. Seleccionarlo, escribir SSID + contraseña, aplicar.
4. **Esperado**: la app muestra el progreso (`SSID_OK` → `PASS_OK` → `CONNECTING` →
   `WIFI_OK:{ip}`) y confirma conexión en < 2 min.
5. Probar contraseña incorrecta → **Esperado**: la app muestra `BAD_PASSWORD` y permite
   reintentar. Ver estados en [`contracts/ble-gatt.md`](./contracts/ble-gatt.md).
6. Denegar permisos de Bluetooth → **Esperado**: la app explica y ofrece abrir ajustes.

### V4 — Sin Firebase (SC-006)
```bash
# no debe haber ninguna dependencia de firebase en el proyecto
grep -ri "firebase" package.json app.config.* src/ || echo "OK: sin Firebase"
```

## Referencias

- API consumida: [`contracts/api-consumed.md`](./contracts/api-consumed.md)
- Contrato BLE: [`contracts/ble-gatt.md`](./contracts/ble-gatt.md)
- Modelo de datos: [`data-model.md`](./data-model.md)
- Decisiones técnicas: [`research.md`](./research.md)

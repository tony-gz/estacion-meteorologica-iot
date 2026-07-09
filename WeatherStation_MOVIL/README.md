# CLIMBOT — App Móvil (React Native + Expo)

App móvil de la Red de Estaciones Meteorológicas. Reemplaza la app Flutter
(archivada en `../WeatherStation_MOVIL_Flutter/`). Consume **solo** el backend Spring
(spec `001`) vía API REST + JWT y añade provisioning WiFi del ESP32 por BLE.

Especificación: [`specs/002-app-movil`](../specs/002-app-movil/).

## Requisitos

- Node.js LTS + npm
- Cuenta Expo/EAS (gratuita) para builds en la nube: `npx eas login`
- Un dispositivo Android físico (USB) o emulador (Android Studio). **Expo Go no sirve**
  para BLE → se usa un *development build*.

## Configuración

`API_URL` apunta al origen del backend. En el emulador Android, `10.0.2.2` mapea al
`localhost` del host. En dispositivo físico, usa la IP LAN del backend:

```bash
export API_URL="http://192.168.1.100:8080"   # ejemplo dev
# o EXPO_PUBLIC_API_URL
```

## Correr (desarrollo)

```bash
npm install
# Development build (una vez / al cambiar dependencias nativas):
npx eas build --profile development --platform android
# Servidor de desarrollo:
npm start           # expo start --dev-client
```

Sin dependencias nativas (solo para probar UI rápido, sin BLE) puedes usar Expo Go:

```bash
npm run start:go
```

## Scripts

- `npm run typecheck` — `tsc --noEmit`
- `npm run check:no-firebase` — verifica que no haya referencias a Firebase (SC-006)

## Estado

- ✅ **MVP**: Setup + Foundational + US1 (vista pública sin cuenta).
- ⏳ Pendiente: US2 (login+datos+IA), US3 (BLE), US4 (gestión responsable). Ver
  [`tasks.md`](../specs/002-app-movil/tasks.md).

## Arquitectura (cliente en capas)

```
screens → hooks (queries.ts) → api.ts (axios) → backend Spring
   AuthContext (SecureStore)  ┘
```

- `src/lib/` — capa portada del Front web (api, tipos, queries, format), con tokens en
  **expo-secure-store** en vez de localStorage.
- `src/ble/` — provisioning BLE (US3).

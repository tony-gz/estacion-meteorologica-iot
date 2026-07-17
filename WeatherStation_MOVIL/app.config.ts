import type { ExpoConfig } from 'expo/config';

// API_URL: origen del backend Spring (spec 001). Fallback = producción (Render),
// para que un build sin variables de entorno apunte a un backend real y no a un
// localhost inalcanzable desde el teléfono. En dev, sobreescribe con la IP LAN
// del backend (el móvil y el ESP32 deben alcanzarlo), p. ej.:
//   API_URL=http://192.168.1.100:8080 npx expo run:android
const API_URL =
  process.env.API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://weatherstation-backend.onrender.com';

const config: ExpoConfig = {
  name: 'CLIMBOT',
  slug: 'weatherstation-movil',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'climbot',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  android: {
    package: 'mx.climbot.movil',
    permissions: [
      'BLUETOOTH_SCAN',
      'BLUETOOTH_CONNECT',
      'ACCESS_FINE_LOCATION',
    ],
  },
  plugins: [
    'expo-asset',
    'expo-secure-store',
    [
      // Fija la versión de Kotlin: Compose Compiler 1.5.15 (expo-modules-core)
      // exige Kotlin 1.9.25; el default de SDK 52 (1.9.24) rompe el build nativo.
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '1.9.25',
        },
      },
    ],
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: false,
        // neverForLocation: en Android 12+ declara que el BLE no se usa para ubicar,
        // evitando pedir ACCESS_FINE_LOCATION en dispositivos modernos (Android 13).
        neverForLocation: true,
      },
    ],
  ],
  extra: {
    apiUrl: API_URL,
  },
};

export default config;

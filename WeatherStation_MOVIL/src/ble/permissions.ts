// Solicitud de permisos BLE en runtime (FR-018).
// Android 12+ (API 31): BLUETOOTH_SCAN + BLUETOOTH_CONNECT (con neverForLocation no
// hace falta ubicación). Android ≤11: ACCESS_FINE_LOCATION para poder escanear.
import { Linking, PermissionsAndroid, Platform } from 'react-native';

export interface ResultadoPermisos {
  concedidos: boolean;
  denegadoPermanente: boolean;
}

export async function solicitarPermisosBLE(): Promise<ResultadoPermisos> {
  if (Platform.OS !== 'android') {
    // iOS gestiona el permiso de Bluetooth por Info.plist / diálogo del sistema.
    return { concedidos: true, denegadoPermanente: false };
  }

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  const permisos =
    apiLevel >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const resultado = await PermissionsAndroid.requestMultiple(permisos);

  const valores = Object.values(resultado);
  const concedidos = valores.every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  const denegadoPermanente = valores.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

  return { concedidos, denegadoPermanente };
}

/** Abre los ajustes de la app para que el usuario conceda permisos manualmente. */
export function abrirAjustes(): void {
  Linking.openSettings().catch(() => {});
}

// Gestión del escaneo BLE (T032). Filtra dispositivos cuyo nombre empieza con
// "Meteo-" (los ESP32 de la red). react-native-ble-plx requiere un development
// build (no funciona en Expo Go).
import { BleManager, State, type Device } from 'react-native-ble-plx';

export const PREFIJO_METEO = 'Meteo-';

let manager: BleManager | null = null;

/** Instancia única del BleManager (perezosa: solo se crea al usar BLE). */
export function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

/** Estado del adaptador Bluetooth (PoweredOn, PoweredOff, Unsupported, …). */
export function estadoBluetooth(): Promise<State> {
  return getManager().state();
}

export { State };

/**
 * Escanea dispositivos "Meteo-*". Llama a onDispositivo por cada uno nuevo.
 * Devuelve una función para detener el escaneo.
 */
export function escanearMeteo(
  onDispositivo: (device: Device) => void,
  onError: (error: Error) => void,
): () => void {
  const vistos = new Set<string>();
  const m = getManager();

  m.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      onError(error);
      return;
    }
    if (device?.name?.startsWith(PREFIJO_METEO) && !vistos.has(device.id)) {
      vistos.add(device.id);
      onDispositivo(device);
    }
  });

  return () => m.stopDeviceScan();
}

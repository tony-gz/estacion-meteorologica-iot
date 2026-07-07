// Provisioning WiFi por BLE (T033/T034/T036). Conversación directa app↔ESP32; el
// backend NO participa. UUIDs y secuencia según contracts/ble-gatt.md.
import type { Subscription } from 'react-native-ble-plx';
import { getManager } from './bleManager';
import { base64AStr, strABase64 } from './base64';
import { parseStatus, type EstadoBLE } from './status';

export const SERVICIO_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const SSID_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const PASS_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9';
export const STATUS_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26aa';
export const CMD_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ab';

const CMD_APLICAR = 'APPLY';

export interface OpcionesProvision {
  deviceId: string;
  ssid: string;
  password: string;
  onEstado?: (estado: EstadoBLE) => void;
  timeoutMs?: number;
}

/**
 * Conecta, envía SSID+PASS, aplica y observa STATUS hasta un estado terminal o
 * timeout. Resuelve con el estado terminal. La contraseña NO se registra en logs
 * ni sale de aquí (FR-019).
 */
export function provisionar(opts: OpcionesProvision): Promise<EstadoBLE> {
  const { deviceId, ssid, password, onEstado, timeoutMs = 30_000 } = opts;
  const m = getManager();

  return new Promise<EstadoBLE>((resolve, reject) => {
    let sub: Subscription | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let terminado = false;

    const finalizar = (accion: () => void) => {
      if (terminado) return;
      terminado = true;
      if (timer) clearTimeout(timer);
      sub?.remove();
      m.cancelDeviceConnection(deviceId).catch(() => {});
      accion();
    };

    (async () => {
      const dispositivo = await m.connectToDevice(deviceId, { timeout: 10_000 });
      await dispositivo.discoverAllServicesAndCharacteristics();

      timer = setTimeout(() => {
        finalizar(() =>
          resolve({
            crudo: 'TIMEOUT', fase: 'ERROR',
            mensaje: 'Sin respuesta de la estación (tiempo agotado).',
            terminal: true, exito: false,
          }),
        );
      }, timeoutMs);

      sub = dispositivo.monitorCharacteristicForService(SERVICIO_UUID, STATUS_UUID, (error, car) => {
        if (error) {
          finalizar(() => reject(error));
          return;
        }
        if (!car?.value) return;
        const estado = parseStatus(base64AStr(car.value));
        onEstado?.(estado);
        if (estado.terminal) finalizar(() => resolve(estado));
      });

      // Secuencia: SSID → PASS → CMD "APPLY".
      await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, SSID_UUID, strABase64(ssid));
      await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, PASS_UUID, strABase64(password));
      await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, CMD_UUID, strABase64(CMD_APLICAR));
    })().catch((e) => finalizar(() => reject(e as Error)));
  });
}

/** Desconecta un dispositivo (para limpieza al salir de la pantalla). */
export function desconectar(deviceId: string): void {
  getManager().cancelDeviceConnection(deviceId).catch(() => {});
}

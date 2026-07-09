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
export const CONFIG_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26ac';

const CMD_APLICAR = 'APPLY';
const MTU_OBJETIVO = 512;

/** Longitud en bytes UTF-8 de un string (para saber si cabe en el MTU negociado). */
function bytesUtf8(texto: string): number {
  return unescape(encodeURIComponent(texto)).length;
}

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

export interface OpcionesProvisionCompleto {
  deviceId: string;
  uuid: string;
  token: string;
  ssid: string;
  password: string;
  url?: string;
  onEstado?: (estado: EstadoBLE) => void;
  timeoutMs?: number;
}

/**
 * Provisioning **completo** (002.1): envía en un solo paquete JSON por la característica
 * CONFIG el uuid+token+ssid+pass+url, negociando MTU 512. Observa STATUS hasta `AUTH_OK`
 * (WiFi + autenticación contra el backend) o error. Si el MTU no alcanza o el firmware no
 * expone CONFIG, cae al flujo legado (solo WiFi por SSID/PASS/APPLY).
 *
 * El token y la contraseña **no** se registran en logs ni salen de aquí (FR-019).
 */
export function provisionCompleto(opts: OpcionesProvisionCompleto): Promise<EstadoBLE> {
  const { deviceId, uuid, token, ssid, password, url, onEstado, timeoutMs = 45_000 } = opts;
  const m = getManager();

  // El firmware espera exactamente estas claves (ver contracts/ble-gatt.md).
  const paquete = JSON.stringify({ uuid, token, ssid, pass: password, ...(url ? { url } : {}) });

  return new Promise<EstadoBLE>((resolve, reject) => {
    let sub: Subscription | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let terminado = false;
    // El flujo completo espera AUTH_OK; si caemos al legado, WIFI_OK vuelve a ser terminal.
    let modoAuth = true;

    const finalizar = (accion: () => void) => {
      if (terminado) return;
      terminado = true;
      if (timer) clearTimeout(timer);
      sub?.remove();
      m.cancelDeviceConnection(deviceId).catch(() => {});
      accion();
    };

    (async () => {
      let dispositivo = await m.connectToDevice(deviceId, { timeout: 10_000 });

      // Negociar MTU para que el paquete quepa en un solo write (sin logs de secretos).
      let mtu = 23;
      try {
        dispositivo = await dispositivo.requestMTU(MTU_OBJETIVO);
        mtu = dispositivo.mtu ?? 23;
      } catch {
        mtu = 23;
      }
      await dispositivo.discoverAllServicesAndCharacteristics();
      const cabeEnMtu = mtu - 3 >= bytesUtf8(paquete);

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
        const estado = parseStatus(base64AStr(car.value), { esperaAuth: modoAuth });
        onEstado?.(estado);
        if (estado.terminal) finalizar(() => resolve(estado));
      });

      const enviarLegado = async () => {
        modoAuth = false; // sin CONFIG no habrá AUTH_OK; WIFI_OK vuelve a ser terminal
        await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, SSID_UUID, strABase64(ssid));
        await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, PASS_UUID, strABase64(password));
        await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, CMD_UUID, strABase64(CMD_APLICAR));
      };

      if (!cabeEnMtu) {
        await enviarLegado();
        return;
      }
      try {
        await dispositivo.writeCharacteristicWithResponseForService(SERVICIO_UUID, CONFIG_UUID, strABase64(paquete));
      } catch {
        // El firmware no expone CONFIG (versión antigua): degradar a solo-WiFi.
        await enviarLegado();
      }
    })().catch((e) => finalizar(() => reject(e as Error)));
  });
}

/** Desconecta un dispositivo (para limpieza al salir de la pantalla). */
export function desconectar(deviceId: string): void {
  getManager().cancelDeviceConnection(deviceId).catch(() => {});
}

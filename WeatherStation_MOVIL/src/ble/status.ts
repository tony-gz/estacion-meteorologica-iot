// Parser de los estados que el firmware ESP32 emite por la característica STATUS.
// Módulo PURO (sin imports nativos) → unit-testeable. Ver contracts/ble-gatt.md.

export type FaseBLE = 'IDLE' | 'SSID_OK' | 'PASS_OK' | 'CONNECTING' | 'CONECTADO' | 'ERROR';

export interface EstadoBLE {
  crudo: string;
  fase: FaseBLE;
  detalle?: string;   // ssid (CONNECTING) o ip (CONECTADO)
  mensaje: string;    // texto para la UI
  terminal: boolean;  // ¿el flujo terminó (éxito o error)?
  exito: boolean;     // solo true en WIFI_OK
}

/** Interpreta una línea de STATUS (p. ej. "CONNECTING:MiRed" o "WIFI_OK:192.168.1.5"). */
export function parseStatus(crudo: string): EstadoBLE {
  const texto = (crudo ?? '').trim();
  const sep = texto.indexOf(':');
  const clave = (sep === -1 ? texto : texto.slice(0, sep)).toUpperCase();
  const detalle = sep === -1 ? undefined : texto.slice(sep + 1);

  const base = (fase: FaseBLE, mensaje: string, terminal = false, exito = false): EstadoBLE =>
    ({ crudo: texto, fase, detalle, mensaje, terminal, exito });

  switch (clave) {
    case 'SSID_OK':
      return base('SSID_OK', 'Red recibida…');
    case 'PASS_OK':
      return base('PASS_OK', 'Contraseña recibida…');
    case 'CONNECTING':
      return base('CONNECTING', detalle ? `Conectando a ${detalle}…` : 'Conectando…');
    case 'WIFI_OK':
      return base('CONECTADO', detalle ? `Conectada ✅ (${detalle})` : 'Conectada ✅', true, true);
    case 'NO_AP':
    case 'NO_SSID_AVAIL':
      return base('ERROR', 'Red WiFi no encontrada.', true);
    case 'BAD_PASSWORD':
      return base('ERROR', 'Contraseña WiFi incorrecta.', true);
    case 'WIFI_FAIL':
      return base('ERROR', 'No se pudo conectar a la red.', true);
    case 'ERR_NO_SSID':
      return base('ERROR', 'Falta el SSID antes de aplicar.', true);
    case 'NO_CREDS':
      return base('IDLE', 'La estación no tiene credenciales guardadas.');
    case 'REBOOTING':
      return base('IDLE', 'La estación se está reiniciando…');
    default:
      return base('IDLE', texto || 'Esperando estado…');
  }
}

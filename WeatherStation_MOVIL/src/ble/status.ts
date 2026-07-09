// Parser de los estados que el firmware ESP32 emite por la característica STATUS.
// Módulo PURO (sin imports nativos) → unit-testeable. Ver contracts/ble-gatt.md.

export type FaseBLE =
  | 'IDLE' | 'CONFIG_OK' | 'SSID_OK' | 'PASS_OK' | 'CONNECTING' | 'AUTENTICANDO'
  | 'CONECTADO' | 'ERROR';

export interface EstadoBLE {
  crudo: string;
  fase: FaseBLE;
  detalle?: string;   // ssid (CONNECTING), ip (WIFI_OK) o code (AUTH_FAIL)
  mensaje: string;    // texto para la UI
  terminal: boolean;  // ¿el flujo terminó (éxito o error)?
  exito: boolean;     // true en el estado terminal de éxito
}

export interface OpcionesParse {
  /**
   * En el provisioning **completo** (002.1) el éxito real es `AUTH_OK` (WiFi +
   * autenticación contra el backend); `WIFI_OK` es solo progreso. En el flujo
   * **legado** (solo WiFi) el terminal de éxito sigue siendo `WIFI_OK`.
   */
  esperaAuth?: boolean;
}

/** Mensaje legible para cada código de `AUTH_FAIL:{code}` (ver contrato). */
function mensajeAuthFail(code?: string): string {
  switch ((code ?? '').trim().toUpperCase()) {
    case '401':
      return 'Token o UUID incorrectos. Revísalos o regenera el token.';
    case 'NET':
      return 'No se pudo contactar el backend. Revisa la URL.';
    case 'TIMEOUT':
      return 'El backend no respondió. Reintenta.';
    default:
      return 'La estación no pudo autenticarse contra el backend.';
  }
}

/** Interpreta una línea de STATUS (p. ej. "CONNECTING:MiRed" o "AUTH_FAIL:401"). */
export function parseStatus(crudo: string, opts: OpcionesParse = {}): EstadoBLE {
  const { esperaAuth = false } = opts;
  const texto = (crudo ?? '').trim();
  const sep = texto.indexOf(':');
  const clave = (sep === -1 ? texto : texto.slice(0, sep)).toUpperCase();
  const detalle = sep === -1 ? undefined : texto.slice(sep + 1);

  const base = (fase: FaseBLE, mensaje: string, terminal = false, exito = false): EstadoBLE =>
    ({ crudo: texto, fase, detalle, mensaje, terminal, exito });

  switch (clave) {
    // ── Provisioning completo (002.1) ──
    case 'CONFIG_OK':
      return base('CONFIG_OK', 'Configuración recibida…');
    case 'BAD_CONFIG':
      return base('ERROR', 'La estación rechazó la configuración (paquete inválido). Reintenta.', true);
    case 'AUTH_OK':
      return base('CONECTADO', 'Estación en línea (autenticada)', true, true);
    case 'AUTH_FAIL':
      return base('ERROR', mensajeAuthFail(detalle), true);

    // ── WiFi ──
    case 'SSID_OK':
      return base('SSID_OK', 'Red recibida…');
    case 'PASS_OK':
      return base('PASS_OK', 'Contraseña recibida…');
    case 'CONNECTING':
      return base('CONNECTING', detalle ? `Conectando a ${detalle}…` : 'Conectando…');
    case 'WIFI_OK':
      // En el flujo completo, WiFi OK es progreso (falta autenticar); en el legado, éxito.
      return esperaAuth
        ? base('AUTENTICANDO', detalle ? `WiFi conectada (${detalle}), autenticando…` : 'WiFi conectada, autenticando…')
        : base('CONECTADO', detalle ? `Conectada (${detalle})` : 'Conectada', true, true);
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

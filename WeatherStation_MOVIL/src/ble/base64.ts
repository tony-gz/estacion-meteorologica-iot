// Base64 ↔ string (UTF-8) sin dependencias. react-native-ble-plx entrega y recibe
// los valores de las características en base64.

const TABLA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesABase64(bytes: number[]): string {
  let salida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    salida += TABLA[b0 >> 2];
    salida += TABLA[((b0 & 3) << 4) | (b1 >> 4)];
    salida += i + 1 < bytes.length ? TABLA[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    salida += i + 2 < bytes.length ? TABLA[b2 & 63] : '=';
  }
  return salida;
}

function base64ABytes(b64: string): number[] {
  const limpio = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < limpio.length; i += 4) {
    const c0 = TABLA.indexOf(limpio[i]);
    const c1 = TABLA.indexOf(limpio[i + 1]);
    const c2 = TABLA.indexOf(limpio[i + 2]);
    const c3 = TABLA.indexOf(limpio[i + 3]);
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== -1 && i + 2 < limpio.length) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 !== -1 && i + 3 < limpio.length) bytes.push(((c2 & 3) << 6) | c3);
  }
  return bytes;
}

/** Codifica un string UTF-8 a base64. */
export function strABase64(texto: string): string {
  const utf8 = unescape(encodeURIComponent(texto));
  const bytes: number[] = [];
  for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i) & 0xff);
  return bytesABase64(bytes);
}

/** Decodifica base64 a un string UTF-8. */
export function base64AStr(b64: string): string {
  const bytes = base64ABytes(b64);
  let latin1 = '';
  for (const b of bytes) latin1 += String.fromCharCode(b);
  try {
    return decodeURIComponent(escape(latin1));
  } catch {
    return latin1;
  }
}

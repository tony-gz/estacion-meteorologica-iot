import { parseStatus } from '../src/ble/status';

describe('parseStatus (contrato BLE del firmware ESP32)', () => {
  it('marca progreso no terminal para SSID_OK / PASS_OK', () => {
    expect(parseStatus('SSID_OK')).toMatchObject({ fase: 'SSID_OK', terminal: false, exito: false });
    expect(parseStatus('PASS_OK')).toMatchObject({ fase: 'PASS_OK', terminal: false });
  });

  it('extrae el SSID de CONNECTING:{ssid}', () => {
    const e = parseStatus('CONNECTING:MiRed');
    expect(e.fase).toBe('CONNECTING');
    expect(e.detalle).toBe('MiRed');
    expect(e.terminal).toBe(false);
  });

  it('WIFI_OK:{ip} es éxito terminal y expone la IP', () => {
    const e = parseStatus('WIFI_OK:192.168.1.5');
    expect(e).toMatchObject({ fase: 'CONECTADO', terminal: true, exito: true, detalle: '192.168.1.5' });
  });

  it('mapea los errores terminales del firmware', () => {
    for (const crudo of ['NO_AP', 'BAD_PASSWORD', 'WIFI_FAIL', 'ERR_NO_SSID']) {
      const e = parseStatus(crudo);
      expect(e.fase).toBe('ERROR');
      expect(e.terminal).toBe(true);
      expect(e.exito).toBe(false);
    }
  });

  it('trata NO_CREDS / REBOOTING como informativos (no terminal)', () => {
    expect(parseStatus('NO_CREDS').terminal).toBe(false);
    expect(parseStatus('REBOOTING').terminal).toBe(false);
  });

  it('no explota con entrada desconocida o vacía', () => {
    expect(parseStatus('').terminal).toBe(false);
    expect(parseStatus('ALGO_RARO').fase).toBe('IDLE');
  });
});

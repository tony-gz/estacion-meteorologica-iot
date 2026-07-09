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

describe('parseStatus — provisioning completo (002.1)', () => {
  it('CONFIG_OK es progreso no terminal', () => {
    expect(parseStatus('CONFIG_OK')).toMatchObject({ fase: 'CONFIG_OK', terminal: false });
  });

  it('BAD_CONFIG es error terminal (permite reintentar)', () => {
    expect(parseStatus('BAD_CONFIG')).toMatchObject({ fase: 'ERROR', terminal: true, exito: false });
  });

  it('AUTH_OK es el éxito terminal real', () => {
    expect(parseStatus('AUTH_OK')).toMatchObject({ fase: 'CONECTADO', terminal: true, exito: true });
  });

  it('AUTH_FAIL:{code} mapea cada código a un mensaje distinto y es terminal', () => {
    const c401 = parseStatus('AUTH_FAIL:401');
    const cNet = parseStatus('AUTH_FAIL:NET');
    const cTo = parseStatus('AUTH_FAIL:TIMEOUT');
    for (const e of [c401, cNet, cTo]) {
      expect(e.fase).toBe('ERROR');
      expect(e.terminal).toBe(true);
      expect(e.exito).toBe(false);
    }
    expect(c401.mensaje).not.toBe(cNet.mensaje);
    expect(cNet.mensaje).not.toBe(cTo.mensaje);
    expect(c401.mensaje.toLowerCase()).toContain('token');
  });

  it('WIFI_OK es solo progreso cuando esperaAuth=true (falta autenticar)', () => {
    const e = parseStatus('WIFI_OK:192.168.1.5', { esperaAuth: true });
    expect(e.fase).toBe('AUTENTICANDO');
    expect(e.terminal).toBe(false);
    expect(e.exito).toBe(false);
  });

  it('WIFI_OK sigue siendo éxito terminal en el flujo legado (esperaAuth=false)', () => {
    expect(parseStatus('WIFI_OK:10.0.0.2')).toMatchObject({ terminal: true, exito: true });
  });
});

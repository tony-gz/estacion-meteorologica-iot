import { getManager } from '../src/ble/bleManager';
import {
  provisionCompleto, CONFIG_UUID, SSID_UUID, PASS_UUID, CMD_UUID,
} from '../src/ble/provisioning';
import { strABase64 } from '../src/ble/base64';

// Mockeamos la capa nativa BLE: sin dispositivo real, controlamos MTU y STATUS.
jest.mock('../src/ble/bleManager', () => ({ getManager: jest.fn() }));

const TOKEN = 'stk_secretisimo_ABC123';
const PASSWORD = 'wifi-super-secreta';

const flush = () => new Promise((r) => setTimeout(r, 0));

interface Escrito { uuid: string; valor: string }

function montarManager(mtu: number) {
  const escrituras: Escrito[] = [];
  let cb: ((error: unknown, car: { value: string } | null) => void) | null = null;

  const device: Record<string, unknown> = {
    mtu,
    requestMTU: jest.fn(async () => device),
    discoverAllServicesAndCharacteristics: jest.fn(async () => device),
    monitorCharacteristicForService: jest.fn((_s: string, _c: string, fn: typeof cb) => {
      cb = fn;
      return { remove: jest.fn() };
    }),
    writeCharacteristicWithResponseForService: jest.fn(
      async (_s: string, uuid: string, valor: string) => { escrituras.push({ uuid, valor }); return device; },
    ),
  };
  const manager = {
    connectToDevice: jest.fn(async () => device),
    cancelDeviceConnection: jest.fn(async () => undefined),
  };
  (getManager as jest.Mock).mockReturnValue(manager);
  return { escrituras, emitir: (crudo: string) => cb?.(null, { value: strABase64(crudo) }) };
}

const opts = {
  deviceId: 'dev-1', uuid: 'uuid-estacion', token: TOKEN,
  ssid: 'MiRed', password: PASSWORD, url: 'https://backend.example.com',
};

describe('provisionCompleto', () => {
  it('con MTU suficiente envía UN paquete a CONFIG y AUTH_OK es éxito', async () => {
    const { escrituras, emitir } = montarManager(512);
    const p = provisionCompleto(opts);
    await flush(); await flush();

    expect(escrituras).toHaveLength(1);
    expect(escrituras[0].uuid).toBe(CONFIG_UUID);
    expect(escrituras.some((e) => e.uuid === SSID_UUID)).toBe(false);

    emitir('AUTH_OK');
    const res = await p;
    expect(res).toMatchObject({ terminal: true, exito: true });
  });

  it('con MTU insuficiente cae al flujo legado (SSID/PASS/APPLY) y WIFI_OK es éxito', async () => {
    const { escrituras, emitir } = montarManager(23);
    const p = provisionCompleto(opts);
    await flush(); await flush();

    const uuids = escrituras.map((e) => e.uuid);
    expect(uuids).toEqual([SSID_UUID, PASS_UUID, CMD_UUID]);
    expect(uuids).not.toContain(CONFIG_UUID);

    emitir('WIFI_OK:192.168.0.9'); // en fallback vuelve a ser terminal de éxito
    const res = await p;
    expect(res).toMatchObject({ terminal: true, exito: true });
  });

  it('no registra el token ni la contraseña en consola (FR-019)', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const)
      .map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    const { emitir } = montarManager(512);

    const p = provisionCompleto(opts);
    await flush(); await flush();
    emitir('AUTH_OK');
    await p;

    const todo = spies.flatMap((s) => s.mock.calls).map((c) => JSON.stringify(c)).join(' ');
    expect(todo).not.toContain(TOKEN);
    expect(todo).not.toContain(PASSWORD);
    spies.forEach((s) => s.mockRestore());
  });
});

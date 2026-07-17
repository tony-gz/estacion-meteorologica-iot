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

interface OpcionesMock {
  conConfig?: boolean;       // ¿el firmware expone la característica CONFIG?
  configWriteFalla?: boolean; // ¿la escritura a CONFIG lanza (GATT/desconexión)?
}

function montarManager(mtu: number, { conConfig = true, configWriteFalla = false }: OpcionesMock = {}) {
  const escrituras: Escrito[] = [];
  let cb: ((error: unknown, car: { value: string } | null) => void) | null = null;

  const caracteristicas = conConfig
    ? [CONFIG_UUID, SSID_UUID, PASS_UUID, CMD_UUID]
    : [SSID_UUID, PASS_UUID, CMD_UUID];

  const device: Record<string, unknown> = {
    mtu,
    requestMTU: jest.fn(async () => device),
    discoverAllServicesAndCharacteristics: jest.fn(async () => device),
    characteristicsForService: jest.fn(async () => caracteristicas.map((uuid) => ({ uuid }))),
    monitorCharacteristicForService: jest.fn((_s: string, _c: string, fn: typeof cb) => {
      cb = fn;
      return { remove: jest.fn() };
    }),
    writeCharacteristicWithResponseForService: jest.fn(
      async (_s: string, uuid: string, valor: string) => {
        if (configWriteFalla && uuid === CONFIG_UUID) throw new Error('GATT write failed');
        escrituras.push({ uuid, valor });
        return device;
      },
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

  // Antes se degradaba a SSID/PASS/APPLY y se resolvía con éxito. Pero ese flujo
  // NO manda uuid ni token: la estación conservaba su identidad anterior y el
  // backend la rechazaba con 401, mientras la app decía que todo había ido bien.
  it('con MTU insuficiente falla en vez de provisionar sin identidad', async () => {
    const { escrituras } = montarManager(23);
    const p = provisionCompleto(opts);
    await flush(); await flush();

    expect(escrituras).toHaveLength(0);   // no se escribe NADA: ni siquiera el WiFi

    const res = await p;
    expect(res).toMatchObject({ crudo: 'MTU_INSUFICIENTE', terminal: true, exito: false });
  });

  // Firmware antiguo sin CONFIG: el legado (SSID/PASS/APPLY) es legítimo y WIFI_OK
  // vuelve a ser el éxito real (no habrá AUTH_OK).
  it('con firmware sin CONFIG usa el legado y WIFI_OK es éxito', async () => {
    const { escrituras, emitir } = montarManager(512, { conConfig: false });
    const p = provisionCompleto(opts);
    await flush(); await flush();

    expect(escrituras.map((e) => e.uuid)).toEqual([SSID_UUID, PASS_UUID, CMD_UUID]);
    expect(escrituras.some((e) => e.uuid === CONFIG_UUID)).toBe(false);

    emitir('WIFI_OK:192.168.1.5');
    const res = await p;
    expect(res).toMatchObject({ terminal: true, exito: true });
  });

  // El firmware SÍ expone CONFIG pero la escritura falla. Antes se degradaba al
  // legado (WiFi sin identidad) y se cantaba éxito con el uuid anterior. Ahora
  // falla claro y NO manda SSID/PASS.
  it('si el write de CONFIG falla, NO degrada a legado y reporta error', async () => {
    const { escrituras } = montarManager(512, { configWriteFalla: true });
    const p = provisionCompleto(opts);
    await flush(); await flush();

    expect(escrituras).toHaveLength(0);   // ni CONFIG (falló) ni WiFi legado

    const res = await p;
    expect(res).toMatchObject({ crudo: 'CONFIG_WRITE_FAIL', terminal: true, exito: false });
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

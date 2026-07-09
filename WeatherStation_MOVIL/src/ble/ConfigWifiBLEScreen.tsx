import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useColorScheme,
} from 'react-native';
import type { Device } from 'react-native-ble-plx';
import { usarTema } from '../theme/theme';
import { solicitarPermisosBLE, abrirAjustes } from './permissions';
import { bleDisponible, escanearMeteo, estadoBluetooth, State } from './bleManager';
import { provisionCompleto, desconectar } from './provisioning';
import type { EstadoBLE } from './status';
import type { PantallaProps } from '../navigation/types';

const DURACION_ESCANEO_MS = 15_000;
const URL_BACKEND_DEFAULT = 'https://weatherstation-backend.onrender.com';

/** Extrae el UUID del nombre anunciado `Meteo-{uuid}`. */
function uuidDeNombre(nombre?: string | null): string {
  return (nombre ?? '').replace(/^Meteo-/i, '').trim();
}

/** Valida que la URL sea http(s) y con formato razonable. */
function urlValida(u: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(u.trim());
}

// US3/US5: provisioning de la estación por BLE (FR-015..019, FR-016, FR-025, FR-026).
export function ConfigWifiBLEScreen({ route }: PantallaProps<'ConfigWifiBLE'>) {
  const t = usarTema(useColorScheme());
  const params = route.params ?? {};

  const [soportado, setSoportado] = useState(true);
  const [permisoOk, setPermisoOk] = useState<boolean | null>(null);
  const [denegadoPerm, setDenegadoPerm] = useState(false);
  const [btApagado, setBtApagado] = useState(false);
  const [dispositivos, setDispositivos] = useState<Device[]>([]);
  const [escaneando, setEscaneando] = useState(false);
  const [sel, setSel] = useState<Device | null>(null);
  const [uuidEst, setUuidEst] = useState(params.uuid ?? '');
  const [token, setToken] = useState(params.token ?? '');
  const [url, setUrl] = useState(URL_BACKEND_DEFAULT);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [estado, setEstado] = useState<EstadoBLE | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopScan = useRef<null | (() => void)>(null);

  const detenerEscaneo = useCallback(() => {
    stopScan.current?.();
    stopScan.current = null;
    setEscaneando(false);
  }, []);

  const iniciar = useCallback(async () => {
    setErrorMsg(null);
    setDispositivos([]);
    if (!bleDisponible()) {
      setSoportado(false);
      return;
    }
    const p = await solicitarPermisosBLE();
    setPermisoOk(p.concedidos);
    setDenegadoPerm(p.denegadoPermanente);
    if (!p.concedidos) return;

    const bt = await estadoBluetooth();
    if (bt !== State.PoweredOn) {
      setBtApagado(true);
      return;
    }
    setBtApagado(false);

    setEscaneando(true);
    stopScan.current = escanearMeteo(
      (d) => setDispositivos((prev) => (prev.some((x) => x.id === d.id) ? prev : [...prev, d])),
      (e) => {
        setErrorMsg(e.message);
        detenerEscaneo();
      },
    );
    setTimeout(detenerEscaneo, DURACION_ESCANEO_MS);
  }, [detenerEscaneo]);

  // Arranca el escaneo BLE (sistema externo) al montar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- iniciar() lanza el escaneo BLE (sistema externo) y resetea el estado inicial de la pantalla
    iniciar();
    return () => { stopScan.current?.(); };
  }, [iniciar]);

  // Desconecta el dispositivo seleccionado al cambiar de selección o al desmontar (FR-036).
  useEffect(() => () => { if (sel) desconectar(sel.id); }, [sel]);

  const puedeEnviar = !!sel && !!uuidEst.trim() && !!token.trim()
    && !!ssid.trim() && !!password && urlValida(url);

  async function onEnviar() {
    if (!sel || !puedeEnviar) return;
    detenerEscaneo();
    setEnviando(true);
    setEstado(null);
    setErrorMsg(null);
    try {
      const final = await provisionCompleto({
        deviceId: sel.id,
        uuid: uuidEst.trim(),
        token: token.trim(),
        ssid: ssid.trim(),
        password,
        url: url.trim(),
        onEstado: setEstado,
      });
      setEstado(final);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error de conexión BLE.');
    } finally {
      setEnviando(false);
      // No retener secretos en memoria más de lo necesario (FR-019).
      setPassword('');
      setToken('');
    }
  }

  // ── Estados de bloqueo ────────────────────────────────────────────────────
  if (!soportado) {
    return (
      <Aviso
        t={t}
        emoji="🧩"
        titulo="Bluetooth no disponible aquí"
        texto="La configuración por BLE requiere el build nativo de la app (no funciona en Expo Go). Compílala con «npm run android» e instálala por cable."
        accion="Reintentar"
        onAccion={iniciar}
      />
    );
  }
  if (permisoOk === false) {
    return (
      <Aviso
        t={t}
        emoji="🔒"
        titulo="Permiso de Bluetooth requerido"
        texto="La app necesita permisos de Bluetooth para descubrir y configurar la estación."
        accion={denegadoPerm ? 'Abrir ajustes' : 'Conceder permiso'}
        onAccion={denegadoPerm ? abrirAjustes : iniciar}
      />
    );
  }
  if (btApagado) {
    return (
      <Aviso t={t} emoji="📶" titulo="Bluetooth apagado"
        texto="Enciende el Bluetooth del teléfono para buscar la estación."
        accion="Reintentar" onAccion={iniciar} />
    );
  }

  // ── Formulario de una estación seleccionada ───────────────────────────────
  if (sel) {
    const terminado = estado?.terminal;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: t.fondo }}
      >
        <ScrollView contentContainerStyle={styles.cont} keyboardShouldPersistTaps="handled">
          <Text style={[styles.titulo, { color: t.texto }]}>{sel.name}</Text>
          <Text style={[styles.sub, { color: t.textoTenue }]}>
            Envía en un paquete la identidad de la estación y el WiFi.
          </Text>

          <View style={[styles.aviso2, { borderColor: t.borde }]}>
            <Text style={[styles.avisoTexto, { color: t.textoTenue }]}>
              🔒 Provisiona en un entorno de confianza: el token viaja por Bluetooth de corto
              alcance. Si sospechas que se filtró, un ADMIN puede regenerarlo.
            </Text>
          </View>

          <Text style={[styles.etiqueta, { color: t.textoTenue }]}>UUID de la estación</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
            placeholder="uuid de la estación"
            placeholderTextColor={t.textoTenue}
            autoCapitalize="none"
            autoCorrect={false}
            value={uuidEst}
            onChangeText={setUuidEst}
            editable={!enviando}
          />
          <Text style={[styles.etiqueta, { color: t.textoTenue }]}>Token de acceso (del correo)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
            placeholder="stk_… (pégalo aquí)"
            placeholderTextColor={t.textoTenue}
            autoCapitalize="none"
            autoCorrect={false}
            value={token}
            onChangeText={setToken}
            editable={!enviando}
          />
          <Text style={[styles.etiqueta, { color: t.textoTenue }]}>Red WiFi</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
            placeholder="Nombre de la red (SSID)"
            placeholderTextColor={t.textoTenue}
            autoCapitalize="none"
            value={ssid}
            onChangeText={setSsid}
            editable={!enviando}
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
            placeholder="Contraseña WiFi"
            placeholderTextColor={t.textoTenue}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!enviando}
          />
          <Text style={[styles.etiqueta, { color: t.textoTenue }]}>URL del backend</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: t.superficie,
              borderColor: url && !urlValida(url) ? t.error : t.borde,
              color: t.texto,
            }]}
            placeholder="https://…"
            placeholderTextColor={t.textoTenue}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={url}
            onChangeText={setUrl}
            editable={!enviando}
          />

          <Pressable
            onPress={onEnviar}
            disabled={enviando || !puedeEnviar}
            style={[styles.boton, { backgroundColor: t.primario, opacity: enviando || !puedeEnviar ? 0.5 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={styles.botonTexto}>{enviando ? 'Enviando…' : 'Provisionar estación'}</Text>
          </Pressable>

          {(enviando || estado) && (
            <View style={[styles.progreso, { backgroundColor: t.superficie, borderColor: t.borde }]}>
              {enviando && !terminado && <ActivityIndicator color={t.primario} />}
              <Text style={[styles.progresoTexto, { color: terminado ? (estado?.exito ? t.online : t.error) : t.texto }]}>
                {estado?.mensaje ?? 'Conectando con la estación…'}
              </Text>
              {estado?.crudo ? <Text style={[styles.crudo, { color: t.textoTenue }]}>STATUS: {estado.crudo}</Text> : null}
            </View>
          )}

          {errorMsg && <Text style={[styles.error, { color: t.error }]}>{errorMsg}</Text>}

          <Pressable onPress={() => { setSel(null); setEstado(null); setErrorMsg(null); iniciar(); }} accessibilityRole="button">
            <Text style={[styles.volver, { color: t.primario }]}>← Elegir otra estación</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Lista de dispositivos descubiertos ────────────────────────────────────
  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={styles.cont}>
      <Text style={[styles.titulo, { color: t.texto }]}>Configurar estación por Bluetooth</Text>
      <Text style={[styles.sub, { color: t.textoTenue }]}>
        Enciende la estación y espera a que aparezca (nombre «Meteo-…»).
      </Text>

      {escaneando && (
        <View style={styles.filaEscaneo}>
          <ActivityIndicator color={t.primario} />
          <Text style={{ color: t.textoTenue }}>Buscando estaciones…</Text>
        </View>
      )}

      {dispositivos.map((d) => (
        <Pressable
          key={d.id}
          onPress={() => { setSel(d); if (!uuidEst) setUuidEst(uuidDeNombre(d.name)); }}
          style={[styles.item, { backgroundColor: t.superficie, borderColor: t.borde }]}
          accessibilityRole="button"
        >
          <Text style={[styles.itemNombre, { color: t.texto }]}>{d.name}</Text>
          <Text style={[styles.crudo, { color: t.textoTenue }]}>Toca para configurar →</Text>
        </Pressable>
      ))}

      {!escaneando && dispositivos.length === 0 && (
        <Text style={[styles.sub, { color: t.textoTenue }]}>No se encontraron estaciones.</Text>
      )}

      {errorMsg && <Text style={[styles.error, { color: t.error }]}>{errorMsg}</Text>}

      {!escaneando && (
        <Pressable onPress={iniciar} style={[styles.boton, { backgroundColor: t.primario }]} accessibilityRole="button">
          <Text style={styles.botonTexto}>Buscar de nuevo</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Aviso({ t, emoji, titulo, texto, accion, onAccion }: {
  t: ReturnType<typeof usarTema>; emoji: string; titulo: string; texto: string;
  accion: string; onAccion: () => void;
}) {
  return (
    <View style={[styles.aviso, { backgroundColor: t.fondo }]}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={[styles.titulo, { color: t.texto, textAlign: 'center' }]}>{titulo}</Text>
      <Text style={[styles.sub, { color: t.textoTenue, textAlign: 'center' }]}>{texto}</Text>
      <Pressable onPress={onAccion} style={[styles.boton, { backgroundColor: t.primario, alignSelf: 'stretch' }]} accessibilityRole="button">
        <Text style={styles.botonTexto}>{accion}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { padding: 16, gap: 12 },
  aviso: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  titulo: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 14 },
  filaEscaneo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  item: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 2 },
  itemNombre: { fontSize: 15, fontWeight: '700' },
  aviso2: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 10 },
  avisoTexto: { fontSize: 12.5, lineHeight: 17 },
  etiqueta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  boton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  progreso: { borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  progresoTexto: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  crudo: { fontSize: 12 },
  error: { fontSize: 14 },
  volver: { fontSize: 14, marginTop: 8 },
});

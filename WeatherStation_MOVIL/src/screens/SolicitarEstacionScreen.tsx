import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, useColorScheme,
} from 'react-native';
import { useMisSolicitudes, useSolicitarEstacion } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { usarTema } from '../theme/theme';
import { fmtFechaHora } from '../lib/format';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { EstadoSolicitud } from '../lib/types';

const colorEstado: Record<EstadoSolicitud, string> = {
  PENDING: '#d97706', APPROVED: '#16a34a', REJECTED: '#dc2626',
};

// US4: solicitar alta de estación + ver mis solicitudes (FR-013).
export function SolicitarEstacionScreen() {
  const t = usarTema(useColorScheme());
  const solicitar = useSolicitarEstacion();
  const mias = useMisSolicitudes();

  const [nombre, setNombre] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  async function onEnviar() {
    try {
      await solicitar.mutateAsync({
        nombre: nombre.trim(),
        institucion: institucion.trim() || undefined,
        municipio: municipio.trim() || undefined,
        ubicacion: ubicacion.trim() || undefined,
      });
      setNombre(''); setInstitucion(''); setMunicipio(''); setUbicacion('');
    } catch {
      /* el error se muestra desde solicitar.isError */
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.fondo }}
    >
      <ScrollView contentContainerStyle={styles.cont} keyboardShouldPersistTaps="handled">
        <Text style={[styles.titulo, { color: t.texto }]}>Solicitar alta de estación</Text>
        <Text style={[styles.sub, { color: t.textoTenue }]}>
          Un administrador la revisará y, si la aprueba, recibirás el token por correo.
        </Text>

        <Campo etiqueta="Nombre de la estación *" valor={nombre} onChange={setNombre} t={t} />
        <Campo etiqueta="Institución / escuela" valor={institucion} onChange={setInstitucion} t={t} />
        <Campo etiqueta="Municipio" valor={municipio} onChange={setMunicipio} t={t} />
        <Campo etiqueta="Ubicación (referencia)" valor={ubicacion} onChange={setUbicacion} t={t} />

        {solicitar.isError && (
          <Text style={[styles.error, { color: t.error }]}>{mensajeError(solicitar.error)}</Text>
        )}
        {solicitar.isSuccess && (
          <Text style={[styles.ok, { color: t.online }]}>Solicitud enviada. Queda pendiente de aprobación.</Text>
        )}

        <Pressable
          onPress={onEnviar}
          disabled={solicitar.isPending || !nombre.trim()}
          style={[styles.boton, { backgroundColor: t.primario, opacity: solicitar.isPending || !nombre.trim() ? 0.5 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{solicitar.isPending ? 'Enviando…' : 'Enviar solicitud'}</Text>
        </Pressable>

        <Text style={[styles.subtitulo, { color: t.texto }]}>Mis solicitudes</Text>
        {mias.isPending ? (
          <Loading mensaje="Cargando…" />
        ) : mias.isError ? (
          <ErrorRetry mensaje={mensajeError(mias.error)} onReintentar={mias.refetch} />
        ) : mias.data.length === 0 ? (
          <Text style={[styles.sub, { color: t.textoTenue }]}>Aún no has enviado solicitudes.</Text>
        ) : (
          mias.data.map((s) => (
            <View key={s.id} style={[styles.card, { backgroundColor: t.superficie, borderColor: t.borde }]}>
              <View style={styles.filaCard}>
                <Text style={[styles.nombreCard, { color: t.texto }]}>{s.nombre}</Text>
                <View style={[styles.chip, { backgroundColor: colorEstado[s.estado] }]}>
                  <Text style={styles.chipTexto}>{s.estado}</Text>
                </View>
              </View>
              <Text style={[styles.metaCard, { color: t.textoTenue }]}>
                {[s.escuelaNombre, s.municipio].filter(Boolean).join(' · ') || '—'} · {fmtFechaHora(s.createdAt)}
              </Text>
              {s.estado === 'REJECTED' && s.motivoRechazo && (
                <Text style={[styles.metaCard, { color: t.error }]}>Motivo: {s.motivoRechazo}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({ etiqueta, valor, onChange, t }: {
  etiqueta: string; valor: string; onChange: (s: string) => void; t: ReturnType<typeof usarTema>;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.label, { color: t.textoTenue }]}>{etiqueta}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
        value={valor}
        onChangeText={onChange}
        placeholderTextColor={t.textoTenue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { padding: 16, gap: 10 },
  titulo: { fontSize: 22, fontWeight: '800' },
  subtitulo: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  sub: { fontSize: 14 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  boton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { fontSize: 14 },
  ok: { fontSize: 14, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  filaCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombreCard: { fontSize: 15, fontWeight: '700', flex: 1 },
  metaCard: { fontSize: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

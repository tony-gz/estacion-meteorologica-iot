import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, useColorScheme,
} from 'react-native';
import { useEstaciones, usePreguntarIA } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { usarTema } from '../theme/theme';
import { fmtFechaHora } from '../lib/format';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';

// US2: asistente de IA (FR-009). Solo se monta autenticado (ruta protegida).
export function AsistenteIAScreen() {
  const t = usarTema(useColorScheme());
  const estaciones = useEstaciones();
  const preguntar = usePreguntarIA();
  const [estacionId, setEstacionId] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState('');

  if (estaciones.isPending) return <Loading mensaje="Cargando estaciones…" />;
  if (estaciones.isError) {
    return <ErrorRetry mensaje={mensajeError(estaciones.error)} onReintentar={estaciones.refetch} />;
  }

  const sel = estacionId ?? estaciones.data[0]?.id ?? null;
  const puedeEnviar = !!sel && pregunta.trim().length > 0 && !preguntar.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.fondo }}
    >
      <ScrollView contentContainerStyle={styles.cont} keyboardShouldPersistTaps="handled">
        <Text style={[styles.titulo, { color: t.texto }]}>Asistente IA</Text>

        <Text style={[styles.label, { color: t.textoTenue }]}>Estación</Text>
        <View style={styles.chips}>
          {estaciones.data.map((e) => {
            const activo = e.id === sel;
            return (
              <Pressable
                key={e.id}
                onPress={() => setEstacionId(e.id)}
                style={[styles.chip, { borderColor: t.borde, backgroundColor: activo ? t.primario : t.superficie }]}
                accessibilityRole="button"
              >
                <Text style={{ color: activo ? '#fff' : t.texto, fontSize: 13, fontWeight: '600' }}>{e.nombre}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
          placeholder="Ej.: ¿Va a llover hoy según los datos recientes?"
          placeholderTextColor={t.textoTenue}
          value={pregunta}
          onChangeText={setPregunta}
          multiline
        />

        <Pressable
          onPress={() => sel && preguntar.mutate({ estacionId: sel, pregunta: pregunta.trim() })}
          disabled={!puedeEnviar}
          style={[styles.boton, { backgroundColor: t.primario, opacity: puedeEnviar ? 1 : 0.5 }]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{preguntar.isPending ? 'Consultando…' : 'Preguntar'}</Text>
        </Pressable>

        {preguntar.isError && (
          <Text style={[styles.error, { color: t.error }]}>{mensajeError(preguntar.error)}</Text>
        )}

        {preguntar.data && (
          <View style={[styles.respuesta, { backgroundColor: t.superficie, borderColor: t.borde }]}>
            <Text style={[styles.respuestaTexto, { color: t.texto }]}>{preguntar.data.respuesta}</Text>
            {preguntar.data.advertencias?.length > 0 && (
              <Text style={[styles.adv, { color: t.textoTenue }]}>
                {preguntar.data.advertencias.join(' · ')}
              </Text>
            )}
            <Text style={[styles.adv, { color: t.textoTenue }]}>
              {preguntar.data.muestrasUsadas} muestras · {fmtFechaHora(preguntar.data.generadoEn)}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cont: { padding: 16, gap: 10 },
  titulo: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  boton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { fontSize: 14 },
  respuesta: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  respuestaTexto: { fontSize: 15, lineHeight: 21 },
  adv: { fontSize: 12 },
});

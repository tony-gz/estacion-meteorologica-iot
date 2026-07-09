import { useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, useWindowDimensions,
} from 'react-native';
import { useHistorial } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { usarTema } from '../theme/theme';
import { Grafica, type Variable } from '../components/Grafica';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { PantallaProps } from '../navigation/types';

const RANGOS: { etiqueta: string; horas: number }[] = [
  { etiqueta: '24 h', horas: 24 },
  { etiqueta: '48 h', horas: 48 },
  { etiqueta: '7 d', horas: 168 },
];

const VARIABLES: { etiqueta: string; key: Variable }[] = [
  { etiqueta: 'Temp.', key: 'temperatura' },
  { etiqueta: 'Humedad', key: 'humedad' },
  { etiqueta: 'Presión', key: 'presion' },
  { etiqueta: 'Viento', key: 'vientoKmh' },
  { etiqueta: 'Lluvia', key: 'lluviaMm' },
];

// US2: histórico en gráfica (FR-008).
export function GraficasScreen({ route }: PantallaProps<'Graficas'>) {
  const { id, nombre } = route.params;
  const t = usarTema(useColorScheme());
  const { width } = useWindowDimensions();
  const [horas, setHoras] = useState(24);
  const [variable, setVariable] = useState<Variable>('temperatura');

  const { data, isPending, isError, error, refetch } = useHistorial(id, horas);

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={styles.cont}>
      <Text style={[styles.titulo, { color: t.texto }]}>{nombre}</Text>

      <Selector
        opciones={RANGOS.map((r) => ({ etiqueta: r.etiqueta, activo: r.horas === horas, onPress: () => setHoras(r.horas) }))}
      />
      <Selector
        opciones={VARIABLES.map((v) => ({ etiqueta: v.etiqueta, activo: v.key === variable, onPress: () => setVariable(v.key) }))}
      />

      <View style={[styles.card, { backgroundColor: t.superficie, borderColor: t.borde }]}>
        {isPending ? (
          <Loading mensaje="Cargando histórico…" />
        ) : isError ? (
          <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />
        ) : (
          <Grafica lecturas={data} variable={variable} ancho={width - 64} />
        )}
      </View>
    </ScrollView>
  );
}

function Selector({ opciones }: { opciones: { etiqueta: string; activo: boolean; onPress: () => void }[] }) {
  const t = usarTema(useColorScheme());
  return (
    <View style={styles.selector}>
      {opciones.map((o) => (
        <Pressable
          key={o.etiqueta}
          onPress={o.onPress}
          style={[
            styles.pill,
            { borderColor: t.borde, backgroundColor: o.activo ? t.primario : t.superficie },
          ]}
          accessibilityRole="button"
        >
          <Text style={{ color: o.activo ? '#fff' : t.texto, fontSize: 13, fontWeight: '600' }}>{o.etiqueta}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { padding: 16, gap: 12 },
  titulo: { fontSize: 20, fontWeight: '800' },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 240, justifyContent: 'center' },
});

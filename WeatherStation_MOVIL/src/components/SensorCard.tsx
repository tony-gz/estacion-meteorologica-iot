import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { usarTema } from '../theme/theme';

interface Props {
  icono: string;
  etiqueta: string;
  valor: string;
  unidad?: string;
}

// Métrica individual (temperatura, humedad, etc.).
export function SensorCard({ icono, etiqueta, valor, unidad }: Props) {
  const t = usarTema(useColorScheme());
  return (
    <View style={[styles.card, { backgroundColor: t.fondo, borderColor: t.borde }]}>
      <Text style={styles.icono}>{icono}</Text>
      <Text style={[styles.valor, { color: t.texto }]}>
        {valor}
        {unidad ? <Text style={[styles.unidad, { color: t.textoTenue }]}> {unidad}</Text> : null}
      </Text>
      <Text style={[styles.etiqueta, { color: t.textoTenue }]}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1, flexBasis: '30%', minWidth: 96,
    borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2,
  },
  icono: { fontSize: 22 },
  valor: { fontSize: 18, fontWeight: '700' },
  unidad: { fontSize: 12, fontWeight: '500' },
  etiqueta: { fontSize: 12 },
});

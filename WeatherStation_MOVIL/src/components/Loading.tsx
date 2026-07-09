import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { usarTema } from '../theme/theme';

export function Loading({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  const t = usarTema(useColorScheme());
  return (
    <View style={[styles.contenedor, { backgroundColor: t.fondo }]}>
      <ActivityIndicator size="large" color={t.primario} />
      <Text style={[styles.texto, { color: t.textoTenue }]}>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  texto: { fontSize: 15 },
});

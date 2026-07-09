import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { usarTema } from '../theme/theme';
import type { Conectividad } from '../lib/types';

export function EstadoBadge({ conectividad }: { conectividad: Conectividad }) {
  const t = usarTema(useColorScheme());
  const online = conectividad === 'ONLINE';
  const color = online ? t.online : t.offline;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.punto, { backgroundColor: color }]} />
      <Text style={[styles.texto, { color }]}>{online ? 'En línea' : 'Sin conexión'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  texto: { fontSize: 12, fontWeight: '600' },
});

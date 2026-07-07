import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { usarTema } from '../theme/theme';
import { fmtFechaHora } from '../lib/format';
import type { Alerta, Severidad } from '../lib/types';

const colorSeveridad: Record<Severidad, string> = {
  ALTA: '#dc2626',
  MEDIA: '#d97706',
  BAJA: '#2563eb',
};

export function AlertBanner({ alerta }: { alerta: Alerta }) {
  const t = usarTema(useColorScheme());
  const color = colorSeveridad[alerta.severidad];
  const activa = alerta.estado === 'ACTIVA';
  return (
    <View style={[styles.banner, { backgroundColor: t.superficie, borderColor: t.borde, borderLeftColor: color }]}>
      <View style={styles.fila}>
        <Text style={[styles.tipo, { color: t.texto }]}>{alerta.tipo.replace(/_/g, ' ')}</Text>
        <View style={[styles.chip, { backgroundColor: color }]}>
          <Text style={styles.chipTexto}>{alerta.severidad}</Text>
        </View>
      </View>
      <Text style={[styles.mensaje, { color: t.textoTenue }]}>{alerta.mensaje}</Text>
      <Text style={[styles.meta, { color: t.textoTenue }]}>
        {activa ? 'Activa' : 'Resuelta'} · {fmtFechaHora(alerta.detectadaEn)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderLeftWidth: 5, borderRadius: 12, padding: 12, gap: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipo: { fontSize: 15, fontWeight: '700' },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mensaje: { fontSize: 13 },
  meta: { fontSize: 11 },
});

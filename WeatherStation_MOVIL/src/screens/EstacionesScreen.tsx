import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { Icono } from '../components/Icono';
import { useNavigation } from '@react-navigation/native';
import { useEstaciones } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { fmtFechaHora } from '../lib/format';
import { EstadoBadge } from '../components/EstadoBadge';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { RootNav } from '../navigation/types';

// Orden de la lista: las PENDING (requieren acción) primero, luego el resto.
const ORDEN_ESTADO: Record<string, number> = {
  PENDING: 0, MAINTENANCE: 1, APPROVED: 2, DISABLED: 3, REJECTED: 4,
};

// US2: lista de estaciones (autenticado). Tap → detalle.
export function EstacionesScreen() {
  const t = usarTema(useColorScheme());
  const navigation = useNavigation<RootNav>();
  const { tieneRol } = useAuth();
  const puedeConfigurar = tieneRol('RESPONSABLE', 'ADMIN');
  const { data, isPending, isError, error, refetch, isRefetching } = useEstaciones();

  if (isPending) return <Loading mensaje="Cargando estaciones…" />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  const estaciones = [...data].sort(
    (a, b) => (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9),
  );

  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={styles.lista}
      data={estaciones}
      keyExtractor={(e) => e.uuid}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primario} />}
      ListHeaderComponent={
        puedeConfigurar ? (
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={() => navigation.navigate('SolicitarEstacion')}
              style={[styles.bleBtn, { borderColor: t.primario }]}
              accessibilityRole="button"
            >
              <Icono nombre="plus-circle-outline" size={18} color={t.primario} />
              <Text style={[styles.bleTexto, { color: t.primario }]}>Solicitar alta de estación</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('ConfigWifiBLE')}
              style={[styles.bleBtn, { borderColor: t.primario }]}
              accessibilityRole="button"
            >
              <Icono nombre="bluetooth" size={18} color={t.primario} />
              <Text style={[styles.bleTexto, { color: t.primario }]}>Configurar WiFi de una estación (BLE)</Text>
            </Pressable>
          </View>
        ) : null
      }
      ListEmptyComponent={<Text style={[styles.vacio, { color: t.textoTenue }]}>No hay estaciones.</Text>}
      renderItem={({ item }) => (
        <Pressable
          // El backend resuelve /estaciones/{id} por UUID público (no por la PK
          // de BD). Toda la cadena de detalle (detalle, historial, gráficas,
          // conexiones) usa este param, así que aquí va el uuid, no item.id.
          onPress={() => navigation.navigate('EstacionDetalle', { id: item.uuid, nombre: item.nombre })}
          style={[styles.card, { backgroundColor: t.superficie, borderColor: t.borde }]}
          accessibilityRole="button"
        >
          <View style={styles.top}>
            <Text style={[styles.nombre, { color: t.texto }]}>{item.nombre}</Text>
            <EstadoBadge conectividad={item.conectividad} />
          </View>
          <Text style={[styles.sub, { color: t.textoTenue }]}>
            {[item.escuelaNombre, item.municipio].filter(Boolean).join(' · ') || '—'} · {item.estado}
          </Text>
          <Text style={[styles.sub, { color: t.textoTenue }]}>
            Última conexión: {fmtFechaHora(item.ultimaConexion)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  vacio: { textAlign: 'center', marginTop: 40 },
  bleBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  bleTexto: { fontSize: 14, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { fontSize: 16, fontWeight: '700', flex: 1 },
  sub: { fontSize: 13 },
});

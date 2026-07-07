import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEstaciones } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { usarTema } from '../theme/theme';
import { fmtFechaHora } from '../lib/format';
import { EstadoBadge } from '../components/EstadoBadge';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { RootNav } from '../navigation/types';

// US2: lista de estaciones (autenticado). Tap → detalle.
export function EstacionesScreen() {
  const t = usarTema(useColorScheme());
  const navigation = useNavigation<RootNav>();
  const { data, isPending, isError, error, refetch, isRefetching } = useEstaciones();

  if (isPending) return <Loading mensaje="Cargando estaciones…" />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={styles.lista}
      data={data}
      keyExtractor={(e) => e.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primario} />}
      ListEmptyComponent={<Text style={[styles.vacio, { color: t.textoTenue }]}>No hay estaciones.</Text>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('EstacionDetalle', { id: item.id, nombre: item.nombre })}
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
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { fontSize: 16, fontWeight: '700', flex: 1 },
  sub: { fontSize: 13 },
});

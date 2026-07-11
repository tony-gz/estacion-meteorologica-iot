import {
  Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, useColorScheme,
} from 'react-native';
import { useAlertas, useEliminarAlerta } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { AlertBanner } from '../components/AlertBanner';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { Alerta } from '../lib/types';

// US2: alertas meteorológicas (FR-010). El ADMIN puede eliminar (mantener pulsado).
export function AlertasScreen() {
  const t = usarTema(useColorScheme());
  const { esAdmin } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = useAlertas();
  const eliminar = useEliminarAlerta();

  if (isPending) return <Loading mensaje="Cargando alertas…" />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  const confirmarEliminar = (a: Alerta) => {
    Alert.alert(
      'Eliminar alerta',
      `¿Eliminar la alerta "${a.tipo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminar.mutate(a.id, {
            onError: (e) => Alert.alert('No se pudo eliminar', mensajeError(e)),
          }),
        },
      ],
    );
  };

  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={styles.lista}
      data={data}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primario} />}
      ListHeaderComponent={
        esAdmin && data.length > 0 ? (
          <Text style={[styles.hint, { color: t.textoTenue }]}>
            Mantén pulsada una alerta para eliminarla.
          </Text>
        ) : null
      }
      ListEmptyComponent={<Text style={[styles.vacio, { color: t.textoTenue }]}>No hay alertas.</Text>}
      renderItem={({ item }) => (
        esAdmin ? (
          <Pressable
            onLongPress={() => confirmarEliminar(item)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityHint="Mantén pulsado para eliminar la alerta"
          >
            <AlertBanner alerta={item} />
          </Pressable>
        ) : <AlertBanner alerta={item} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  vacio: { textAlign: 'center', marginTop: 40 },
  hint: { fontSize: 12.5, marginBottom: 4 },
});

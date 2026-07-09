import {
  FlatList, RefreshControl, StyleSheet, Text, useColorScheme,
} from 'react-native';
import { useAlertas } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { usarTema } from '../theme/theme';
import { AlertBanner } from '../components/AlertBanner';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';

// US2: alertas meteorológicas (FR-010).
export function AlertasScreen() {
  const t = usarTema(useColorScheme());
  const { data, isPending, isError, error, refetch, isRefetching } = useAlertas();

  if (isPending) return <Loading mensaje="Cargando alertas…" />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={styles.lista}
      data={data}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primario} />}
      ListEmptyComponent={<Text style={[styles.vacio, { color: t.textoTenue }]}>No hay alertas.</Text>}
      renderItem={({ item }) => <AlertBanner alerta={item} />}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  vacio: { textAlign: 'center', marginTop: 40 },
});

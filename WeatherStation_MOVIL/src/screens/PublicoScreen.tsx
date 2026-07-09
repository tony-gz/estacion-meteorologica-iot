import { useCallback } from 'react';
import {
  FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePublicEstaciones, usePublicEstadisticas } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { fmtNum, fmtFechaHora } from '../lib/format';
import { SensorCard } from '../components/SensorCard';
import { EstadoBadge } from '../components/EstadoBadge';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { RootNav } from '../navigation/types';
import type { PublicEstacion } from '../lib/types';

// US1: vista pública sin cuenta. Lista estaciones aprobadas + clima actual.
export function PublicoScreen() {
  const t = usarTema(useColorScheme());
  const navigation = useNavigation<RootNav>();
  const { autenticado } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = usePublicEstaciones();
  const stats = usePublicEstadisticas();

  // Gate (FR-006): funciones reservadas piden iniciar sesión.
  const irAFuncionPrivada = useCallback(() => {
    if (!autenticado) navigation.navigate('Login');
  }, [autenticado, navigation]);

  if (isPending) return <Loading mensaje="Cargando estaciones…" />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  return (
    <FlatList
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={styles.lista}
      data={data}
      keyExtractor={(e) => e.uuid}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primario} />}
      ListHeaderComponent={
        <View style={styles.encabezado}>
          <Text style={[styles.titulo, { color: t.texto }]}>Clima actual</Text>
          {stats.data && (
            <Text style={[styles.resumen, { color: t.textoTenue }]}>
              Red: {stats.data.estaciones} estaciones · temp. media {fmtNum(stats.data.temperatura?.promedio)}°C · hum. {fmtNum(stats.data.humedad?.promedio, 0)}%
            </Text>
          )}
          {!autenticado && (
            <Pressable onPress={irAFuncionPrivada} accessibilityRole="button">
              <Text style={[styles.enlace, { color: t.primario }]}>Iniciar sesión para IA e históricos →</Text>
            </Pressable>
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.vacio, { color: t.textoTenue }]}>No hay estaciones publicadas.</Text>
      }
      renderItem={({ item }) => <TarjetaEstacion estacion={item} />}
    />
  );
}

function TarjetaEstacion({ estacion }: { estacion: PublicEstacion }) {
  const t = usarTema(useColorScheme());
  const l = estacion.ultimaLectura;
  return (
    <View style={[styles.card, { backgroundColor: t.superficie, borderColor: t.borde }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nombre, { color: t.texto }]}>{estacion.nombre}</Text>
          <Text style={[styles.sub, { color: t.textoTenue }]}>
            {[estacion.escuelaNombre, estacion.municipio].filter(Boolean).join(' · ') || '—'}
          </Text>
        </View>
        <EstadoBadge conectividad={estacion.conectividad} />
      </View>

      {l ? (
        <>
          <View style={styles.grid}>
            <SensorCard icono="thermometer" etiqueta="Temp." valor={fmtNum(l.temperatura)} unidad="°C" />
            <SensorCard icono="water-percent" etiqueta="Humedad" valor={fmtNum(l.humedad, 0)} unidad="%" />
            <SensorCard icono="gauge" etiqueta="Presión" valor={fmtNum(l.presion, 0)} unidad="hPa" />
            <SensorCard icono="weather-windy" etiqueta="Viento" valor={fmtNum(l.vientoKmh)} unidad="km/h" />
            <SensorCard icono="weather-pouring" etiqueta="Lluvia" valor={fmtNum(l.lluviaMm)} unidad="mm" />
            <SensorCard icono="compass-outline" etiqueta="Dir." valor={l.vientoDir || '—'} />
          </View>
          <Text style={[styles.actualizado, { color: t.textoTenue }]}>
            Actualizado: {fmtFechaHora(l.timestamp)}
          </Text>
        </>
      ) : (
        <Text style={[styles.sinLectura, { color: t.textoTenue }]}>Sin lectura reciente.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 14 },
  encabezado: { gap: 4, marginBottom: 2 },
  titulo: { fontSize: 22, fontWeight: '800' },
  resumen: { fontSize: 13 },
  enlace: { fontSize: 14, fontWeight: '600' },
  vacio: { textAlign: 'center', marginTop: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actualizado: { fontSize: 12 },
  sinLectura: { fontSize: 13, fontStyle: 'italic' },
});

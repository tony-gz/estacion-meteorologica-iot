import {
  Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { useConexiones, useEstacion } from '../lib/queries';
import { mensajeError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { fmtNum, fmtFechaHora } from '../lib/format';
import { SensorCard } from '../components/SensorCard';
import { EstadoBadge } from '../components/EstadoBadge';
import { Loading } from '../components/Loading';
import { ErrorRetry } from '../components/ErrorRetry';
import type { PantallaProps } from '../navigation/types';

// US2: detalle de una estación (autenticado).
export function EstacionDetalleScreen({ route, navigation }: PantallaProps<'EstacionDetalle'>) {
  const { id, nombre } = route.params;
  const t = usarTema(useColorScheme());
  const { tieneRol } = useAuth();
  const verConexiones = tieneRol('RESPONSABLE', 'ADMIN');
  const { data, isPending, isError, error, refetch, isRefetching } = useEstacion(id);
  const conexiones = useConexiones(id, verConexiones);

  if (isPending) return <Loading mensaje={`Cargando ${nombre}…`} />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  const l = data.ultimaLectura;

  return (
    <ScrollView
      style={{ backgroundColor: t.fondo }}
      contentContainerStyle={styles.cont}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primario} />}
    >
      <View style={styles.top}>
        <Text style={[styles.titulo, { color: t.texto }]}>{data.nombre}</Text>
        <EstadoBadge conectividad={data.conectividad} />
      </View>
      <Text style={[styles.meta, { color: t.textoTenue }]}>
        {[data.escuelaNombre, data.municipio].filter(Boolean).join(' · ') || '—'} · Estado: {data.estado}
      </Text>
      <Text style={[styles.meta, { color: t.textoTenue }]}>
        Última conexión: {fmtFechaHora(data.ultimaConexion)}
      </Text>

      {l ? (
        <>
          <View style={styles.grid}>
            <SensorCard icono="🌡️" etiqueta="Temp." valor={fmtNum(l.temperatura)} unidad="°C" />
            <SensorCard icono="💧" etiqueta="Humedad" valor={fmtNum(l.humedad, 0)} unidad="%" />
            <SensorCard icono="🧭" etiqueta="Presión" valor={fmtNum(l.presion, 0)} unidad="hPa" />
            <SensorCard icono="💨" etiqueta="Viento" valor={fmtNum(l.vientoKmh)} unidad="km/h" />
            <SensorCard icono="🌧️" etiqueta="Lluvia" valor={fmtNum(l.lluviaMm)} unidad="mm" />
            <SensorCard icono="🧭" etiqueta="Dir." valor={l.vientoDir || '—'} />
          </View>
          <Text style={[styles.meta, { color: t.textoTenue }]}>Actualizado: {fmtFechaHora(l.timestamp)}</Text>
        </>
      ) : (
        <Text style={[styles.sinLectura, { color: t.textoTenue }]}>Sin lectura reciente.</Text>
      )}

      <View style={styles.acciones}>
        <Pressable
          onPress={() => navigation.navigate('Graficas', { id, nombre: data.nombre })}
          style={[styles.boton, { backgroundColor: t.primario }]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>📈 Ver histórico</Text>
        </Pressable>
      </View>

      {verConexiones && (
        <View style={styles.conexiones}>
          <Text style={[styles.seccion, { color: t.texto }]}>Conexiones recientes</Text>
          {conexiones.isPending ? (
            <Text style={[styles.meta, { color: t.textoTenue }]}>Cargando…</Text>
          ) : conexiones.isError ? (
            <Text style={[styles.meta, { color: t.error }]}>{mensajeError(conexiones.error)}</Text>
          ) : conexiones.data.length === 0 ? (
            <Text style={[styles.meta, { color: t.textoTenue }]}>Sin registros de conexión.</Text>
          ) : (
            conexiones.data.slice(0, 10).map((c, i) => (
              <View key={`${c.timestamp}-${i}`} style={[styles.conexion, { borderColor: t.borde }]}>
                <Text style={[styles.meta, { color: t.texto }]}>{c.evento}{c.ip ? ` · ${c.ip}` : ''}</Text>
                <Text style={[styles.meta, { color: t.textoTenue }]}>{fmtFechaHora(c.timestamp)}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cont: { padding: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { fontSize: 22, fontWeight: '800', flex: 1 },
  meta: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  sinLectura: { fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  acciones: { marginTop: 12 },
  boton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  conexiones: { marginTop: 16, gap: 6 },
  seccion: { fontSize: 17, fontWeight: '700' },
  conexion: { borderBottomWidth: 1, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});

import { useState } from 'react';
import {
  Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icono } from '../components/Icono';
import { useConexiones, useEstacion, useRegenerarToken } from '../lib/queries';
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
  const { tieneRol, esAdmin, esResponsable, usuario } = useAuth();
  const verConexiones = tieneRol('RESPONSABLE', 'ADMIN');
  const puedeProvisionar = tieneRol('RESPONSABLE', 'ADMIN');
  const { data, isPending, isError, error, refetch, isRefetching } = useEstacion(id);
  const conexiones = useConexiones(id, verConexiones);
  const regenerar = useRegenerarToken();
  const [tokenRevelado, setTokenRevelado] = useState<string | null>(null);

  const copiarUuid = async () => {
    await Clipboard.setStringAsync(id);
    Alert.alert('UUID copiado', 'El UUID de la estación se copió al portapapeles.');
  };

  const confirmarRegenerar = () => {
    Alert.alert(
      'Regenerar token',
      'Se generará un token nuevo y el anterior quedará invalidado: la estación deberá re-provisionarse. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regenerar',
          style: 'destructive',
          onPress: () => regenerar.mutate(id, {
            onSuccess: (st) => setTokenRevelado(st.token),
            onError: (e) => Alert.alert('No se pudo regenerar', mensajeError(e)),
          }),
        },
      ],
    );
  };

  if (isPending) return <Loading mensaje={`Cargando ${nombre}…`} />;
  if (isError) return <ErrorRetry mensaje={mensajeError(error)} onReintentar={refetch} />;

  const l = data.ultimaLectura;

  // INVESTIGADOR y ADMIN ven el histórico de cualquier estación; el RESPONSABLE
  // solo el de su propia estación (de la que es responsable). USUARIO no accede.
  const esMiEstacion = !!usuario && data.responsableId === usuario.id;
  const puedeVerHistorico = tieneRol('INVESTIGADOR', 'ADMIN') || (esResponsable && esMiEstacion);

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
            <SensorCard icono="thermometer" etiqueta="Temp." valor={fmtNum(l.temperatura)} unidad="°C" />
            <SensorCard icono="water-percent" etiqueta="Humedad" valor={fmtNum(l.humedad, 0)} unidad="%" />
            <SensorCard icono="gauge" etiqueta="Presión" valor={fmtNum(l.presion, 0)} unidad="hPa" />
            <SensorCard icono="weather-windy" etiqueta="Viento" valor={fmtNum(l.vientoKmh)} unidad="km/h" />
            <SensorCard icono="weather-pouring" etiqueta="Lluvia" valor={fmtNum(l.lluviaMm)} unidad="mm" />
            <SensorCard icono="compass-outline" etiqueta="Dir." valor={l.vientoDir || '—'} />
          </View>
          <Text style={[styles.meta, { color: t.textoTenue }]}>Actualizado: {fmtFechaHora(l.timestamp)}</Text>
        </>
      ) : (
        <Text style={[styles.sinLectura, { color: t.textoTenue }]}>Sin lectura reciente.</Text>
      )}

      <View style={styles.acciones}>
        {puedeVerHistorico ? (
          <Pressable
            onPress={() => navigation.navigate('Graficas', { id, nombre: data.nombre })}
            style={[styles.boton, styles.botonRow, { backgroundColor: t.primario }]}
            accessibilityRole="button"
          >
            <Icono nombre="chart-line" size={18} color="#fff" />
            <Text style={styles.botonTexto}>Ver histórico</Text>
          </Pressable>
        ) : (
          <View style={[styles.avisoHistorico, { borderColor: t.borde }]}>
            <Icono nombre="lock" size={16} color={t.textoTenue} />
            <Text style={[styles.credNota, { color: t.textoTenue, flex: 1 }]}>
              El histórico y las gráficas están disponibles para investigadores, administradores
              y el responsable de esta estación.
            </Text>
          </View>
        )}
      </View>

      {puedeProvisionar && (
        <View style={[styles.credenciales, { borderColor: t.borde }]}>
          <Text style={[styles.seccion, { color: t.texto }]}>Credenciales de la estación</Text>

          <Text style={[styles.credLabel, { color: t.textoTenue }]}>UUID</Text>
          <View style={styles.credFila}>
            <Text style={[styles.credValor, { color: t.texto }]} selectable numberOfLines={1}>{id}</Text>
            <Pressable onPress={copiarUuid} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.credAccion, { color: t.primario }]}>Copiar</Text>
            </Pressable>
          </View>

          <Text style={[styles.credLabel, { color: t.textoTenue }]}>Token de acceso</Text>
          {tokenRevelado ? (
            <View style={[styles.tokenBox, { borderColor: t.primario }]}>
              <Text style={[styles.credValor, { color: t.texto }]} selectable>{tokenRevelado}</Text>
              <View style={styles.credAviso}>
                <Icono nombre="alert" size={14} color={t.error} />
                <Text style={[styles.credNota, { color: t.error, flex: 1 }]}>
                  Cópialo ahora: no se volverá a mostrar.
                </Text>
              </View>
              <Pressable onPress={() => Clipboard.setStringAsync(tokenRevelado)} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.credAccion, { color: t.primario }]}>Copiar token</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.credNota, { color: t.textoTenue }]}>
              Por seguridad el token no se puede recuperar. {esAdmin
                ? 'Regenéralo si lo necesitas (invalida el anterior).'
                : 'Búscalo en el correo, o pide a un ADMIN que lo regenere.'}
            </Text>
          )}

          <View style={styles.credBotones}>
            {esAdmin && (
              <Pressable
                onPress={confirmarRegenerar}
                disabled={regenerar.isPending}
                style={[styles.botonSec, styles.botonRow, { borderColor: t.primario, opacity: regenerar.isPending ? 0.5 : 1 }]}
                accessibilityRole="button"
              >
                <Icono nombre="refresh" size={16} color={t.primario} />
                <Text style={[styles.botonSecTexto, { color: t.primario }]}>
                  {regenerar.isPending ? 'Regenerando…' : 'Regenerar token'}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('ConfigWifiBLE', {
                uuid: id, nombre: data.nombre, token: tokenRevelado ?? undefined,
              })}
              style={[styles.boton, styles.botonRow, { backgroundColor: t.primario, flex: 1 }]}
              accessibilityRole="button"
            >
              <Icono nombre="bluetooth" size={18} color="#fff" />
              <Text style={styles.botonTexto}>Provisionar por BLE</Text>
            </Pressable>
          </View>
        </View>
      )}

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
  avisoHistorico: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  boton: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  botonRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  credAviso: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  conexiones: { marginTop: 16, gap: 6 },
  seccion: { fontSize: 17, fontWeight: '700' },
  credenciales: { marginTop: 16, gap: 6, borderWidth: 1, borderRadius: 14, padding: 14 },
  credLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  credFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  credValor: { fontSize: 13, flexShrink: 1, fontVariant: ['tabular-nums'] },
  credAccion: { fontSize: 13, fontWeight: '700' },
  credNota: { fontSize: 12.5, lineHeight: 17 },
  tokenBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 10, gap: 6 },
  credBotones: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  botonSec: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  botonSecTexto: { fontSize: 14, fontWeight: '700' },
  conexion: { borderBottomWidth: 1, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});

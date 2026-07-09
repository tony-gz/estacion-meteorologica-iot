import { useMemo } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { usarTema } from '../theme/theme';
import { fmtHora } from '../lib/format';
import type { Lectura } from '../lib/types';

export type Variable = 'temperatura' | 'humedad' | 'presion' | 'vientoKmh' | 'lluviaMm';

interface Props {
  lecturas: Lectura[];
  variable: Variable;
  ancho: number;
}

// Serie temporal de una variable (FR-008). Etiqueta cada ~1/5 de los puntos.
export function Grafica({ lecturas, variable, ancho }: Props) {
  const t = usarTema(useColorScheme());

  const datos = useMemo(() => {
    const paso = Math.max(1, Math.floor(lecturas.length / 5));
    return lecturas.map((l, i) => ({
      value: l[variable] ?? 0,
      label: i % paso === 0 ? fmtHora(l.timestamp) : undefined,
      labelTextStyle: { color: t.textoTenue, fontSize: 9 },
    }));
  }, [lecturas, variable, t.textoTenue]);

  if (lecturas.length === 0) {
    return <Text style={[styles.vacio, { color: t.textoTenue }]}>Sin datos en el rango.</Text>;
  }

  return (
    <View style={styles.contenedor}>
      <LineChart
        data={datos}
        width={ancho}
        thickness={2}
        color={t.primario}
        dataPointsColor={t.primario}
        hideDataPoints={lecturas.length > 40}
        yAxisTextStyle={{ color: t.textoTenue, fontSize: 9 }}
        xAxisColor={t.borde}
        yAxisColor={t.borde}
        rulesColor={t.borde}
        curved
        adjustToWidth
        initialSpacing={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { paddingVertical: 8 },
  vacio: { fontSize: 13, fontStyle: 'italic', paddingVertical: 20, textAlign: 'center' },
});

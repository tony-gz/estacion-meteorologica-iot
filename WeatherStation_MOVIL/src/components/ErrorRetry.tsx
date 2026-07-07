import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { usarTema } from '../theme/theme';

interface Props {
  mensaje: string;
  onReintentar?: () => void;
}

// Estado de error legible con reintento (FR-020).
export function ErrorRetry({ mensaje, onReintentar }: Props) {
  const t = usarTema(useColorScheme());
  return (
    <View style={[styles.contenedor, { backgroundColor: t.fondo }]}>
      <Text style={[styles.emoji]}>⚠️</Text>
      <Text style={[styles.mensaje, { color: t.texto }]}>{mensaje}</Text>
      {onReintentar && (
        <Pressable
          onPress={onReintentar}
          style={[styles.boton, { backgroundColor: t.primario }]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emoji: { fontSize: 40 },
  mensaje: { fontSize: 15, textAlign: 'center' },
  boton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  botonTexto: { color: '#fff', fontWeight: '600' },
});

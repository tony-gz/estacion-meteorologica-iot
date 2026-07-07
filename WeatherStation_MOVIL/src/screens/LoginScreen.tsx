import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, useColorScheme,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { mensajeError } from '../lib/api';
import { usarTema } from '../theme/theme';
import type { PantallaProps } from '../navigation/types';

// Login mínimo (MVP). US2 ampliará validación, registro y UX.
export function LoginScreen({ navigation }: PantallaProps<'Login'>) {
  const t = usarTema(useColorScheme());
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onEntrar() {
    setError(null);
    setEnviando(true);
    try {
      await login(email.trim(), password);
      navigation.goBack();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  const deshabilitado = enviando || !email || !password;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.contenedor, { backgroundColor: t.fondo }]}
    >
      <View style={styles.form}>
        <Text style={[styles.titulo, { color: t.texto }]}>Iniciar sesión</Text>

        <TextInput
          style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
          placeholder="Correo"
          placeholderTextColor={t.textoTenue}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { backgroundColor: t.superficie, borderColor: t.borde, color: t.texto }]}
          placeholder="Contraseña"
          placeholderTextColor={t.textoTenue}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={[styles.error, { color: t.error }]}>{error}</Text>}

        <Pressable
          onPress={onEntrar}
          disabled={deshabilitado}
          style={[styles.boton, { backgroundColor: t.primario, opacity: deshabilitado ? 0.5 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Entrando…' : 'Entrar'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'center' },
  form: { padding: 24, gap: 14 },
  titulo: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  error: { fontSize: 14 },
  boton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

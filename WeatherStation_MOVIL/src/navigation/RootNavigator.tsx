import { Pressable, Text, useColorScheme } from 'react-native';
import {
  NavigationContainer, DefaultTheme, DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { Loading } from '../components/Loading';
import { PublicoScreen } from '../screens/PublicoScreen';
import { LoginScreen } from '../screens/LoginScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const esquema = useColorScheme();
  const t = usarTema(esquema);
  const { cargando, autenticado, logout } = useAuth();

  // Espera la hidratación de sesión desde SecureStore antes de enrutar.
  if (cargando) return <Loading mensaje="Iniciando…" />;

  const navTheme = esquema === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: t.superficie },
          headerTitleStyle: { color: t.texto },
          headerTintColor: t.primario,
          contentStyle: { backgroundColor: t.fondo },
        }}
      >
        <Stack.Screen
          name="Publico"
          component={PublicoScreen}
          options={({ navigation }) => ({
            title: 'CLIMBOT',
            headerRight: () =>
              autenticado ? (
                <Pressable onPress={logout} accessibilityRole="button">
                  <Text style={{ color: t.primario, fontWeight: '600' }}>Salir</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="button">
                  <Text style={{ color: t.primario, fontWeight: '600' }}>Entrar</Text>
                </Pressable>
              ),
          })}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Iniciar sesión', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

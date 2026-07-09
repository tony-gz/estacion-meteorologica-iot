import { useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { Loading } from '../components/Loading';
import { Tabs } from './Tabs';
import { LoginScreen } from '../screens/LoginScreen';
import { EstacionDetalleScreen } from '../screens/EstacionDetalleScreen';
import { GraficasScreen } from '../screens/GraficasScreen';
import { ConfigWifiBLEScreen } from '../ble/ConfigWifiBLEScreen';
import { SolicitarEstacionScreen } from '../screens/SolicitarEstacionScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const esquema = useColorScheme();
  const t = usarTema(esquema);
  const { cargando } = useAuth();

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
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Iniciar sesión', presentation: 'modal' }}
        />
        <Stack.Screen
          name="EstacionDetalle"
          component={EstacionDetalleScreen}
          options={({ route }) => ({ title: route.params.nombre })}
        />
        <Stack.Screen
          name="Graficas"
          component={GraficasScreen}
          options={{ title: 'Histórico' }}
        />
        <Stack.Screen
          name="ConfigWifiBLE"
          component={ConfigWifiBLEScreen}
          options={{ title: 'Configurar WiFi (BLE)' }}
        />
        <Stack.Screen
          name="SolicitarEstacion"
          component={SolicitarEstacionScreen}
          options={{ title: 'Solicitar estación' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import { Pressable, Text, useColorScheme } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icono, type NombreIcono } from '../components/Icono';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { usarTema } from '../theme/theme';
import { PublicoScreen } from '../screens/PublicoScreen';
import { EstacionesScreen } from '../screens/EstacionesScreen';
import { AlertasScreen } from '../screens/AlertasScreen';
import { AsistenteIAScreen } from '../screens/AsistenteIAScreen';
import type { RootNav, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

function icono(name: NombreIcono) {
  return ({ color, size }: { color: string; size: number }) =>
    <Icono nombre={name} size={size ?? 22} color={color} />;
}

export function Tabs() {
  const t = usarTema(useColorScheme());
  const { autenticado, logout, usuario } = useAuth();
  const navigation = useNavigation<RootNav>();

  const headerRight = () =>
    autenticado ? (
      <Pressable onPress={logout} accessibilityRole="button" style={{ paddingHorizontal: 12 }}>
        <Text style={{ color: t.primario, fontWeight: '600' }}>Salir</Text>
      </Pressable>
    ) : (
      <Pressable
        onPress={() => navigation.navigate('Login')}
        accessibilityRole="button"
        style={{ paddingHorizontal: 12 }}
      >
        <Text style={{ color: t.primario, fontWeight: '600' }}>Entrar</Text>
      </Pressable>
    );

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: t.superficie },
        headerTitleStyle: { color: t.texto },
        headerTintColor: t.texto,
        headerRight,
        tabBarStyle: { backgroundColor: t.superficie, borderTopColor: t.borde },
        tabBarActiveTintColor: t.primario,
        tabBarInactiveTintColor: t.textoTenue,
        sceneStyle: { backgroundColor: t.fondo },
      }}
    >
      <Tab.Screen
        name="Clima"
        component={PublicoScreen}
        options={{ title: usuario ? `Hola, ${usuario.nombre.split(' ')[0]}` : 'CLIMBOT', tabBarLabel: 'Clima', tabBarIcon: icono('weather-partly-cloudy') }}
      />
      {autenticado && (
        <>
          <Tab.Screen
            name="Estaciones"
            component={EstacionesScreen}
            options={{ title: 'Estaciones', tabBarIcon: icono('radio-tower') }}
          />
          <Tab.Screen
            name="Alertas"
            component={AlertasScreen}
            options={{ title: 'Alertas', tabBarIcon: icono('alert') }}
          />
          <Tab.Screen
            name="IA"
            component={AsistenteIAScreen}
            options={{ title: 'Asistente IA', tabBarIcon: icono('robot-outline') }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

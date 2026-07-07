import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

// Stack raíz: las tabs + pantallas apiladas (login modal, detalle, gráficas).
export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  EstacionDetalle: { id: string; nombre: string };
  Graficas: { id: string; nombre: string };
};

// Tabs inferiores. "Clima" siempre; el resto solo autenticado.
export type TabParamList = {
  Clima: undefined;
  Estaciones: undefined;
  Alertas: undefined;
  IA: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
export type PantallaProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

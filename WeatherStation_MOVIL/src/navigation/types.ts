import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Rutas de la app. En el MVP: vista pública + login.
// US2+ añadirán EstacionDetalle, Graficas, AsistenteIA, etc.
export type RootStackParamList = {
  Publico: undefined;
  Login: undefined;
};

export type PantallaProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

import {
  Thermometer, Droplets, Gauge, Wind, CloudRain, Compass, CloudSun, RadioTower,
  AlertTriangle, Bot, LineChart, Bluetooth, RefreshCw, PlusCircle, Puzzle, Lock,
  AlertCircle, type LucideIcon,
} from 'lucide-react-native';

// Iconos vectoriales (SVG vía react-native-svg). A diferencia de @expo/vector-icons,
// NO dependen de cargar una fuente en runtime, por lo que se ven siempre en release.
const MAPA = {
  thermometer: Thermometer,
  'water-percent': Droplets,
  gauge: Gauge,
  'weather-windy': Wind,
  'weather-pouring': CloudRain,
  'compass-outline': Compass,
  'weather-partly-cloudy': CloudSun,
  'radio-tower': RadioTower,
  alert: AlertTriangle,
  'robot-outline': Bot,
  'chart-line': LineChart,
  bluetooth: Bluetooth,
  refresh: RefreshCw,
  'plus-circle-outline': PlusCircle,
  'puzzle-outline': Puzzle,
  lock: Lock,
  'alert-circle-outline': AlertCircle,
} satisfies Record<string, LucideIcon>;

export type NombreIcono = keyof typeof MAPA;

export function Icono({ nombre, size = 22, color, strokeWidth = 2 }: {
  nombre: NombreIcono; size?: number; color?: string; strokeWidth?: number;
}) {
  const Ico = MAPA[nombre];
  return <Ico size={size} color={color} strokeWidth={strokeWidth} />;
}

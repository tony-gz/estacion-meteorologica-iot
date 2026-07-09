import type { ComponentType } from 'react';
import {
  Thermometer, Droplets, Wind, Gauge, Compass, CloudRain, RadioTower,
  CloudSun, Sun, Moon, CloudLightning, AlertTriangle, Trash2, Check,
} from 'lucide-react';

type IconProps = { size?: number; className?: string; strokeWidth?: number };

// Mapa símbolo → icono lucide. Permite sustituir los emojis por iconos vectoriales
// sin tocar cada punto de uso (la clave sigue siendo el mismo string que ya se pasaba).
const MAPA: Record<string, ComponentType<IconProps>> = {
  '🌡️': Thermometer,
  '💧': Droplets,
  '💨': Wind,
  '📊': Gauge,
  '🧭': Compass,
  '🌧️': CloudRain,
  '📡': RadioTower,
  '🌤️': CloudSun,
  '☀️': Sun,
  '🌙': Moon,
  '⛈️': CloudLightning,
  '⚠': AlertTriangle,
  '⚠️': AlertTriangle,
  '🗑': Trash2,
  '✓': Check,
};

/** Renderiza un icono lucide a partir del símbolo/emoji que antes se usaba. */
export function Icono({ nombre, size = 20, className, strokeWidth = 2 }: {
  nombre: string; size?: number; className?: string; strokeWidth?: number;
}) {
  const Ico = MAPA[nombre];
  if (!Ico) return null;
  return <Ico size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}

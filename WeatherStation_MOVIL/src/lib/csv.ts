import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Lectura } from './types';

// Mismas columnas que exporta la Web (WeatherStation_Front/src/lib/csv.ts).
const COLUMNAS = [
  'Fecha', 'Hora', 'Temperatura_C', 'Humedad_%', 'Presion_hPa',
  'Viento_kmh', 'Direccion_grados', 'Direccion', 'Lluvia_mm',
];

function num(n: number | null | undefined, dec: number): string {
  return n === null || n === undefined || Number.isNaN(n) ? '' : n.toFixed(dec);
}

/**
 * Genera el histórico como CSV (UTF-8 con BOM para Excel), lo escribe en la caché y
 * abre la hoja de compartir del sistema para guardarlo/enviarlo. Equivale al
 * "Descargar CSV" de la Web, adaptado a móvil (no hay descarga directa).
 */
export async function compartirHistorialCsv(
  nombreEstacion: string,
  etiquetaRango: string,
  lecturas: Lectura[],
): Promise<void> {
  const filas = lecturas.map((r) => {
    const t = new Date(r.timestamp);
    return [
      t.toLocaleDateString('es-MX'),
      t.toLocaleTimeString('es-MX'),
      num(r.temperatura, 2),
      num(r.humedad, 1),
      num(r.presion, 2),
      num(r.vientoKmh, 2),
      num(r.vientoGrados, 1),
      r.vientoDir ?? '',
      num(r.lluviaMm, 2),
    ].join(',');
  });

  const csv = '﻿' + [COLUMNAS.join(','), ...filas].join('\n');
  const fecha = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `${nombreEstacion.replace(/\s+/g, '_')}_${etiquetaRango}_${fecha}.csv`;
  const uri = `${FileSystem.cacheDirectory}${nombreArchivo}`;

  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar histórico',
    UTI: 'public.comma-separated-values-text',
  });
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/weather_provider.dart';
import '../theme/app_theme.dart';

/// Pantalla que muestra gráficas históricas de los datos meteorológicos.
///
/// Presenta gráficos de líneas para temperatura, humedad, presión
/// y velocidad del viento con diferentes rangos de tiempo (6h, 24h, 3d, 7d).
class ChartsScreen extends StatelessWidget {
  const ChartsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final wp = context.watch<WeatherProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Gráficas históricas')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [6, 24, 72, 168].map((h) {
                final label = h == 6
                    ? '6h'
                    : h == 24
                    ? '24h'
                    : h == 72
                    ? '3d'
                    : '7d';
                final activo = wp.horasRango == h;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: OutlinedButton(
                    onPressed: () => wp.cargarHistorial(h),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: activo
                          ? AppTheme.accent
                          : AppTheme.muted,
                      side: BorderSide(
                        color: activo
                            ? AppTheme.accent
                            : AppTheme.muted.withOpacity(0.3),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      label,
                      style: GoogleFonts.spaceMono(fontSize: 11),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: wp.cargandoHistorial
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _GraficaCard(
                        titulo: 'Temperatura (°C)',
                        datos: wp.historial.map((d) => d.temperatura).toList(),
                        timestamps: wp.historial
                            .map((d) => d.timestamp)
                            .toList(),
                        color: AppTheme.warm,
                      ),
                      const SizedBox(height: 16),
                      _GraficaCard(
                        titulo: 'Humedad (%)',
                        datos: wp.historial.map((d) => d.humedad).toList(),
                        timestamps: wp.historial
                            .map((d) => d.timestamp)
                            .toList(),
                        color: AppTheme.accent,
                      ),
                      const SizedBox(height: 16),
                      _GraficaCard(
                        titulo: 'Presión (hPa)',
                        datos: wp.historial.map((d) => d.presion).toList(),
                        timestamps: wp.historial
                            .map((d) => d.timestamp)
                            .toList(),
                        color: const Color(0xFF818CF8),
                      ),
                      const SizedBox(height: 16),
                      _GraficaCard(
                        titulo: 'Viento (km/h)',
                        datos: wp.historial.map((d) => d.vientoKmh).toList(),
                        timestamps: wp.historial
                            .map((d) => d.timestamp)
                            .toList(),
                        color: AppTheme.wind,
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _GraficaCard extends StatelessWidget {
  final String titulo;
  final List<double> datos;
  final List<DateTime> timestamps;
  final Color color;

  const _GraficaCard({
    required this.titulo,
    required this.datos,
    required this.timestamps,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final spots = List.generate(
      datos.length,
      (i) => FlSpot(i.toDouble(), datos[i]),
    );
    final fmt = DateFormat('HH:mm');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bg2,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo.toUpperCase(),
            style: GoogleFonts.spaceMono(
              fontSize: 10,
              letterSpacing: 0.1,
              color: AppTheme.muted,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 160,
            child: datos.isEmpty
                ? Center(
                    child: Text(
                      'Sin datos',
                      style: TextStyle(color: AppTheme.muted),
                    ),
                  )
                : LineChart(
                    LineChartData(
                      gridData: FlGridData(
                        show: true,
                        getDrawingHorizontalLine: (_) => FlLine(
                          color: Colors.white.withOpacity(0.04),
                          strokeWidth: 1,
                        ),
                        getDrawingVerticalLine: (_) => FlLine(
                          color: Colors.white.withOpacity(0.04),
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 36,
                            getTitlesWidget: (v, _) => Text(
                              v.toStringAsFixed(0),
                              style: GoogleFonts.spaceMono(
                                fontSize: 9,
                                color: AppTheme.muted,
                              ),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 22,
                            interval: (datos.length / 4).ceilToDouble(),
                            getTitlesWidget: (v, _) {
                              final i = v.toInt();
                              if (i < 0 || i >= timestamps.length)
                                return const SizedBox();
                              return Text(
                                fmt.format(timestamps[i]),
                                style: GoogleFonts.spaceMono(
                                  fontSize: 9,
                                  color: AppTheme.muted,
                                ),
                              );
                            },
                          ),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          spots: spots,
                          isCurved: true,
                          color: color,
                          barWidth: 2,
                          dotData: const FlDotData(show: false),
                          belowBarData: BarAreaData(
                            show: true,
                            color: color.withOpacity(0.08),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

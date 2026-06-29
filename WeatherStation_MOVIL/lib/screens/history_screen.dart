import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../providers/weather_provider.dart';
import '../theme/app_theme.dart';

/// Pantalla que muestra el historial de lecturas en formato tabular.
///
/// Presenta una lista de registros con temperatura, humedad, velocidad
/// del viento y dirección, ordenados del más reciente al más antiguo.
class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final wp = context.watch<WeatherProvider>();
    final fmt = DateFormat('dd/MM HH:mm');

    return Scaffold(
      appBar: AppBar(title: const Text('Registros')),
      body: wp.cargandoHistorial
          ? const Center(child: CircularProgressIndicator())
          : wp.historial.isEmpty
          ? Center(
              child: Text(
                'Sin registros',
                style: TextStyle(color: AppTheme.muted),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: wp.historial.reversed.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final d = wp.historial.reversed.toList()[i];
                final tColor = AppTheme.tempColor(d.temperatura);
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.bg2,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 72,
                        child: Text(
                          fmt.format(d.timestamp),
                          style: GoogleFonts.spaceMono(
                            fontSize: 10,
                            color: AppTheme.muted,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _chip('${d.temperatura.toStringAsFixed(1)}°C', tColor),
                      const SizedBox(width: 6),
                      _chip(
                        '${d.humedad.toStringAsFixed(0)}%',
                        AppTheme.accent,
                      ),
                      const SizedBox(width: 6),
                      _chip(
                        '${d.vientoKmh.toStringAsFixed(1)} km/h',
                        AppTheme.wind,
                      ),
                      const Spacer(),
                      Text(
                        d.vientoDir,
                        style: GoogleFonts.spaceMono(
                          fontSize: 11,
                          color: AppTheme.muted,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _chip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: GoogleFonts.spaceMono(fontSize: 10, color: color),
      ),
    );
  }
}

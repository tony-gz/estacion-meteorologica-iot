import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:weather_station/screens/wifi_config_screen.dart';
import '../providers/weather_provider.dart';
import '../models/weather_data.dart';
import '../theme/app_theme.dart';
import '../widgets/sensor_card.dart';
import '../widgets/frase_card.dart';
import '../widgets/alert_banner.dart';
import 'charts_screen.dart';
import 'history_screen.dart';

/// Pantalla principal que muestra los datos actuales del clima.
///
/// Incluye un selector de estación en el AppBar para cambiar entre
/// las distintas estaciones registradas en Firebase.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  // ── Abre el bottom sheet para seleccionar estación ──
  void _mostrarSelectorEstacion(BuildContext context, WeatherProvider wp) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: Text(
                  'Seleccionar estación',
                  style: GoogleFonts.spaceMono(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Divider(height: 1),
              ...wp.estaciones.map((estacion) {
                final seleccionada =
                    wp.estacionSeleccionada?.id == estacion.id;
                return ListTile(
                  leading: Icon(
                    Icons.sensors,
                    color: seleccionada ? AppTheme.accent : AppTheme.muted,
                  ),
                  title: Text(estacion.nombre),
                  subtitle: Text(estacion.ubicacion),
                  trailing: seleccionada
                      ? Icon(Icons.check_circle, color: AppTheme.accent)
                      : null,
                  onTap: () {
                    Navigator.pop(context);
                    wp.seleccionarEstacion(estacion);
                  },
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final wp = context.watch<WeatherProvider>();
    final d = wp.actual;
    final fmt = DateFormat('dd/MM/yyyy HH:mm', 'es_MX');
    final estacion = wp.estacionSeleccionada;

    return Scaffold(
      appBar: AppBar(
        // ── Nombre de la estación activa como título interactivo ──
        title: GestureDetector(
          onTap: () => _mostrarSelectorEstacion(context, wp),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  estacion?.nombre ?? 'Estación Meteorológica',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (wp.estaciones.length > 1) ...[
                const SizedBox(width: 4),
                Icon(Icons.arrow_drop_down, color: AppTheme.muted, size: 20),
              ],
            ],
          ),
        ),
        actions: [
          // ── Botón selector si hay más de una estación ──
          if (wp.estaciones.length > 1)
            IconButton(
              icon: const Icon(Icons.sensors),
              tooltip: 'Cambiar estación',
              onPressed: () => _mostrarSelectorEstacion(context, wp),
              color: AppTheme.muted,
            ),
          IconButton(
            icon: Icon(wp.modoOscuro ? Icons.light_mode : Icons.dark_mode),
            onPressed: wp.toggleModo,
            color: AppTheme.muted,
          ),
          IconButton(
            icon: const Icon(Icons.bar_chart),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ChartsScreen()),
            ),
            color: AppTheme.muted,
          ),
          IconButton(
            icon: const Icon(Icons.table_rows),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HistoryScreen()),
            ),
            color: AppTheme.muted,
          ),
          IconButton(
            icon: const Icon(Icons.wifi_tethering),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => WifiConfigScreen(
                  estacionId: wp.estacionSeleccionada?.id,
                ),
              ),
            ),
            color: AppTheme.muted,
          ),
        ],
      ),
      body: estacion == null
      // Sin estaciones registradas todavía
          ? const Center(child: CircularProgressIndicator())
          : d == null
      // Estación seleccionada pero sin datos aún
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
        onRefresh: () => wp.cargarHistorial(wp.horasRango),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AlertBanner(alertas: wp.alertas),
              if (wp.alertas.isNotEmpty) const SizedBox(height: 12),

              FraseCard(
                icono: wp.frase['icono']!,
                texto: wp.frase['texto']!,
              ),
              const SizedBox(height: 20),

              // ── Ubicación y timestamp ──
              Text(
                estacion.ubicacion.toUpperCase(),
                style: GoogleFonts.spaceMono(
                  fontSize: 10,
                  letterSpacing: 0.15,
                  color: AppTheme.muted,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                fmt.format(d.timestamp),
                style: GoogleFonts.spaceMono(
                  fontSize: 11,
                  color: AppTheme.muted,
                ),
              ),
              const SizedBox(height: 16),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  SensorCard(
                    label: 'Temperatura',
                    valor: d.temperatura.toStringAsFixed(1),
                    unidad: '°C',
                    subtitulo: d.temperatura >= 35
                        ? '🔴 Calor extremo'
                        : d.temperatura >= 30
                        ? '🟠 Calor'
                        : d.temperatura < 15
                        ? '🔵 Frío'
                        : '🟢 Normal',
                    accentColor: AppTheme.tempColor(d.temperatura),
                  ),
                  SensorCard(
                    label: 'Humedad',
                    valor: d.humedad.toStringAsFixed(0),
                    unidad: '%',
                    subtitulo:
                    d.humedad > 80 ? 'Muy húmedo' : 'Normal',
                    accentColor: AppTheme.accent,
                  ),
                  SensorCard(
                    label: 'Presión',
                    valor: d.presion.toStringAsFixed(1),
                    unidad: 'hPa',
                    accentColor: const Color(0xFF818CF8),
                  ),
                  SensorCard(
                    label: 'Viento',
                    valor: d.vientoKmh.toStringAsFixed(1),
                    unidad: 'km/h',
                    subtitulo: d.vientoKmh > 30
                        ? '⚠️ Viento fuerte'
                        : 'Normal',
                    accentColor: AppTheme.wind,
                  ),
                  SensorCard(
                    label: 'Dirección',
                    valor: d.vientoDir,
                    unidad: '',
                    subtitulo:
                    '${d.vientoGrados.toStringAsFixed(0)}°',
                    accentColor: AppTheme.wind,
                  ),
                  SensorCard(
                    label: 'Lluvia',
                    valor: d.lluviaMm.toStringAsFixed(1),
                    unidad: 'mm',
                    subtitulo:
                    d.lluviaMm > 0 ? 'Lloviendo' : 'Sin lluvia',
                    accentColor: AppTheme.rain,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

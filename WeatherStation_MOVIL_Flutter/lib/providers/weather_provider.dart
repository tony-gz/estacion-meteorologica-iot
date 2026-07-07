import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/weather_data.dart';
import '../services/firebase_service.dart';

/// Proveedor central de estado para la aplicación de estación meteorológica.
///
/// Gestiona la lista de estaciones disponibles, la estación actualmente
/// seleccionada, los datos en tiempo real, el historial de lecturas,
/// la preferencia de tema oscuro/claro y genera alertas y frases informativas.
class WeatherProvider extends ChangeNotifier {
  // ──────────────────────────────────────────
  //  Estaciones
  // ──────────────────────────────────────────
  List<StationInfo> estaciones = [];
  StationInfo? estacionSeleccionada;
  StreamSubscription? _subEstaciones;
  StreamSubscription? _subActual;

  // ──────────────────────────────────────────
  //  Datos climáticos
  // ──────────────────────────────────────────
  WeatherData? actual;
  List<WeatherData> historial = [];
  bool cargandoHistorial = false;
  int horasRango = 6;

  // ──────────────────────────────────────────
  //  Tema
  // ──────────────────────────────────────────
  bool _modoOscuro = true;
  bool get modoOscuro => _modoOscuro;

  WeatherProvider() {
    _cargarPreferencias();
    _escucharEstaciones();
  }

  @override
  void dispose() {
    _subEstaciones?.cancel();
    _subActual?.cancel();
    super.dispose();
  }

  // ──────────────────────────────────────────
  //  Inicialización
  // ──────────────────────────────────────────

  void _escucharEstaciones() {
    _subEstaciones = FirebaseService.streamEstaciones().listen((lista) async {
      estaciones = lista;

      // Si aún no hay estación seleccionada, intentar restaurar la última o
      // seleccionar la primera disponible.
      if (estacionSeleccionada == null && lista.isNotEmpty) {
        final prefs = await SharedPreferences.getInstance();
        final ultimaId = prefs.getString('estacionId');
        final restaurada = ultimaId != null
            ? lista.firstWhere(
              (e) => e.id == ultimaId,
          orElse: () => lista.first,
        )
            : lista.first;
        seleccionarEstacion(restaurada);
      } else {
        notifyListeners();
      }
    });
  }

  // ──────────────────────────────────────────
  //  Selección de estación
  // ──────────────────────────────────────────

  /// Cambia la estación activa y reinicia los streams/historial.
  Future<void> seleccionarEstacion(StationInfo estacion) async {
    estacionSeleccionada = estacion;
    actual = null;
    historial = [];
    notifyListeners();

    // Persistir última estación usada
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('estacionId', estacion.id);

    // Cancelar stream anterior y suscribirse al nuevo
    await _subActual?.cancel();
    _subActual = FirebaseService.streamActual(estacion.id).listen((data) {
      actual = data;
      notifyListeners();
    });

    cargarHistorial(horasRango);
  }

  // ──────────────────────────────────────────
  //  Historial
  // ──────────────────────────────────────────

  Future<void> cargarHistorial(int horas) async {
    if (estacionSeleccionada == null) return;
    horasRango = horas;
    cargandoHistorial = true;
    notifyListeners();
    historial = await FirebaseService.getHistorial(
      estacionSeleccionada!.id,
      horas,
    );
    cargandoHistorial = false;
    notifyListeners();
  }

  // ──────────────────────────────────────────
  //  Tema
  // ──────────────────────────────────────────

  Future<void> _cargarPreferencias() async {
    final prefs = await SharedPreferences.getInstance();
    _modoOscuro = prefs.getBool('modoOscuro') ?? true;
    notifyListeners();
  }

  Future<void> toggleModo() async {
    _modoOscuro = !_modoOscuro;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('modoOscuro', _modoOscuro);
    notifyListeners();
  }

  // ──────────────────────────────────────────
  //  Lógica de frases y alertas
  // ──────────────────────────────────────────

  /// Genera una frase descriptiva del estado del clima actual.
  Map<String, String> get frase {
    if (actual == null) return {'icono': '🌡️', 'texto': 'Cargando...'};
    final d = actual!;
    String icono = '🌤️';
    final List<String> frases = [];

    if (d.lluviaMm > 0) {
      frases.add('Está lloviendo. ¡No olvides tu paraguas!');
      icono = '🌧️';
    }
    if (d.temperatura >= 35) {
      frases.add('Calor extremo. Hidrátate y evita el sol directo.');
      icono = '🥵';
    } else if (d.temperatura >= 30) {
      frases.add('Hace calor. Lleva agua contigo.');
      icono = '☀️';
    } else if (d.temperatura < 15) {
      frases.add('Está haciendo frío. Abrígate antes de salir.');
      icono = '🧥';
    } else {
      frases.add('Temperatura agradable en ${estacionSeleccionada?.ubicacion ?? 'la estación'}.');
      icono = '😊';
    }
    if (d.humedad > 80) frases.add('Alta humedad, puede sentirse más caluroso.');
    if (d.vientoKmh > 30) {
      frases.add('Viento fuerte. Cuidado en moto o bicicleta.');
      icono = d.lluviaMm > 0 ? '⛈️' : '💨';
    }

    return {'icono': icono, 'texto': frases.join(' · ')};
  }

  /// Genera una lista de alertas activas basadas en condiciones climáticas extremas.
  List<String> get alertas {
    if (actual == null) return [];
    final d = actual!;
    final List<String> lista = [];
    if (d.temperatura >= 35)
      lista.add('⚠️ Calor extremo: ${d.temperatura.toStringAsFixed(1)}°C');
    if (d.temperatura < 15)
      lista.add('🥶 Temperatura baja: ${d.temperatura.toStringAsFixed(1)}°C');
    if (d.vientoKmh > 30)
      lista.add('💨 Viento fuerte: ${d.vientoKmh.toStringAsFixed(1)} km/h');
    if (d.lluviaMm > 5)
      lista.add('🌧️ Lluvia intensa: ${d.lluviaMm.toStringAsFixed(1)} mm');
    if (d.humedad > 80)
      lista.add('💧 Humedad alta: ${d.humedad.toStringAsFixed(0)}%');
    return lista;
  }
}

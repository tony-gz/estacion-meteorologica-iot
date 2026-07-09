import 'package:firebase_database/firebase_database.dart';
import '../models/weather_data.dart';

/// Servicio para interactuar con Firebase Realtime Database.
///
/// Soporta múltiples estaciones. Las rutas siguen el esquema del ESP32:
///   /{estacionId}/actual        → dato en tiempo real
///   /{estacionId}/historial/    → historial de lecturas
///   /registro/{estacionId}      → metadata de la estación
class FirebaseService {
  static final _db = FirebaseDatabase.instance;

  // ──────────────────────────────────────────
  //  Estaciones registradas
  // ──────────────────────────────────────────

  /// Escucha en tiempo real el nodo /registro y devuelve la lista
  /// de estaciones activas cada vez que cambia.
  static Stream<List<StationInfo>> streamEstaciones() {
    return _db.ref('registro').onValue.map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = data as Map;
      return map.entries
          .map((e) => StationInfo.fromMap(e.key as String, e.value as Map))
          .toList()
        ..sort((a, b) => a.nombre.compareTo(b.nombre));
    });
  }

  // ──────────────────────────────────────────
  //  Datos actuales de una estación
  // ──────────────────────────────────────────

  /// Stream que emite los datos actuales del clima de la estación [estacionId]
  /// cada vez que se actualiza en Firebase.
  static Stream<WeatherData?> streamActual(String estacionId) {
    return _db.ref('$estacionId/actual').onValue.map((event) {
      final data = event.snapshot.value;
      if (data == null) return null;
      return WeatherData.fromMap(data as Map);
    });
  }

  // ──────────────────────────────────────────
  //  Historial de una estación
  // ──────────────────────────────────────────

  /// Obtiene el historial de lecturas de la estación [estacionId]
  /// filtrado por las últimas [horas] horas.
  ///
  /// Las lecturas se ordenan cronológicamente de más antigua a más reciente.
  static Future<List<WeatherData>> getHistorial(
      String estacionId,
      int horas,
      ) async {
    final limite = (horas * 6) + 10;
    final snap = await _db
        .ref('$estacionId/historial')
        .orderByKey()
        .limitToLast(limite)
        .get();

    if (!snap.exists) return [];

    final corte = DateTime.now().subtract(Duration(hours: horas));
    final map = snap.value as Map;

    return map.values
        .map((v) => WeatherData.fromMap(v as Map))
        .where((d) => d.timestamp.isAfter(corte))
        .toList()
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
  }
}

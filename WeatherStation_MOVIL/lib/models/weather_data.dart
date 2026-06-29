/// Modelo que representa el registro de una estación en /registro/{id}
class StationInfo {
  final String id;
  final String nombre;
  final String ubicacion;
  final String firmware;
  final DateTime ultimaVez;

  const StationInfo({
    required this.id,
    required this.nombre,
    required this.ubicacion,
    required this.firmware,
    required this.ultimaVez,
  });

  factory StationInfo.fromMap(String id, Map<dynamic, dynamic> map) {
    return StationInfo(
      id: id,
      nombre: map['nombre'] ?? id,
      ubicacion: map['ubicacion'] ?? '',
      firmware: map['firmware'] ?? '',
      ultimaVez: DateTime.tryParse(map['timestamp'] ?? '') ?? DateTime.now(),
    );
  }
}

/// Modelo de datos para los registros de una estación meteorológica.
///
/// Representa una lectura completa del clima que incluye temperatura,
/// humedad, presión atmosférica, viento y precipitación.
class WeatherData {
  /// Temperatura actual en grados Celsius.
  final double temperatura;

  /// Humedad relativa en porcentaje (0-100).
  final double humedad;

  /// Presión atmosférica en hectopascales (hPa).
  final double presion;

  /// Velocidad del viento en kilómetros por hora.
  final double vientoKmh;

  /// Dirección del viento como texto (ej: N, NE, E).
  final String vientoDir;

  /// Dirección del viento en grados (0-360).
  final double vientoGrados;

  /// Precipitación acumulada en milímetros.
  final double lluviaMm;

  /// Fecha y hora en que se tomó la lectura.
  final DateTime timestamp;

  const WeatherData({
    required this.temperatura,
    required this.humedad,
    required this.presion,
    required this.vientoKmh,
    required this.vientoDir,
    required this.vientoGrados,
    required this.lluviaMm,
    required this.timestamp,
  });

  /// Crea una instancia de [WeatherData] a partir de un mapa de datos de Firebase.
  factory WeatherData.fromMap(Map<dynamic, dynamic> map) {
    return WeatherData(
      temperatura: (map['temperatura'] ?? 0).toDouble(),
      humedad: (map['humedad'] ?? 0).toDouble(),
      presion: (map['presion'] ?? 0).toDouble(),
      vientoKmh: (map['viento_kmh'] ?? 0).toDouble(),
      vientoDir: map['viento_dir'] ?? '--',
      vientoGrados: (map['viento_grados'] ?? 0).toDouble(),
      lluviaMm: (map['lluvia_mm'] ?? 0).toDouble(),
      timestamp: DateTime.tryParse(map['timestamp'] ?? '') ?? DateTime.now(),
    );
  }
}

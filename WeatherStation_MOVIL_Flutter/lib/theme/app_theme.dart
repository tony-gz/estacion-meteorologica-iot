import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Define los colores y temas visuales de la aplicación.
///
/// Proporciona paletas de colores consistentes para el modo claro
/// y oscuro, además de funciones auxiliares para obtener colores
/// según condiciones climáticas.
class AppTheme {
  static const _bg = Color(0xFF0A0E1A);
  static const _bg2 = Color(0xFF111827);
  static const _bg3 = Color(0xFF1A2235);
  static const _accent = Color(0xFF38BDF8);
  static const _warm = Color(0xFFFB923C);
  static const _cold = Color(0xFF60A5FA);
  static const _rain = Color(0xFF34D399);
  static const _wind = Color(0xFFA78BFA);
  static const _danger = Color(0xFFF87171);
  static const _muted = Color(0xFF64748B);

  static Color get accent => _accent;
  static Color get warm => _warm;
  static Color get cold => _cold;
  static Color get rain => _rain;
  static Color get wind => _wind;
  static Color get danger => _danger;
  static Color get muted => _muted;
  static Color get bg2 => _bg2;
  static Color get bg3 => _bg3;

  /// Tema oscuro para la aplicación.
  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: _bg,
      colorScheme: ColorScheme.dark(
        primary: _accent,
        secondary: _wind,
        surface: _bg2,
        error: _danger,
      ),
      textTheme: GoogleFonts.dmSansTextTheme(ThemeData.dark().textTheme),
      cardTheme: CardThemeData(
        color: _bg2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: _bg,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.spaceMono(
          color: _accent,
          fontSize: 13,
          letterSpacing: 0.1,
        ),
      ),
      dividerColor: const Color(0xFF1E293B),
    );
  }

  /// Tema claro para la aplicación.
  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      colorScheme: ColorScheme.light(
        primary: const Color(0xFF0284C7),
        secondary: const Color(0xFF7C3AED),
        surface: Colors.white,
        error: const Color(0xFFDC2626),
      ),
      textTheme: GoogleFonts.dmSansTextTheme(ThemeData.light().textTheme),
      cardTheme: CardThemeData(
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.spaceMono(
          color: const Color(0xFF0284C7),
          fontSize: 13,
          letterSpacing: 0.1,
        ),
      ),
    );
  }

  /// Devuelve un color representativo según la temperatura.
  ///
  /// - >= 35°C: Rojo (calor extremo)
  /// - >= 30°C: Naranja (calor)
  /// - < 15°C: Azul (frío)
  /// - Otro: Verde (normal)
  static Color tempColor(double t) {
    if (t >= 35) return _danger;
    if (t >= 30) return _warm;
    if (t < 15) return _cold;
    return _rain;
  }
}

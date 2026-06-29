import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tarjeta que muestra el valor de un sensor con su etiqueta y unidad.
///
/// Incluye una línea de acento superior con el color especificado
/// y puede mostrar un subtítulo descriptivo opcional.
class SensorCard extends StatelessWidget {
  final String label;
  final String valor;
  final String unidad;
  final String? subtitulo;
  final Color accentColor;

  const SensorCard({
    super.key,
    required this.label,
    required this.valor,
    required this.unidad,
    this.subtitulo,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF111827) : Colors.white;

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 3,
            decoration: BoxDecoration(
              color: accentColor.withOpacity(0.8),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.spaceMono(
                    fontSize: 10,
                    letterSpacing: 0.12,
                    color: const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 10),
                RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: valor,
                        style: GoogleFonts.spaceMono(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      TextSpan(
                        text: ' $unidad',
                        style: GoogleFonts.spaceMono(
                          fontSize: 13,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                if (subtitulo != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    subtitulo!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

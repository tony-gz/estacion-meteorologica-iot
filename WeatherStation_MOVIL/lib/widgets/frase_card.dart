import 'package:flutter/material.dart';

/// Widget que muestra una frase informativa con un emoji representativo.
///
/// Proporciona consejos útiles al usuario basados en las condiciones
/// climáticas actuales (ej:提醒 sobre lluvia, calor, frío).
class FraseCard extends StatelessWidget {
  final String icono;
  final String texto;

  const FraseCard({super.key, required this.icono, required this.texto});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Row(
        children: [
          Text(icono, style: const TextStyle(fontSize: 30)),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              texto,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w300,
                height: 1.5,
                color: isDark ? Colors.white70 : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

/// Widget que muestra un banner con alertas activas de condiciones climáticas extremas.
///
/// Se muestra únicamente cuando hay alertas activas (calor extremo, frío,
/// viento fuerte, lluvia intensa o alta humedad).
class AlertBanner extends StatelessWidget {
  final List<String> alertas;
  const AlertBanner({super.key, required this.alertas});

  @override
  Widget build(BuildContext context) {
    if (alertas.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF87171).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF87171).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Alertas activas',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Color(0xFFF87171),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          ...alertas.map(
            (a) => Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                a,
                style: const TextStyle(fontSize: 13, color: Color(0xFFFCA5A5)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

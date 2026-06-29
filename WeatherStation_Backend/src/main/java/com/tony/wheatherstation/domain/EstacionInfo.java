package com.tony.wheatherstation.domain;

import java.time.Instant;

/**
 * Metadata de una estación (dominio). Origen: Firebase {@code /registro/{id}}.
 * {@code ultimaConexion} se mapea desde {@code ultima_conexion} (con fallback a
 * {@code timestamp}, por compatibilidad con el cliente — research.md R2).
 */
public record EstacionInfo(
        String id,
        String nombre,
        String ubicacion,
        String firmware,
        String ip,
        Instant ultimaConexion
) {
}

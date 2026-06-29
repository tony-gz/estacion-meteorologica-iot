package com.tony.wheatherstation.dto.escuela;

import java.time.Instant;
import java.util.UUID;

/** Representación pública de una escuela. */
public record EscuelaResponse(
        UUID id,
        String nombre,
        String clave,
        String municipio,
        String ubicacion,
        Double latitud,
        Double longitud,
        String director,
        String contactoEmail,
        long totalEstaciones,
        Instant createdAt
) {
}

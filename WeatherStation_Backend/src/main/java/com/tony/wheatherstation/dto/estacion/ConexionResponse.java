package com.tony.wheatherstation.dto.estacion;

import java.time.Instant;

/** Una entrada del historial de conexiones de una estación. */
public record ConexionResponse(
        Instant timestamp,
        String ip,
        String firmware,
        String evento,
        String detalle
) {
}

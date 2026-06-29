package com.tony.wheatherstation.dto.estacion;

import java.time.Instant;

/** Lectura meteorológica expuesta al cliente. */
public record LecturaResponse(
        Instant timestamp,
        double temperatura,
        double humedad,
        double presion,
        double vientoKmh,
        String vientoDir,
        Double vientoGrados,
        double lluviaMm
) {
}

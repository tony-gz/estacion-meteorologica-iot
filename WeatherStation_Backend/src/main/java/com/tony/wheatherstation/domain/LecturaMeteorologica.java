package com.tony.wheatherstation.domain;

import java.time.Instant;

/**
 * Lectura meteorológica puntual (dominio). Origen: Firebase {@code /{id}/actual}
 * o {@code /{id}/historial/{ts}}. {@code vientoGrados} solo está presente en
 * {@code /actual} (en el historial es null). No se persiste en PostgreSQL.
 */
public record LecturaMeteorologica(
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

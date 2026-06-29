package com.tony.wheatherstation.dto.publico;

import java.time.Instant;

/** Estadísticas agregadas públicas (no sensibles) de un ámbito (red/municipio/escuela). */
public record PublicEstadisticaResponse(
        String ambito,
        Instant desde,
        Instant hasta,
        int estaciones,
        int muestras,
        Agregado temperatura,
        Agregado humedad,
        Agregado presion,
        Agregado vientoKmh,
        double lluviaTotalMm
) {
    public record Agregado(double min, double max, double promedio) {
    }
}

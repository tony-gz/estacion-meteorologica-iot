package com.tony.wheatherstation.dto.estacion;

import java.time.Instant;

/** Estadísticas agregadas de una estación en un rango temporal. */
public record EstadisticasResponse(
        String estacionId,
        Instant desde,
        Instant hasta,
        int muestras,
        Agregado temperatura,
        Agregado humedad,
        Agregado presion,
        Agregado vientoKmh,
        double lluviaTotalMm
) {
    /** Mínimo, máximo y promedio de una variable. */
    public record Agregado(double min, double max, double promedio) {
    }
}

package com.tony.wheatherstation.dto.estacion;

import java.time.Instant;
import java.util.List;

/** Estadísticas avanzadas agregadas por periodo (día/mes) y ámbito. */
public record EstadisticaAgrupadaResponse(
        String ambito,
        String agrupacion,
        List<Punto> serie
) {
    public record Punto(
            Instant periodo,
            int muestras,
            double tempProm,
            double tempMin,
            double tempMax,
            double humProm,
            double presProm,
            double vientoProm,
            double lluviaTotal
    ) {
    }
}

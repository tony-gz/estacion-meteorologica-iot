package com.tony.wheatherstation.dto.ia;

import java.time.Instant;
import java.util.List;

/** Respuesta de IA, fundamentada en los datos de la estación. */
public record IaResponse(
        String estacionId,
        String respuesta,
        Instant rangoDesde,
        Instant rangoHasta,
        int muestrasUsadas,
        List<String> advertencias,
        Instant generadoEn
) {
}

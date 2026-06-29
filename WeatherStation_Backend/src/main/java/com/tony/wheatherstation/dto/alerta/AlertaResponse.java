package com.tony.wheatherstation.dto.alerta;

import com.tony.wheatherstation.entity.EstadoAlerta;
import com.tony.wheatherstation.entity.Severidad;
import com.tony.wheatherstation.entity.TipoAlerta;

import java.time.Instant;
import java.util.UUID;

/** Alerta meteorológica expuesta por la API. */
public record AlertaResponse(
        UUID id,
        String estacionId,
        TipoAlerta tipo,
        Severidad severidad,
        EstadoAlerta estado,
        String mensaje,
        double valorDisparo,
        String variableDisparo,
        Instant detectadaEn,
        Instant resueltaEn
) {
}

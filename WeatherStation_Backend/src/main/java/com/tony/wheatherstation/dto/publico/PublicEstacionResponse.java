package com.tony.wheatherstation.dto.publico;

import com.tony.wheatherstation.dto.estacion.LecturaResponse;
import com.tony.wheatherstation.entity.Conectividad;

import java.util.UUID;

/**
 * Vista pública de una estación (sin cuenta). Solo datos no sensibles: NO incluye
 * estado interno, responsable, token ni metadata administrativa.
 */
public record PublicEstacionResponse(
        UUID uuid,
        String nombre,
        String municipio,
        Double latitud,
        Double longitud,
        String escuelaNombre,
        Conectividad conectividad,
        LecturaResponse ultimaLectura
) {
}

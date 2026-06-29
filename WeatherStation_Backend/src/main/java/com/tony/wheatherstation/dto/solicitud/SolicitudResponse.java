package com.tony.wheatherstation.dto.solicitud;

import com.tony.wheatherstation.entity.EstadoSolicitud;

import java.time.Instant;
import java.util.UUID;

/** Representación de una solicitud de alta de estación. */
public record SolicitudResponse(
        UUID id,
        UUID uuidPropuesto,
        String nombre,
        UUID escuelaId,
        String escuelaNombre,
        String institucion,
        String ubicacion,
        String municipio,
        String firmware,
        EstadoSolicitud estado,
        String motivoRechazo,
        UUID estacionId,
        String solicitanteNombre,
        String solicitanteEmail,
        Instant createdAt,
        Instant resueltaEn
) {
}

package com.tony.wheatherstation.dto.estacion;

import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Actualización de metadata de una estación (campos null = no cambian). */
public record EstacionUpdateRequest(
        @Size(max = 120) String nombre,
        @Size(max = 500) String descripcion,
        @Size(max = 255) String ubicacion,
        @Size(max = 120) String municipio,
        Double latitud,
        Double longitud,
        Double altitud,
        UUID responsableId
) {
}

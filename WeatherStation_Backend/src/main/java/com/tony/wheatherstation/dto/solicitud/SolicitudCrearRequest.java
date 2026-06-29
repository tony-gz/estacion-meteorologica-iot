package com.tony.wheatherstation.dto.solicitud;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Solicitud de token iniciada por un usuario autenticado (POST /solicitudes).
 * A diferencia del registro vía dispositivo, el usuario puede indicar una
 * institución libre en lugar de seleccionar una escuela existente.
 */
public record SolicitudCrearRequest(
        @NotBlank @Size(min = 2, max = 120) String nombre,
        @Size(max = 255) String institucion,
        @Size(max = 255) String ubicacion,
        @Size(max = 120) String municipio,
        Double latitud,
        Double longitud,
        @Size(max = 40) String firmware
) {
}

package com.tony.wheatherstation.dto.escuela;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Alta/edición de una escuela (solo ADMIN). */
public record EscuelaRequest(
        @NotBlank @Size(min = 2, max = 150) String nombre,
        @Size(max = 50) String clave,
        @Size(max = 120) String municipio,
        @Size(max = 255) String ubicacion,
        Double latitud,
        Double longitud,
        @Size(max = 150) String director,
        @Email @Size(max = 150) String contactoEmail
) {
}

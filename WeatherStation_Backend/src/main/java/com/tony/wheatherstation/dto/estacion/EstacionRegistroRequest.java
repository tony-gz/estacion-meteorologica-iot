package com.tony.wheatherstation.dto.estacion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Alta de una estación (POST /estaciones por ADMIN/RESPONSABLE, y base del
 * auto-registro POST /api/device/register). La estación queda en PENDING.
 */
public record EstacionRegistroRequest(
        @NotBlank @Size(min = 2, max = 120) String nombre,
        @NotNull UUID escuelaId,
        @Size(max = 500) String descripcion,
        @Size(max = 255) String ubicacion,
        @Size(max = 120) String municipio,
        Double latitud,
        Double longitud,
        Double altitud,
        @Size(max = 40) String firmware,
        @Size(max = 60) String hardware
) {
}

package com.tony.wheatherstation.dto.estacion;

import jakarta.validation.constraints.Size;

/** Cuerpo opcional de las acciones de gobernanza (rechazar/deshabilitar). */
public record EstacionAccionRequest(
        @Size(max = 300) String motivo
) {
}

package com.tony.wheatherstation.dto.ia;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Pregunta en lenguaje natural sobre una estación. */
public record IaPreguntaRequest(
        @NotBlank String estacionId,
        @NotBlank @Size(max = 500) String pregunta
) {
}

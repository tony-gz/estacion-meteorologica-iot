package com.tony.wheatherstation.dto.ia;

import jakarta.validation.constraints.NotBlank;

/** Solicitud de estimación cualitativa basada en tendencias. */
public record IaPrediccionRequest(
        @NotBlank String estacionId
) {
}

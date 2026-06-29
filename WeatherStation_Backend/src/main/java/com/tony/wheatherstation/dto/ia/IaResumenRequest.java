package com.tony.wheatherstation.dto.ia;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/** Resumen del clima en una ventana temporal (horas, por defecto 24). */
public record IaResumenRequest(
        @NotBlank String estacionId,
        @Min(1) @Max(168) Integer horas
) {
}

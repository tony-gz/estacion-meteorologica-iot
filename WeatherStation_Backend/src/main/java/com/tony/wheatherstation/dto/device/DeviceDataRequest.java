package com.tony.wheatherstation.dto.device;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Lectura publicada por la estación. La validación de formato (campos presentes)
 * da 400; la de rangos/ventana de tiempo (en {@code LecturaValidator}) da 422.
 */
public record DeviceDataRequest(
        @NotNull Instant timestamp,
        @NotNull Double temperatura,
        @NotNull Double humedad,
        @NotNull Double presion,
        @NotNull Double vientoKmh,
        @Size(max = 8) String vientoDir,
        Double vientoGrados,
        @NotNull Double lluviaMm
) {
}

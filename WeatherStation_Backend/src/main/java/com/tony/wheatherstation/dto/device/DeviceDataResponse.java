package com.tony.wheatherstation.dto.device;

import java.time.Instant;

/** Acuse de recepción de una lectura aceptada y persistida. */
public record DeviceDataResponse(
        String estado,
        Instant recibidoEn,
        boolean historialActualizado
) {
}

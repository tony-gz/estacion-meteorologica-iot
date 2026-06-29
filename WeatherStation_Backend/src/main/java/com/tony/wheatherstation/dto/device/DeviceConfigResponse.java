package com.tony.wheatherstation.dto.device;

import java.time.Instant;

/** Configuración remota de la estación (ajustable sin reflashear). */
public record DeviceConfigResponse(
        int intervaloEnvioSeg,
        int muestreoSeg,
        String zonaHoraria,
        Instant servidorAhora
) {
}

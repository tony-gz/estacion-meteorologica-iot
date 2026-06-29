package com.tony.wheatherstation.dto.estacion;

import java.time.Instant;
import java.util.UUID;

/**
 * Respuesta de aprobar/regenerar-token. El {@code token} en claro se muestra UNA
 * sola vez; nunca se vuelve a exponer ni se persiste (invariante de seguridad).
 */
public record StationTokenResponse(
        UUID estacionId,
        UUID uuid,
        String token,
        Instant generadoEn,
        String aviso
) {
}

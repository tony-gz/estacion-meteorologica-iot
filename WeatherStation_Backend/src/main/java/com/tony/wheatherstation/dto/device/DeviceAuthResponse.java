package com.tony.wheatherstation.dto.device;

/** JWT de dispositivo emitido tras el handshake (vida corta). */
public record DeviceAuthResponse(
        String deviceToken,
        String tokenType,
        long expiresIn
) {
}

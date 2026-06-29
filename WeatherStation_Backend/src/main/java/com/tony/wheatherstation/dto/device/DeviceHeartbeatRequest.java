package com.tony.wheatherstation.dto.device;

import jakarta.validation.constraints.Size;

/** Latido de salud. SIN telemetría de batería (requiere hardware adicional). */
public record DeviceHeartbeatRequest(
        @Size(max = 40) String firmware,
        @Size(max = 60) String hardware,
        Integer rssi,
        Long uptimeSeg
) {
}

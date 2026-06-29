package com.tony.wheatherstation.dto.device;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Handshake de la estación: intercambia su token permanente por un JWT corto. */
public record DeviceAuthRequest(
        @NotNull UUID uuid,
        @NotBlank String token,
        @Size(max = 40) String firmware
) {
}

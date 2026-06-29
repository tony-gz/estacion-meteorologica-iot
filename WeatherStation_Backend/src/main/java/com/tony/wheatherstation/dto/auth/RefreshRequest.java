package com.tony.wheatherstation.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Solicitud de renovación de tokens. */
public record RefreshRequest(
        @NotBlank String refreshToken
) {
}

package com.tony.wheatherstation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Credenciales de inicio de sesión. */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}

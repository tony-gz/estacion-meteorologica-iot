package com.tony.wheatherstation.dto.auth;

import com.tony.wheatherstation.dto.usuario.UsuarioResponse;

/** Respuesta de autenticación: access token + refresh token + datos del usuario. */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UsuarioResponse usuario
) {
}

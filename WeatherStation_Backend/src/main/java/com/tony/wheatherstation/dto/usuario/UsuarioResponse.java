package com.tony.wheatherstation.dto.usuario;

import com.tony.wheatherstation.entity.Rol;

import java.time.Instant;
import java.util.UUID;

/** Representación pública de un usuario. NUNCA incluye el passwordHash. */
public record UsuarioResponse(
        UUID id,
        String nombre,
        String email,
        Rol rol,
        UUID escuelaId,
        String escuelaNombre,
        boolean activo,
        Instant createdAt
) {
}

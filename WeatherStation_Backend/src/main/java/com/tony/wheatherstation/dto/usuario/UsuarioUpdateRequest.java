package com.tony.wheatherstation.dto.usuario;

import com.tony.wheatherstation.entity.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Actualización parcial de usuario (campos null = no cambian). */
public record UsuarioUpdateRequest(
        @Size(min = 2, max = 100) String nombre,
        @Email @Size(max = 150) String email,
        Rol rol,
        UUID escuelaId,
        Boolean activo,
        @Size(min = 8, max = 72) String password
) {
}

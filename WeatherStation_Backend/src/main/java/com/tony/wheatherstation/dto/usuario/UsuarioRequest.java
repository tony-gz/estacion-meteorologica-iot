package com.tony.wheatherstation.dto.usuario;

import com.tony.wheatherstation.entity.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Alta de usuario por un ADMIN (con rol explícito). */
public record UsuarioRequest(
        @NotBlank @Size(min = 2, max = 100) String nombre,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull Rol rol,
        /** Obligatorio si {@code rol = RESPONSABLE} (se valida en el servicio). */
        UUID escuelaId
) {
}

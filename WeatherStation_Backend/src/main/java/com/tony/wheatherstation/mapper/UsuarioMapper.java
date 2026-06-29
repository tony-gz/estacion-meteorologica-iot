package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.dto.usuario.UsuarioResponse;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Usuario;
import org.springframework.stereotype.Component;

/** Conversión Usuario (entidad) → UsuarioResponse (DTO), sin campos sensibles. */
@Component
public class UsuarioMapper {

    public UsuarioResponse toResponse(Usuario u) {
        Escuela escuela = u.getEscuela();
        return new UsuarioResponse(
                u.getId(),
                u.getNombre(),
                u.getEmail(),
                u.getRol(),
                escuela != null ? escuela.getId() : null,
                escuela != null ? escuela.getNombre() : null,
                u.isActivo(),
                u.getCreatedAt());
    }
}

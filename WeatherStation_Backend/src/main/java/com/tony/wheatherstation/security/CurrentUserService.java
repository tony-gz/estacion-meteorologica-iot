package com.tony.wheatherstation.security;

import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resuelve el {@link Usuario} autenticado a partir del contexto de seguridad
 * (el principal es el email, fijado por {@link JwtAuthenticationFilter}). Se usa
 * para la autorización por propiedad (un RESPONSABLE solo gestiona su escuela).
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public Usuario actual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new IllegalStateException("No hay usuario autenticado en el contexto");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new IllegalStateException(
                        "Usuario autenticado no encontrado: " + auth.getName()));
    }
}

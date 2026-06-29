package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.common.PageResponse;
import com.tony.wheatherstation.dto.usuario.UsuarioRequest;
import com.tony.wheatherstation.dto.usuario.UsuarioResponse;
import com.tony.wheatherstation.dto.usuario.UsuarioUpdateRequest;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.exception.BusinessException;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.mapper.UsuarioMapper;
import com.tony.wheatherstation.repository.EscuelaRepository;
import com.tony.wheatherstation.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Gestión de usuarios (US6, solo ADMIN). */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final EscuelaRepository escuelaRepository;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioMapper usuarioMapper;

    @Transactional(readOnly = true)
    public PageResponse<UsuarioResponse> listar(int page, int size) {
        Page<Usuario> pagina = usuarioRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(pagina, usuarioMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtener(UUID id) {
        return usuarioMapper.toResponse(buscar(id));
    }

    @Transactional
    public UsuarioResponse crear(UsuarioRequest req) {
        if (usuarioRepository.existsByEmail(req.email())) {
            throw emailDuplicado();
        }
        Escuela escuela = resolverEscuela(req.escuelaId());
        validarEscuelaSegunRol(req.rol(), escuela);
        Usuario usuario = Usuario.builder()
                .nombre(req.nombre())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .rol(req.rol())
                .escuela(escuela)
                .activo(true)
                .build();
        return usuarioMapper.toResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    public UsuarioResponse actualizar(UUID id, UsuarioUpdateRequest req) {
        Usuario usuario = buscar(id);
        if (req.email() != null && !req.email().equalsIgnoreCase(usuario.getEmail())
                && usuarioRepository.existsByEmail(req.email())) {
            throw emailDuplicado();
        }
        if (req.nombre() != null) {
            usuario.setNombre(req.nombre());
        }
        if (req.email() != null) {
            usuario.setEmail(req.email());
        }
        if (req.rol() != null) {
            usuario.setRol(req.rol());
        }
        if (req.escuelaId() != null) {
            usuario.setEscuela(resolverEscuela(req.escuelaId()));
        }
        validarEscuelaSegunRol(usuario.getRol(), usuario.getEscuela());
        if (req.activo() != null) {
            usuario.setActivo(req.activo());
        }
        if (req.password() != null && !req.password().isBlank()) {
            usuario.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        return usuarioMapper.toResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    public void eliminar(UUID id) {
        Usuario usuario = buscar(id);
        usuarioRepository.delete(usuario);
    }

    private Usuario buscar(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("USUARIO_NO_ENCONTRADO",
                        "No existe el usuario " + id));
    }

    private BusinessException emailDuplicado() {
        return new BusinessException("EMAIL_DUPLICADO",
                "Ya existe un usuario con ese email", HttpStatus.CONFLICT);
    }

    /** Carga la escuela indicada (404 si no existe); null si no se indica. */
    private Escuela resolverEscuela(UUID escuelaId) {
        if (escuelaId == null) {
            return null;
        }
        return escuelaRepository.findById(escuelaId)
                .orElseThrow(() -> new ResourceNotFoundException("ESCUELA_NO_ENCONTRADA",
                        "No existe la escuela " + escuelaId));
    }

    /** Un RESPONSABLE DEBE estar ligado a una escuela (regla de negocio). */
    private void validarEscuelaSegunRol(Rol rol, Escuela escuela) {
        if (rol == Rol.RESPONSABLE && escuela == null) {
            throw new BusinessException("ESCUELA_REQUERIDA",
                    "Un usuario RESPONSABLE debe estar asociado a una escuela",
                    HttpStatus.BAD_REQUEST);
        }
    }
}

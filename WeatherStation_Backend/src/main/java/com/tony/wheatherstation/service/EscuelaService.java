package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.escuela.EscuelaRequest;
import com.tony.wheatherstation.dto.escuela.EscuelaResponse;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.exception.BusinessException;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.mapper.EscuelaMapper;
import com.tony.wheatherstation.repository.EscuelaRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Gestión de escuelas (US8). Lectura para autenticados; escritura solo ADMIN. */
@Service
@RequiredArgsConstructor
public class EscuelaService {

    private final EscuelaRepository escuelaRepository;
    private final EstacionRepository estacionRepository;
    private final EscuelaMapper escuelaMapper;

    @Transactional(readOnly = true)
    public List<EscuelaResponse> listar() {
        return escuelaRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EscuelaResponse obtener(UUID id) {
        return toResponse(buscar(id));
    }

    @Transactional
    public EscuelaResponse crear(EscuelaRequest req) {
        validarClaveUnica(req.clave(), null);
        Escuela escuela = Escuela.builder()
                .nombre(req.nombre())
                .clave(normalizar(req.clave()))
                .municipio(req.municipio())
                .ubicacion(req.ubicacion())
                .latitud(req.latitud())
                .longitud(req.longitud())
                .director(req.director())
                .contactoEmail(req.contactoEmail())
                .build();
        return toResponse(escuelaRepository.save(escuela));
    }

    @Transactional
    public EscuelaResponse actualizar(UUID id, EscuelaRequest req) {
        Escuela escuela = buscar(id);
        validarClaveUnica(req.clave(), id);
        escuela.setNombre(req.nombre());
        escuela.setClave(normalizar(req.clave()));
        escuela.setMunicipio(req.municipio());
        escuela.setUbicacion(req.ubicacion());
        escuela.setLatitud(req.latitud());
        escuela.setLongitud(req.longitud());
        escuela.setDirector(req.director());
        escuela.setContactoEmail(req.contactoEmail());
        return toResponse(escuelaRepository.save(escuela));
    }

    @Transactional
    public void eliminar(UUID id) {
        Escuela escuela = buscar(id);
        if (estacionRepository.countByEscuelaId(id) > 0) {
            throw new BusinessException("ESCUELA_CON_ESTACIONES",
                    "No se puede eliminar una escuela con estaciones asociadas",
                    HttpStatus.CONFLICT);
        }
        escuelaRepository.delete(escuela);
    }

    private Escuela buscar(UUID id) {
        return escuelaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ESCUELA_NO_ENCONTRADA",
                        "No existe la escuela " + id));
    }

    private void validarClaveUnica(String clave, UUID idActual) {
        String c = normalizar(clave);
        if (c == null) {
            return;
        }
        escuelaRepository.findByClave(c).ifPresent(existente -> {
            if (!existente.getId().equals(idActual)) {
                throw new BusinessException("CLAVE_DUPLICADA",
                        "Ya existe una escuela con esa clave", HttpStatus.CONFLICT);
            }
        });
    }

    private String normalizar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private EscuelaResponse toResponse(Escuela escuela) {
        return escuelaMapper.toResponse(escuela, estacionRepository.countByEscuelaId(escuela.getId()));
    }
}

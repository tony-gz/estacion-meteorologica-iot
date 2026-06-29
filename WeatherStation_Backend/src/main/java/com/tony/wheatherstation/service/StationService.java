package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.estacion.ConexionResponse;
import com.tony.wheatherstation.dto.estacion.EstacionRegistroRequest;
import com.tony.wheatherstation.dto.estacion.EstacionUpdateRequest;
import com.tony.wheatherstation.dto.estacion.StationResponse;
import com.tony.wheatherstation.dto.estacion.StationTokenResponse;
import com.tony.wheatherstation.entity.Conectividad;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.exception.BusinessException;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.mapper.StationMapper;
import com.tony.wheatherstation.repository.ConfiguracionRepository;
import com.tony.wheatherstation.repository.EscuelaRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.repository.UsuarioRepository;
import com.tony.wheatherstation.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Gobernanza de estaciones (US2, principio VIII): registro, máquina de estados
 * (PENDING/APPROVED/REJECTED/DISABLED/MAINTENANCE), tokens y autorización por
 * propiedad (un RESPONSABLE solo gestiona estaciones de su escuela).
 */
@Service
@RequiredArgsConstructor
public class StationService {

    private static final int DEFAULT_OFFLINE_MIN = 10;

    private final EstacionRepository estacionRepository;
    private final EscuelaRepository escuelaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracionRepository configuracionRepository;
    private final StationTokenService stationTokenService;
    private final ConnectionLogService connectionLogService;
    private final CurrentUserService currentUserService;
    private final StationMapper stationMapper;

    // ───────────────────────── alta / edición ──────────────────────────

    @Transactional
    public StationResponse registrar(EstacionRegistroRequest req) {
        Usuario actor = currentUserService.actual();
        Escuela escuela = buscarEscuela(req.escuelaId());
        // Un RESPONSABLE solo puede registrar en SU escuela.
        if (actor.getRol() == Rol.RESPONSABLE) {
            exigirMismaEscuela(actor, escuela.getId());
        }
        Estacion estacion = Estacion.builder()
                .uuid(UUID.randomUUID())
                .nombre(req.nombre())
                .descripcion(req.descripcion())
                .escuela(escuela)
                .responsable(actor.getRol() == Rol.RESPONSABLE ? actor : null)
                .ubicacion(req.ubicacion())
                .municipio(req.municipio())
                .latitud(req.latitud())
                .longitud(req.longitud())
                .altitud(req.altitud())
                .firmware(req.firmware())
                .hardware(req.hardware())
                .estado(EstadoEstacion.PENDING)
                .fechaRegistro(Instant.now())
                .intervaloEnvioSeg(60)
                .muestreoSeg(5)
                .zonaHoraria("America/Mexico_City")
                .build();
        return toResponse(estacionRepository.save(estacion));
    }

    @Transactional
    public StationResponse actualizar(UUID uuid, EstacionUpdateRequest req) {
        Estacion estacion = buscar(uuid);
        autorizarGestion(estacion);
        if (req.nombre() != null) {
            estacion.setNombre(req.nombre());
        }
        if (req.descripcion() != null) {
            estacion.setDescripcion(req.descripcion());
        }
        if (req.ubicacion() != null) {
            estacion.setUbicacion(req.ubicacion());
        }
        if (req.municipio() != null) {
            estacion.setMunicipio(req.municipio());
        }
        if (req.latitud() != null) {
            estacion.setLatitud(req.latitud());
        }
        if (req.longitud() != null) {
            estacion.setLongitud(req.longitud());
        }
        if (req.altitud() != null) {
            estacion.setAltitud(req.altitud());
        }
        if (req.responsableId() != null) {
            estacion.setResponsable(buscarUsuario(req.responsableId()));
        }
        return toResponse(estacionRepository.save(estacion));
    }

    @Transactional
    public void eliminar(UUID uuid) {
        estacionRepository.delete(buscar(uuid));
    }

    // ─────────────────────── máquina de estados (ADMIN) ─────────────────

    @Transactional
    public StationTokenResponse aprobar(UUID uuid) {
        Estacion estacion = buscar(uuid);
        exigirEstado(estacion, EstadoEstacion.PENDING);
        estacion.setEstado(EstadoEstacion.APPROVED);
        estacion.setMotivoRechazo(null);
        estacionRepository.save(estacion);
        return emitirToken(estacion);
    }

    @Transactional
    public StationResponse rechazar(UUID uuid, String motivo) {
        Estacion estacion = buscar(uuid);
        exigirEstado(estacion, EstadoEstacion.PENDING);
        estacion.setEstado(EstadoEstacion.REJECTED);
        estacion.setMotivoRechazo(motivo);
        return toResponse(estacionRepository.save(estacion));
    }

    @Transactional
    public StationResponse deshabilitar(UUID uuid, String motivo) {
        Estacion estacion = buscar(uuid);
        exigirEstado(estacion, EstadoEstacion.APPROVED, EstadoEstacion.MAINTENANCE);
        estacion.setEstado(EstadoEstacion.DISABLED);
        estacion.setMotivoRechazo(motivo);
        return toResponse(estacionRepository.save(estacion));
    }

    @Transactional
    public StationResponse mantenimiento(UUID uuid) {
        Estacion estacion = buscar(uuid);
        exigirEstado(estacion, EstadoEstacion.APPROVED);
        estacion.setEstado(EstadoEstacion.MAINTENANCE);
        return toResponse(estacionRepository.save(estacion));
    }

    @Transactional
    public StationResponse reactivar(UUID uuid) {
        Estacion estacion = buscar(uuid);
        exigirEstado(estacion, EstadoEstacion.DISABLED, EstadoEstacion.MAINTENANCE);
        estacion.setEstado(EstadoEstacion.APPROVED);
        estacion.setMotivoRechazo(null);
        return toResponse(estacionRepository.save(estacion));
    }

    @Transactional
    public StationTokenResponse regenerarToken(UUID uuid) {
        Estacion estacion = buscar(uuid);
        exigirEstado(estacion, EstadoEstacion.APPROVED, EstadoEstacion.DISABLED,
                EstadoEstacion.MAINTENANCE);
        return emitirToken(estacion);
    }

    // ──────────────────────────── conexiones ───────────────────────────

    @Transactional(readOnly = true)
    public List<ConexionResponse> conexiones(UUID uuid, int page, int size) {
        Estacion estacion = buscar(uuid);
        autorizarGestion(estacion);
        return connectionLogService.listar(estacion, page, size);
    }

    // ───────────────────────────── helpers ─────────────────────────────

    private StationTokenResponse emitirToken(Estacion estacion) {
        String enClaro = stationTokenService.generar(estacion);
        return new StationTokenResponse(estacion.getId(), estacion.getUuid(), enClaro,
                Instant.now(), "Guarde este token: no se volverá a mostrar.");
    }

    private Estacion buscar(UUID uuid) {
        return estacionRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("ESTACION_NO_ENCONTRADA",
                        "No existe la estación " + uuid));
    }

    private Escuela buscarEscuela(UUID id) {
        return escuelaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ESCUELA_NO_ENCONTRADA",
                        "No existe la escuela " + id));
    }

    private Usuario buscarUsuario(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("USUARIO_NO_ENCONTRADO",
                        "No existe el usuario " + id));
    }

    /** Un RESPONSABLE solo puede gestionar estaciones de su propia escuela. */
    private void autorizarGestion(Estacion estacion) {
        Usuario actor = currentUserService.actual();
        if (actor.getRol() == Rol.RESPONSABLE) {
            UUID escuelaEstacion = estacion.getEscuela() != null ? estacion.getEscuela().getId() : null;
            exigirMismaEscuela(actor, escuelaEstacion);
        }
    }

    private void exigirMismaEscuela(Usuario actor, UUID escuelaId) {
        UUID propia = actor.getEscuela() != null ? actor.getEscuela().getId() : null;
        if (propia == null || !propia.equals(escuelaId)) {
            throw new AccessDeniedException("La estación no pertenece a tu escuela");
        }
    }

    private void exigirEstado(Estacion estacion, EstadoEstacion... permitidos) {
        if (!Set.of(permitidos).contains(estacion.getEstado())) {
            throw new BusinessException("ESTADO_INVALIDO",
                    "La estación está en estado " + estacion.getEstado()
                            + " y no admite esta operación", HttpStatus.CONFLICT);
        }
    }

    private StationResponse toResponse(Estacion estacion) {
        return stationMapper.toResponse(estacion, conectividad(estacion));
    }

    private Conectividad conectividad(Estacion estacion) {
        Instant uc = estacion.getUltimaConexion();
        if (uc != null && uc.isAfter(Instant.now().minus(Duration.ofMinutes(offlineMinutos())))) {
            return Conectividad.ONLINE;
        }
        return Conectividad.OFFLINE;
    }

    private int offlineMinutos() {
        return configuracionRepository.findById("estacion.offline.minutos")
                .map(c -> {
                    try {
                        return Integer.parseInt(c.getValor().trim());
                    } catch (NumberFormatException ex) {
                        return DEFAULT_OFFLINE_MIN;
                    }
                })
                .orElse(DEFAULT_OFFLINE_MIN);
    }
}

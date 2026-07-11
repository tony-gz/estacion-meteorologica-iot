package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.estacion.EstacionRegistroRequest;
import com.tony.wheatherstation.dto.estacion.StationTokenResponse;
import com.tony.wheatherstation.dto.solicitud.SolicitudCrearRequest;
import com.tony.wheatherstation.dto.solicitud.SolicitudResponse;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.EstadoSolicitud;
import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.SolicitudRegistro;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.exception.BusinessException;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.mapper.SolicitudMapper;
import com.tony.wheatherstation.repository.EscuelaRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.repository.SolicitudRepository;
import com.tony.wheatherstation.repository.UsuarioRepository;
import com.tony.wheatherstation.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Solicitudes de alta de estación. Soporta tres orígenes:
 * <ul>
 *   <li>Dispositivo (POST /api/device/register, {@link #crearDesdeDispositivo})</li>
 *   <li>Usuario autenticado (POST /solicitudes, {@link #crearDesdeUsuario})</li>
 *   <li>ADMIN/RESPONSABLE directo (POST /estaciones)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final EstacionRepository estacionRepository;
    private final EscuelaRepository escuelaRepository;
    private final UsuarioRepository usuarioRepository;
    private final StationTokenService stationTokenService;
    private final CurrentUserService currentUserService;
    private final SolicitudMapper solicitudMapper;
    private final EmailService emailService;

    /**
     * Alta de solicitud iniciada por el dispositivo (POST /api/device/register).
     * Sin solicitante (no autenticado por usuario); queda PENDING hasta que un ADMIN
     * la apruebe. Reusa {@link EstacionRegistroRequest}.
     */
    @Transactional
    public SolicitudResponse crearDesdeDispositivo(EstacionRegistroRequest req) {
        Escuela escuela = escuelaRepository.findById(req.escuelaId())
                .orElseThrow(() -> new ResourceNotFoundException("ESCUELA_NO_ENCONTRADA",
                        "No existe la escuela " + req.escuelaId()));
        SolicitudRegistro solicitud = SolicitudRegistro.builder()
                .uuidPropuesto(UUID.randomUUID())
                .nombre(req.nombre())
                .escuela(escuela)
                .solicitante(null)
                .ubicacion(req.ubicacion())
                .municipio(req.municipio())
                .latitud(req.latitud())
                .longitud(req.longitud())
                .firmware(req.firmware())
                .estado(EstadoSolicitud.PENDING)
                .build();
        return solicitudMapper.toResponse(solicitudRepository.save(solicitud));
    }

    /**
     * Alta de solicitud iniciada por un usuario autenticado desde el frontend.
     * A diferencia del dispositivo, el usuario queda registrado como solicitante
     * y puede indicar una institución libre en lugar de seleccionar escuela.
     */
    @Transactional
    public SolicitudResponse crearDesdeUsuario(SolicitudCrearRequest req) {
        Usuario solicitante = currentUserService.actual();
        SolicitudRegistro solicitud = SolicitudRegistro.builder()
                .uuidPropuesto(UUID.randomUUID())
                .nombre(req.nombre())
                .escuela(null)
                .institucion(req.institucion())
                .solicitante(solicitante)
                .ubicacion(req.ubicacion())
                .municipio(req.municipio())
                .latitud(req.latitud())
                .longitud(req.longitud())
                .firmware(req.firmware())
                .estado(EstadoSolicitud.PENDING)
                .build();
        return solicitudMapper.toResponse(solicitudRepository.save(solicitud));
    }

    /**
     * Solicitudes del usuario actual (rol USUARIO). Ordenadas de la más reciente
     * a la más antigua.
     */
    @Transactional(readOnly = true)
    public List<SolicitudResponse> misSolicitudes() {
        Usuario actor = currentUserService.actual();
        return solicitudRepository
                .findBySolicitanteIdOrderByCreatedAtDesc(actor.getId())
                .stream()
                .map(solicitudMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SolicitudResponse> listar(EstadoSolicitud estado) {
        Usuario actor = currentUserService.actual();
        // Si el actor es USUARIO, solo ve sus propias solicitudes
        if (actor.getRol() == Rol.USUARIO) {
            return misSolicitudes();
        }
        List<SolicitudRegistro> solicitudes;
        if (actor.getRol() == Rol.RESPONSABLE) {
            UUID escuelaId = actor.getEscuela() != null ? actor.getEscuela().getId() : null;
            solicitudes = estado != null
                    ? solicitudRepository.findByEscuelaIdAndEstado(escuelaId, estado)
                    : solicitudRepository.findByEscuelaId(escuelaId);
        } else {
            solicitudes = estado != null
                    ? solicitudRepository.findByEstado(estado)
                    : solicitudRepository.findAll();
        }
        return solicitudes.stream().map(solicitudMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SolicitudResponse obtener(UUID id) {
        SolicitudRegistro solicitud = buscar(id);
        autorizarLectura(solicitud);
        return solicitudMapper.toResponse(solicitud);
    }

    @Transactional
    public StationTokenResponse aprobar(UUID id) {
        SolicitudRegistro solicitud = buscar(id);
        exigirPendiente(solicitud);

        // Si la solicitud no tiene escuela, crear una según la institución indicada
        Escuela escuela = solicitud.getEscuela();
        if (escuela == null) {
            String nombreEscuela = solicitud.getInstitucion();
            if (nombreEscuela == null || nombreEscuela.isBlank()) {
                nombreEscuela = solicitud.getSolicitante() != null
                        ? solicitud.getSolicitante().getNombre()
                        : "Independiente";
            }
            escuela = Escuela.builder()
                    .nombre(nombreEscuela)
                    .build();
            escuela = escuelaRepository.save(escuela);
        }

        Estacion estacion = Estacion.builder()
                .uuid(solicitud.getUuidPropuesto())
                .nombre(solicitud.getNombre())
                .escuela(escuela)
                .responsable(solicitud.getSolicitante())
                .ubicacion(solicitud.getUbicacion())
                .municipio(solicitud.getMunicipio())
                .latitud(solicitud.getLatitud())
                .longitud(solicitud.getLongitud())
                .firmware(solicitud.getFirmware())
                .estado(EstadoEstacion.APPROVED)
                .fechaRegistro(Instant.now())
                .intervaloEnvioSeg(60)
                .muestreoSeg(5)
                .zonaHoraria("America/Mexico_City")
                .build();
        estacion = estacionRepository.save(estacion);

        String token = stationTokenService.generar(estacion);

        solicitud.setEstado(EstadoSolicitud.APPROVED);
        solicitud.setEstacion(estacion);
        solicitud.setResueltaEn(Instant.now());
        solicitud.setResueltaPor(currentUserService.actual());
        solicitudRepository.save(solicitud);

        // Notificar al solicitante por email si existe
        if (solicitud.getSolicitante() != null && solicitud.getSolicitante().getEmail() != null) {
            emailService.enviarToken(
                    solicitud.getSolicitante().getEmail(),
                    estacion.getNombre(),
                    estacion.getUuid(),
                    token);
        }

        // Ascender al solicitante a RESPONSABLE: es el dueño de la estación
        // (responsable = solicitante) y las capacidades de gestión (editar, conexiones,
        // provisioning BLE, ver estaciones no aprobadas) están gated a RESPONSABLE.
        // INVESTIGADOR queda como rol de solo lectura de datos de red (lo asigna un ADMIN).
        // Se liga a la escuela resuelta en la aprobación si aún no tiene una (regla de
        // negocio: un RESPONSABLE debe estar asociado a una escuela).
        Usuario solicitante = solicitud.getSolicitante();
        if (solicitante != null
                && (solicitante.getRol() == Rol.USUARIO
                    || solicitante.getRol() == Rol.INVESTIGADOR)) {
            solicitante.setRol(Rol.RESPONSABLE);
            if (solicitante.getEscuela() == null) {
                solicitante.setEscuela(escuela);
            }
            usuarioRepository.save(solicitante);
        }

        return new StationTokenResponse(estacion.getId(), estacion.getUuid(), token,
                Instant.now(), "Guarde este token: no se volverá a mostrar.");
    }

    @Transactional
    public SolicitudResponse rechazar(UUID id, String motivo) {
        SolicitudRegistro solicitud = buscar(id);
        exigirPendiente(solicitud);
        solicitud.setEstado(EstadoSolicitud.REJECTED);
        solicitud.setMotivoRechazo(motivo);
        solicitud.setResueltaEn(Instant.now());
        solicitud.setResueltaPor(currentUserService.actual());
        SolicitudResponse response = solicitudMapper.toResponse(solicitudRepository.save(solicitud));

        // Notificar al solicitante por email si existe
        if (solicitud.getSolicitante() != null && solicitud.getSolicitante().getEmail() != null) {
            emailService.enviarRechazo(
                    solicitud.getSolicitante().getEmail(),
                    solicitud.getNombre(),
                    motivo);
        }

        return response;
    }

    /**
     * Elimina una solicitud (ADMIN). Solo borra el registro de la solicitud; si ya
     * fue aprobada, la estación creada permanece (su ciclo de vida se gestiona aparte).
     */
    @Transactional
    public void eliminar(UUID id) {
        SolicitudRegistro solicitud = buscar(id);
        solicitudRepository.delete(solicitud);
    }

    private SolicitudRegistro buscar(UUID id) {
        return solicitudRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SOLICITUD_NO_ENCONTRADA",
                        "No existe la solicitud " + id));
    }

    private void autorizarLectura(SolicitudRegistro solicitud) {
        Usuario actor = currentUserService.actual();
        if (actor.getRol() == Rol.USUARIO) {
            // USUARIO solo puede ver sus propias solicitudes
            if (solicitud.getSolicitante() == null
                    || !solicitud.getSolicitante().getId().equals(actor.getId())) {
                throw new AccessDeniedException("No tienes acceso a esta solicitud");
            }
            return;
        }
        if (actor.getRol() == Rol.RESPONSABLE) {
            UUID propia = actor.getEscuela() != null ? actor.getEscuela().getId() : null;
            UUID dela = solicitud.getEscuela() != null ? solicitud.getEscuela().getId() : null;
            if (propia == null || !propia.equals(dela)) {
                throw new AccessDeniedException("La solicitud no pertenece a tu escuela");
            }
        }
    }

    private void exigirPendiente(SolicitudRegistro solicitud) {
        if (solicitud.getEstado() != EstadoSolicitud.PENDING) {
            throw new BusinessException("SOLICITUD_NO_PENDIENTE",
                    "La solicitud ya fue resuelta (" + solicitud.getEstado() + ")",
                    HttpStatus.CONFLICT);
        }
    }
}

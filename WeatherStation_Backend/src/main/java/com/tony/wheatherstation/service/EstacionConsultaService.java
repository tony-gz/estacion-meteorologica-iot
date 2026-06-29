package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.estacion.EstadisticasResponse;
import com.tony.wheatherstation.dto.estacion.LecturaResponse;
import com.tony.wheatherstation.dto.estacion.StationResponse;
import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.entity.Conectividad;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.mapper.LecturaMapper;
import com.tony.wheatherstation.mapper.StationMapper;
import com.tony.wheatherstation.repository.ConfiguracionRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Consulta de estaciones y datos meteorológicos (US2/US5) leyendo de PostgreSQL.
 * Reemplaza al {@code EstacionService} de v1 (Firebase). Aplica visibilidad por
 * rol: APPROVED es visible para todos; los demás estados, solo para ADMIN o el
 * RESPONSABLE de la escuela.
 */
@Service
@RequiredArgsConstructor
public class EstacionConsultaService {

    private static final int DEFAULT_OFFLINE_MIN = 10;

    private final EstacionRepository estacionRepository;
    private final ConfiguracionRepository configuracionRepository;
    private final WeatherDataService weatherDataService;
    private final EstadisticaService estadisticaService;
    private final CurrentUserService currentUserService;
    private final StationMapper stationMapper;
    private final LecturaMapper lecturaMapper;

    @Transactional(readOnly = true)
    public List<StationResponse> listar() {
        Usuario actor = currentUserService.actual();
        return estacionRepository.findAll().stream()
                .filter(e -> esVisible(e, actor))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StationResponse obtener(UUID uuid) {
        return toResponse(buscarVisible(uuid));
    }

    @Transactional(readOnly = true)
    public LecturaResponse obtenerActual(UUID uuid) {
        Estacion estacion = buscarVisible(uuid);
        LecturaMeteorologica actual = weatherDataService.leerActual(estacion)
                .orElseThrow(() -> new ResourceNotFoundException("DATO_ACTUAL_NO_DISPONIBLE",
                        "La estación no tiene datos actuales disponibles"));
        return lecturaMapper.toResponse(actual);
    }

    @Transactional(readOnly = true)
    public List<LecturaResponse> historial(UUID uuid, Instant desde, Instant hasta) {
        return historialDominio(uuid, desde, hasta).stream().map(lecturaMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<LecturaResponse> ultimas24h(UUID uuid) {
        Instant ahora = Instant.now();
        return historial(uuid, ahora.minus(24, ChronoUnit.HOURS), ahora);
    }

    @Transactional(readOnly = true)
    public EstadisticasResponse estadisticas(UUID uuid, Instant desde, Instant hasta) {
        Instant fin = hasta != null ? hasta : Instant.now();
        Instant inicio = desde != null ? desde : fin.minus(24, ChronoUnit.HOURS);
        List<LecturaMeteorologica> lecturas = historialDominio(uuid, inicio, fin);
        return estadisticaService.calcular(uuid.toString(), inicio, fin, lecturas);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private List<LecturaMeteorologica> historialDominio(UUID uuid, Instant desde, Instant hasta) {
        Estacion estacion = buscarVisible(uuid);
        Instant fin = hasta != null ? hasta : Instant.now();
        Instant inicio = desde != null ? desde : fin.minus(24, ChronoUnit.HOURS);
        return weatherDataService.leerHistorial(estacion, inicio, fin);
    }

    /** Resuelve por uuid y aplica visibilidad; si no es visible, 404 (no revela su existencia). */
    private Estacion buscarVisible(UUID uuid) {
        Estacion estacion = estacionRepository.findByUuid(uuid)
                .orElseThrow(this::noEncontrada);
        if (!esVisible(estacion, currentUserService.actual())) {
            throw noEncontrada();
        }
        return estacion;
    }

    private boolean esVisible(Estacion e, Usuario actor) {
        if (e.getEstado() == EstadoEstacion.APPROVED) {
            return true;
        }
        if (actor.getRol() == Rol.ADMIN) {
            return true;
        }
        return actor.getRol() == Rol.RESPONSABLE
                && actor.getEscuela() != null && e.getEscuela() != null
                && actor.getEscuela().getId().equals(e.getEscuela().getId());
    }

    private StationResponse toResponse(Estacion estacion) {
        LecturaResponse ultima = weatherDataService.leerActual(estacion)
                .map(lecturaMapper::toResponse).orElse(null);
        return stationMapper.toResponse(estacion, conectividad(estacion), ultima);
    }

    private Conectividad conectividad(Estacion e) {
        Instant uc = e.getUltimaConexion();
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

    private ResourceNotFoundException noEncontrada() {
        return new ResourceNotFoundException("ESTACION_NO_ENCONTRADA", "No existe la estación");
    }
}

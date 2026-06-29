package com.tony.wheatherstation.service;

import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.dto.publico.PublicEstacionResponse;
import com.tony.wheatherstation.dto.publico.PublicEstadisticaResponse;
import com.tony.wheatherstation.dto.publico.PublicEstadisticaResponse.Agregado;
import com.tony.wheatherstation.entity.Conectividad;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.mapper.LecturaMapper;
import com.tony.wheatherstation.repository.ConfiguracionRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.ToDoubleFunction;

/**
 * Tier público de solo lectura (US9, constitución v3.1.0): solo estaciones APPROVED
 * y datos NO sensibles. Sin IA, sin gestión, sin históricos crudos completos.
 */
@Service
@RequiredArgsConstructor
public class PublicService {

    private static final int DEFAULT_OFFLINE_MIN = 10;

    private final EstacionRepository estacionRepository;
    private final WeatherDataService weatherDataService;
    private final ConfiguracionRepository configuracionRepository;
    private final LecturaMapper lecturaMapper;

    @Transactional(readOnly = true)
    public List<PublicEstacionResponse> estaciones(String municipio) {
        long offlineMin = offlineMinutos();
        return aprobadas(municipio, null).stream()
                .map(e -> toPublic(e, offlineMin))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicEstadisticaResponse estadisticas(String municipio, UUID escuelaId,
                                                  Instant desde, Instant hasta) {
        Instant fin = hasta != null ? hasta : Instant.now();
        Instant inicio = desde != null ? desde : fin.minus(24, ChronoUnit.HOURS);
        List<Estacion> estaciones = aprobadas(municipio, escuelaId);

        List<LecturaMeteorologica> lecturas = new ArrayList<>();
        for (Estacion e : estaciones) {
            lecturas.addAll(weatherDataService.leerHistorial(e, inicio, fin));
        }
        String ambito = ambito(municipio, escuelaId);
        if (lecturas.isEmpty()) {
            return new PublicEstadisticaResponse(ambito, inicio, fin, estaciones.size(), 0,
                    null, null, null, null, 0.0);
        }
        double lluvia = lecturas.stream().mapToDouble(LecturaMeteorologica::lluviaMm).sum();
        return new PublicEstadisticaResponse(ambito, inicio, fin, estaciones.size(), lecturas.size(),
                agregar(lecturas, LecturaMeteorologica::temperatura),
                agregar(lecturas, LecturaMeteorologica::humedad),
                agregar(lecturas, LecturaMeteorologica::presion),
                agregar(lecturas, LecturaMeteorologica::vientoKmh),
                lluvia);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private List<Estacion> aprobadas(String municipio, UUID escuelaId) {
        return estacionRepository.findByEstado(EstadoEstacion.APPROVED).stream()
                .filter(e -> municipio == null || municipio.equalsIgnoreCase(e.getMunicipio()))
                .filter(e -> escuelaId == null
                        || (e.getEscuela() != null && escuelaId.equals(e.getEscuela().getId())))
                .toList();
    }

    private PublicEstacionResponse toPublic(Estacion e, long offlineMin) {
        Escuela escuela = e.getEscuela();
        return new PublicEstacionResponse(
                e.getUuid(),
                e.getNombre(),
                e.getMunicipio(),
                e.getLatitud(),
                e.getLongitud(),
                escuela != null ? escuela.getNombre() : null,
                conectividad(e, offlineMin),
                weatherDataService.leerActual(e).map(lecturaMapper::toResponse).orElse(null));
    }

    private Conectividad conectividad(Estacion e, long offlineMin) {
        Instant uc = e.getUltimaConexion();
        return (uc != null && uc.isAfter(Instant.now().minus(Duration.ofMinutes(offlineMin))))
                ? Conectividad.ONLINE : Conectividad.OFFLINE;
    }

    private String ambito(String municipio, UUID escuelaId) {
        if (escuelaId != null) {
            return "ESCUELA:" + escuelaId;
        }
        if (municipio != null && !municipio.isBlank()) {
            return "MUNICIPIO:" + municipio;
        }
        return "RED";
    }

    private Agregado agregar(List<LecturaMeteorologica> ls, ToDoubleFunction<LecturaMeteorologica> campo) {
        double min = Double.MAX_VALUE, max = -Double.MAX_VALUE, suma = 0;
        for (LecturaMeteorologica l : ls) {
            double v = campo.applyAsDouble(l);
            min = Math.min(min, v);
            max = Math.max(max, v);
            suma += v;
        }
        return new Agregado(min, max, suma / ls.size());
    }

    private long offlineMinutos() {
        return configuracionRepository.findById("estacion.offline.minutos")
                .map(c -> {
                    try {
                        return Long.parseLong(c.getValor().trim());
                    } catch (NumberFormatException ex) {
                        return (long) DEFAULT_OFFLINE_MIN;
                    }
                })
                .orElse((long) DEFAULT_OFFLINE_MIN);
    }
}

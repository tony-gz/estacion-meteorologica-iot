package com.tony.wheatherstation.service;

import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.dto.estacion.EstadisticaAgrupadaResponse;
import com.tony.wheatherstation.dto.estacion.EstadisticaAgrupadaResponse.Punto;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.repository.EstacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Estadísticas avanzadas (FR-032b): agregados por día/mes y ámbito
 * (estación/escuela/municipio/red). El bucketing se hace en memoria sobre las
 * lecturas del rango (sin SQL nativo), consistente con {@link EstadisticaService}.
 */
@Service
@RequiredArgsConstructor
public class EstadisticaAvanzadaService {

    private final EstacionRepository estacionRepository;
    private final WeatherDataService weatherDataService;

    @Transactional(readOnly = true)
    public EstadisticaAgrupadaResponse agrupar(String agrupacion, UUID escuelaId, String municipio,
                                               UUID estacionUuid, Instant desde, Instant hasta) {
        boolean porMes = "MES".equalsIgnoreCase(agrupacion);
        Instant fin = hasta != null ? hasta : Instant.now();
        Instant inicio = desde != null ? desde : fin.minus(30, ChronoUnit.DAYS);

        Ambito ambito = resolverAmbito(escuelaId, municipio, estacionUuid);

        // Agrupa las lecturas de todas las estaciones del ámbito por periodo.
        Map<Instant, List<LecturaMeteorologica>> porPeriodo = new TreeMap<>();
        for (Estacion estacion : ambito.estaciones()) {
            for (LecturaMeteorologica l : weatherDataService.leerHistorial(estacion, inicio, fin)) {
                porPeriodo.computeIfAbsent(truncar(l.timestamp(), porMes), k -> new ArrayList<>()).add(l);
            }
        }

        List<Punto> serie = new ArrayList<>();
        porPeriodo.forEach((periodo, lecturas) -> serie.add(puntoDe(periodo, lecturas)));
        return new EstadisticaAgrupadaResponse(ambito.descripcion(), porMes ? "MES" : "DIA", serie);
    }

    private Ambito resolverAmbito(UUID escuelaId, String municipio, UUID estacionUuid) {
        if (estacionUuid != null) {
            return new Ambito("ESTACION:" + estacionUuid,
                    estacionRepository.findByUuid(estacionUuid).map(List::of).orElse(List.of()));
        }
        if (escuelaId != null) {
            return new Ambito("ESCUELA:" + escuelaId, estacionRepository.findByEscuelaId(escuelaId));
        }
        if (municipio != null && !municipio.isBlank()) {
            return new Ambito("MUNICIPIO:" + municipio, estacionRepository.findByMunicipio(municipio));
        }
        return new Ambito("RED", estacionRepository.findAll());
    }

    private Punto puntoDe(Instant periodo, List<LecturaMeteorologica> ls) {
        int n = ls.size();
        double tProm = 0, tMin = Double.MAX_VALUE, tMax = -Double.MAX_VALUE;
        double hSum = 0, pSum = 0, vSum = 0, lluvia = 0;
        for (LecturaMeteorologica l : ls) {
            tProm += l.temperatura();
            tMin = Math.min(tMin, l.temperatura());
            tMax = Math.max(tMax, l.temperatura());
            hSum += l.humedad();
            pSum += l.presion();
            vSum += l.vientoKmh();
            lluvia += l.lluviaMm();
        }
        return new Punto(periodo, n, tProm / n, tMin, tMax, hSum / n, pSum / n, vSum / n, lluvia);
    }

    /** Trunca el instante al inicio del día o del mes (UTC). */
    private Instant truncar(Instant ts, boolean porMes) {
        LocalDate dia = ts.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate base = porMes ? dia.withDayOfMonth(1) : dia;
        return base.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private record Ambito(String descripcion, List<Estacion> estaciones) {
    }
}

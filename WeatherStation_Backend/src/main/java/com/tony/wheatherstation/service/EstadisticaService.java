package com.tony.wheatherstation.service;

import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.dto.estacion.EstadisticasResponse;
import com.tony.wheatherstation.dto.estacion.EstadisticasResponse.Agregado;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.function.ToDoubleFunction;

/** Cálculo de estadísticas (mín/máx/promedio + lluvia total) sobre un conjunto de lecturas. */
@Service
public class EstadisticaService {

    public EstadisticasResponse calcular(String estacionId, Instant desde, Instant hasta,
                                         List<LecturaMeteorologica> lecturas) {
        if (lecturas.isEmpty()) {
            // Rango sin datos: respuesta vacía, no error (spec US3 AC4).
            return new EstadisticasResponse(estacionId, desde, hasta, 0, null, null, null, null, 0.0);
        }
        double lluviaTotal = lecturas.stream()
                .mapToDouble(LecturaMeteorologica::lluviaMm)
                .sum();
        return new EstadisticasResponse(
                estacionId,
                desde,
                hasta,
                lecturas.size(),
                agregar(lecturas, LecturaMeteorologica::temperatura),
                agregar(lecturas, LecturaMeteorologica::humedad),
                agregar(lecturas, LecturaMeteorologica::presion),
                agregar(lecturas, LecturaMeteorologica::vientoKmh),
                lluviaTotal);
    }

    private Agregado agregar(List<LecturaMeteorologica> lecturas, ToDoubleFunction<LecturaMeteorologica> campo) {
        double min = Double.MAX_VALUE;
        double max = -Double.MAX_VALUE;
        double suma = 0;
        for (LecturaMeteorologica l : lecturas) {
            double v = campo.applyAsDouble(l);
            min = Math.min(min, v);
            max = Math.max(max, v);
            suma += v;
        }
        return new Agregado(min, max, suma / lecturas.size());
    }
}

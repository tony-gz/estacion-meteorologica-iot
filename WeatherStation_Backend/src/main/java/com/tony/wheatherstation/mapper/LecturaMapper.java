package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.dto.estacion.LecturaResponse;
import org.springframework.stereotype.Component;

/** Conversión LecturaMeteorologica (dominio) → LecturaResponse (DTO). */
@Component
public class LecturaMapper {

    public LecturaResponse toResponse(LecturaMeteorologica l) {
        if (l == null) {
            return null;
        }
        return new LecturaResponse(
                l.timestamp(),
                l.temperatura(),
                l.humedad(),
                l.presion(),
                l.vientoKmh(),
                l.vientoDir(),
                l.vientoGrados(),
                l.lluviaMm());
    }
}

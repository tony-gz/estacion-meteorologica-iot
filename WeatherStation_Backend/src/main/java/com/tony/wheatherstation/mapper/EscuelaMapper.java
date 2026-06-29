package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.dto.escuela.EscuelaResponse;
import com.tony.wheatherstation.entity.Escuela;
import org.springframework.stereotype.Component;

/** Conversión Escuela (entidad) → EscuelaResponse (DTO). */
@Component
public class EscuelaMapper {

    public EscuelaResponse toResponse(Escuela e, long totalEstaciones) {
        return new EscuelaResponse(
                e.getId(),
                e.getNombre(),
                e.getClave(),
                e.getMunicipio(),
                e.getUbicacion(),
                e.getLatitud(),
                e.getLongitud(),
                e.getDirector(),
                e.getContactoEmail(),
                totalEstaciones,
                e.getCreatedAt());
    }
}

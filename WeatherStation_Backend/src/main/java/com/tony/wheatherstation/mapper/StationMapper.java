package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.dto.estacion.LecturaResponse;
import com.tony.wheatherstation.dto.estacion.StationResponse;
import com.tony.wheatherstation.entity.Conectividad;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.Usuario;
import org.springframework.stereotype.Component;

/** Conversión Estacion (entidad) → StationResponse (vista de gobernanza/consulta). */
@Component
public class StationMapper {

    /** Para acciones de gobernanza (sin última lectura). */
    public StationResponse toResponse(Estacion e, Conectividad conectividad) {
        return toResponse(e, conectividad, null);
    }

    public StationResponse toResponse(Estacion e, Conectividad conectividad,
                                      LecturaResponse ultimaLectura) {
        Escuela escuela = e.getEscuela();
        Usuario responsable = e.getResponsable();
        return new StationResponse(
                e.getId(),
                e.getUuid(),
                e.getNombre(),
                e.getDescripcion(),
                escuela != null ? escuela.getId() : null,
                escuela != null ? escuela.getNombre() : null,
                responsable != null ? responsable.getId() : null,
                responsable != null ? responsable.getNombre() : null,
                e.getUbicacion(),
                e.getMunicipio(),
                e.getLatitud(),
                e.getLongitud(),
                e.getAltitud(),
                e.getFirmware(),
                e.getHardware(),
                e.getUltimoRssi(),
                e.getEstado(),
                conectividad,
                e.getFechaRegistro(),
                e.getUltimaConexion(),
                conectividad == Conectividad.ONLINE,
                ultimaLectura);
    }
}

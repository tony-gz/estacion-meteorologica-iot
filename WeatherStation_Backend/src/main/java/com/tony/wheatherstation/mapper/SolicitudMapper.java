package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.dto.solicitud.SolicitudResponse;
import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.SolicitudRegistro;
import com.tony.wheatherstation.entity.Usuario;
import org.springframework.stereotype.Component;

/** Conversión SolicitudRegistro (entidad) → SolicitudResponse (DTO). */
@Component
public class SolicitudMapper {

    public SolicitudResponse toResponse(SolicitudRegistro s) {
        Escuela escuela = s.getEscuela();
        Estacion estacion = s.getEstacion();
        Usuario solicitante = s.getSolicitante();
        return new SolicitudResponse(
                s.getId(),
                s.getUuidPropuesto(),
                s.getNombre(),
                escuela != null ? escuela.getId() : null,
                escuela != null ? escuela.getNombre() : null,
                s.getInstitucion(),
                s.getUbicacion(),
                s.getMunicipio(),
                s.getFirmware(),
                s.getEstado(),
                s.getMotivoRechazo(),
                estacion != null ? estacion.getId() : null,
                solicitante != null ? solicitante.getNombre() : null,
                solicitante != null ? solicitante.getEmail() : null,
                s.getCreatedAt(),
                s.getResueltaEn());
    }
}

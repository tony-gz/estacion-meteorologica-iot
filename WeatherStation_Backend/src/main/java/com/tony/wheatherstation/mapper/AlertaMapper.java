package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.dto.alerta.AlertaResponse;
import com.tony.wheatherstation.entity.Alerta;
import org.springframework.stereotype.Component;

/** Conversión Alerta (entidad) → AlertaResponse (DTO). */
@Component
public class AlertaMapper {

    public AlertaResponse toResponse(Alerta a) {
        return new AlertaResponse(
                a.getId(),
                a.getEstacionId(),
                a.getTipo(),
                a.getSeveridad(),
                a.getEstado(),
                a.getMensaje(),
                a.getValorDisparo(),
                a.getVariableDisparo(),
                a.getDetectadaEn(),
                a.getResueltaEn());
    }
}

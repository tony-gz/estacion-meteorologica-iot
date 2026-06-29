package com.tony.wheatherstation.mapper;

import com.tony.wheatherstation.dto.estacion.ConexionResponse;
import com.tony.wheatherstation.entity.ConnectionLog;
import org.springframework.stereotype.Component;

/** Conversión ConnectionLog (entidad) → ConexionResponse (DTO). */
@Component
public class ConexionMapper {

    public ConexionResponse toResponse(ConnectionLog c) {
        return new ConexionResponse(
                c.getCreatedAt(),
                c.getIp(),
                c.getFirmware(),
                c.getEvento().name(),
                c.getDetalle());
    }
}

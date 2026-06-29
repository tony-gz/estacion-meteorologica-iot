package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.device.DeviceConfigResponse;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.repository.EstacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/** Configuración remota de la estación (FR-041): intervalo, muestreo, zona horaria. */
@Service
@RequiredArgsConstructor
public class DeviceConfigService {

    private final EstacionRepository estacionRepository;

    @Transactional(readOnly = true)
    public DeviceConfigResponse config(UUID estacionUuid) {
        Estacion estacion = estacionRepository.findByUuid(estacionUuid)
                .orElseThrow(() -> new ResourceNotFoundException("ESTACION_NO_ENCONTRADA",
                        "No existe la estación " + estacionUuid));
        return new DeviceConfigResponse(
                estacion.getIntervaloEnvioSeg(),
                estacion.getMuestreoSeg(),
                estacion.getZonaHoraria(),
                Instant.now());
    }
}

package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.device.DeviceHeartbeatRequest;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.EventoConexion;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.exception.UnauthorizedStationException;
import com.tony.wheatherstation.repository.EstacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Latido de salud (FR-040). Actualiza última conexión, firmware/hardware/RSSI y
 * registra un evento HEARTBEAT; permite derivar ONLINE/OFFLINE. SIN batería.
 */
@Service
@RequiredArgsConstructor
public class HeartbeatService {

    private final EstacionRepository estacionRepository;
    private final ConnectionLogService connectionLogService;

    @Transactional
    public void procesar(UUID estacionUuid, DeviceHeartbeatRequest req, String ip) {
        Estacion estacion = estacionRepository.findByUuid(estacionUuid)
                .orElseThrow(() -> new ResourceNotFoundException("ESTACION_NO_ENCONTRADA",
                        "No existe la estación " + estacionUuid));
        if (estacion.getEstado() != EstadoEstacion.APPROVED) {
            throw new UnauthorizedStationException("ESTACION_NO_APROBADA",
                    "La estación no está aprobada", HttpStatus.FORBIDDEN);
        }
        if (req.firmware() != null && !req.firmware().isBlank()) {
            estacion.setFirmware(req.firmware());
        }
        if (req.hardware() != null && !req.hardware().isBlank()) {
            estacion.setHardware(req.hardware());
        }
        if (req.rssi() != null) {
            estacion.setUltimoRssi(req.rssi());
        }
        estacion.setUltimaConexion(Instant.now());
        estacionRepository.save(estacion);
        connectionLogService.registrar(estacion, String.valueOf(estacionUuid), ip,
                req.firmware(), EventoConexion.HEARTBEAT, null);
    }
}

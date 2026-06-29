package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.device.DeviceDataRequest;
import com.tony.wheatherstation.dto.device.DeviceDataResponse;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.EventoConexion;
import com.tony.wheatherstation.entity.Lectura;
import com.tony.wheatherstation.entity.LecturaActual;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.exception.UnauthorizedStationException;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.repository.LecturaActualRepository;
import com.tony.wheatherstation.repository.LecturaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Ingesta de lecturas (FR-018, diagramas §5): valida que la estación esté APPROVED
 * y que la lectura sea válida, hace upsert de {@code lectura_actual} y, según la
 * cadencia {@code app.ingesta.historial-cada-min}, inserta en {@code lecturas}
 * (idempotente por estación+timestamp). Todo en una transacción.
 */
@Service
@RequiredArgsConstructor
public class IngestaService {

    private final EstacionRepository estacionRepository;
    private final LecturaActualRepository lecturaActualRepository;
    private final LecturaRepository lecturaRepository;
    private final LecturaValidator lecturaValidator;
    private final ConnectionLogService connectionLogService;

    @Value("${app.ingesta.historial-cada-min}")
    private long historialCadaMin;

    @Transactional
    public DeviceDataResponse ingerir(UUID estacionUuid, DeviceDataRequest req, String ip) {
        Estacion estacion = estacionRepository.findByUuid(estacionUuid)
                .orElseThrow(() -> new ResourceNotFoundException("ESTACION_NO_ENCONTRADA",
                        "No existe la estación " + estacionUuid));

        if (estacion.getEstado() != EstadoEstacion.APPROVED) {
            connectionLogService.registrar(estacion, String.valueOf(estacionUuid), ip,
                    estacion.getFirmware(), EventoConexion.DATA_REJECTED,
                    "estado=" + estacion.getEstado());
            throw new UnauthorizedStationException("ESTACION_NO_APROBADA",
                    "La estación no está aprobada para publicar", HttpStatus.FORBIDDEN);
        }

        try {
            lecturaValidator.validar(req);
        } catch (RuntimeException ex) {
            connectionLogService.registrar(estacion, String.valueOf(estacionUuid), ip,
                    estacion.getFirmware(), EventoConexion.DATA_REJECTED, ex.getMessage());
            throw ex;
        }

        Instant recibidoEn = Instant.now();

        // 1) Upsert de la lectura actual (una fila por estación).
        LecturaActual actual = LecturaActual.builder()
                .estacionId(estacion.getId())
                .timestamp(req.timestamp())
                .recibidoEn(recibidoEn)
                .temperatura(req.temperatura())
                .humedad(req.humedad())
                .presion(req.presion())
                .vientoKmh(req.vientoKmh())
                .vientoDir(req.vientoDir())
                .vientoGrados(req.vientoGrados())
                .lluviaMm(req.lluviaMm())
                .build();
        lecturaActualRepository.save(actual);

        // 2) Histórico según cadencia (idempotente por estación+timestamp).
        boolean historialActualizado = false;
        if (debeArchivar(estacion, req.timestamp())) {
            Lectura lectura = Lectura.builder()
                    .estacion(estacion)
                    .timestamp(req.timestamp())
                    .recibidoEn(recibidoEn)
                    .temperatura(req.temperatura())
                    .humedad(req.humedad())
                    .presion(req.presion())
                    .vientoKmh(req.vientoKmh())
                    .vientoDir(req.vientoDir())
                    .lluviaMm(req.lluviaMm())
                    .build();
            lecturaRepository.save(lectura);
            historialActualizado = true;
        }

        // 3) Actualizar la estación y registrar la conexión.
        estacion.setUltimaConexion(recibidoEn);
        estacionRepository.save(estacion);
        connectionLogService.registrar(estacion, String.valueOf(estacionUuid), ip,
                estacion.getFirmware(), EventoConexion.DATA_OK, null);

        return new DeviceDataResponse("ACEPTADA", recibidoEn, historialActualizado);
    }

    /** Archiva si no hay histórico aún o si el último es más viejo que la cadencia. */
    private boolean debeArchivar(Estacion estacion, Instant timestamp) {
        if (lecturaRepository.existsByEstacionAndTimestamp(estacion, timestamp)) {
            return false;
        }
        return lecturaRepository.findTopByEstacionOrderByTimestampDesc(estacion)
                .map(ultima -> timestamp.isAfter(
                        ultima.getTimestamp().plus(Duration.ofMinutes(historialCadaMin))))
                .orElse(true);
    }
}

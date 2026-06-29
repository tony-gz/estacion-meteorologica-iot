package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.estacion.ConexionResponse;
import com.tony.wheatherstation.entity.ConnectionLog;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EventoConexion;
import com.tony.wheatherstation.mapper.ConexionMapper;
import com.tony.wheatherstation.repository.ConnectionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Historial de conexiones de las estaciones (FR-014/FR-021). {@link #registrar} lo
 * usan los flujos de dispositivo (Fase 12); {@link #listar} lo consulta el panel.
 */
@Service
@RequiredArgsConstructor
public class ConnectionLogService {

    private final ConnectionLogRepository connectionLogRepository;
    private final ConexionMapper conexionMapper;

    /**
     * Persiste el evento en una transacción PROPIA (REQUIRES_NEW): así los logs de
     * fallo (AUTH_FAIL/DATA_REJECTED/UNAUTHORIZED) sobreviven al rollback de la
     * operación que los provocó, garantizando la auditoría.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(Estacion estacion, String uuidReportado, String ip,
                          String firmware, EventoConexion evento, String detalle) {
        ConnectionLog log = ConnectionLog.builder()
                .estacion(estacion)
                .uuidReportado(uuidReportado)
                .ip(ip)
                .firmware(firmware)
                .evento(evento)
                .detalle(detalle)
                .build();
        connectionLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<ConexionResponse> listar(Estacion estacion, int page, int size) {
        return connectionLogRepository
                .findByEstacionOrderByCreatedAtDesc(estacion, PageRequest.of(page, size))
                .map(conexionMapper::toResponse)
                .getContent();
    }
}

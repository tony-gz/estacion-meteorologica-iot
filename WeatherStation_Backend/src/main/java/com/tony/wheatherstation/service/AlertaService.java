package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.alerta.AlertaResponse;
import com.tony.wheatherstation.entity.EstadoAlerta;
import com.tony.wheatherstation.entity.TipoAlerta;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.mapper.AlertaMapper;
import com.tony.wheatherstation.repository.AlertaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Consulta de alertas (US5). La generación la hace {@link AlertaRuleEngine}. */
@Service
@RequiredArgsConstructor
public class AlertaService {

    private final AlertaRepository alertaRepository;
    private final AlertaMapper alertaMapper;

    public List<AlertaResponse> listar(String estacionId, TipoAlerta tipo, EstadoAlerta estado) {
        return alertaRepository.buscar(estacionId, tipo, estado).stream()
                .map(alertaMapper::toResponse)
                .toList();
    }

    public AlertaResponse obtener(UUID id) {
        return alertaRepository.findById(id)
                .map(alertaMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("ALERTA_NO_ENCONTRADA",
                        "No existe la alerta " + id));
    }

    /** Elimina una alerta (ADMIN). Depura las alertas resueltas/acumuladas. */
    @Transactional
    public void eliminar(UUID id) {
        if (!alertaRepository.existsById(id)) {
            throw new ResourceNotFoundException("ALERTA_NO_ENCONTRADA",
                    "No existe la alerta " + id);
        }
        alertaRepository.deleteById(id);
    }
}

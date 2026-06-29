package com.tony.wheatherstation.service;

import com.tony.wheatherstation.domain.EstacionInfo;
import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.Lectura;
import com.tony.wheatherstation.entity.LecturaActual;
import com.tony.wheatherstation.repository.LecturaActualRepository;
import com.tony.wheatherstation.repository.LecturaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Fuente de datos meteorológicos desde PostgreSQL (reemplaza al adaptador Firebase
 * de v1). Devuelve los mismos tipos de dominio ({@link EstacionInfo},
 * {@link LecturaMeteorologica}) que ya consumen la IA, las estadísticas y las
 * alertas, de modo que el cambio de fuente sea transparente para esa lógica.
 */
@Service
@RequiredArgsConstructor
public class WeatherDataService {

    private final LecturaActualRepository lecturaActualRepository;
    private final LecturaRepository lecturaRepository;

    @Transactional(readOnly = true)
    public Optional<LecturaMeteorologica> leerActual(Estacion estacion) {
        return lecturaActualRepository.findById(estacion.getId()).map(this::toDominio);
    }

    @Transactional(readOnly = true)
    public List<LecturaMeteorologica> leerHistorial(Estacion estacion, Instant desde, Instant hasta) {
        return lecturaRepository
                .findByEstacionAndTimestampBetweenOrderByTimestampAsc(estacion, desde, hasta)
                .stream().map(this::toDominio).toList();
    }

    /** Metadata de la estación en el formato de dominio (para la IA/PromptBuilder). */
    public EstacionInfo toInfo(Estacion e) {
        return new EstacionInfo(
                e.getUuid().toString(),
                e.getNombre(),
                e.getUbicacion(),
                e.getFirmware(),
                null,
                e.getUltimaConexion());
    }

    private LecturaMeteorologica toDominio(LecturaActual l) {
        return new LecturaMeteorologica(l.getTimestamp(),
                z(l.getTemperatura()), z(l.getHumedad()), z(l.getPresion()),
                z(l.getVientoKmh()), l.getVientoDir(), l.getVientoGrados(), z(l.getLluviaMm()));
    }

    private LecturaMeteorologica toDominio(Lectura l) {
        return new LecturaMeteorologica(l.getTimestamp(),
                z(l.getTemperatura()), z(l.getHumedad()), z(l.getPresion()),
                z(l.getVientoKmh()), l.getVientoDir(), null, z(l.getLluviaMm()));
    }

    private double z(Double v) {
        return v != null ? v : 0.0;
    }
}

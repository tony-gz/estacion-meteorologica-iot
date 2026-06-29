package com.tony.wheatherstation.service;

import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.StationToken;
import com.tony.wheatherstation.repository.StationTokenRepository;
import com.tony.wheatherstation.util.TokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Ciclo de vida del token de una estación (research R13). A lo sumo UN token
 * activo por estación: generar/regenerar revoca el anterior. Solo se persiste el
 * hash; el valor en claro se devuelve para mostrarlo una única vez.
 */
@Service
@RequiredArgsConstructor
public class StationTokenService {

    private final StationTokenRepository stationTokenRepository;

    /**
     * Revoca el token activo (si lo hay) y emite uno nuevo. Devuelve el valor en
     * claro; en BD queda solo su hash.
     */
    @Transactional
    public String generar(Estacion estacion) {
        Instant ahora = Instant.now();
        stationTokenRepository.findByEstacionAndActivoTrue(estacion).ifPresent(actual -> {
            actual.setActivo(false);
            actual.setRevocadoEn(ahora);
            stationTokenRepository.save(actual);
        });
        String enClaro = TokenGenerator.generarToken();
        StationToken nuevo = StationToken.builder()
                .estacion(estacion)
                .tokenHash(TokenGenerator.hash(enClaro))
                .activo(true)
                .creadoEn(ahora)
                .build();
        stationTokenRepository.save(nuevo);
        return enClaro;
    }

    /** Revoca el token activo de una estación (p. ej. al deshabilitarla). */
    @Transactional
    public void revocarActivo(Estacion estacion) {
        stationTokenRepository.findByEstacionAndActivoTrue(estacion).ifPresent(actual -> {
            actual.setActivo(false);
            actual.setRevocadoEn(Instant.now());
            stationTokenRepository.save(actual);
        });
    }
}

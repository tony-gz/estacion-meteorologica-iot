package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.Lectura;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Histórico de lecturas (serie temporal). Las estadísticas se calculan con
 * agregados SQL sobre esta tabla (se añaden en la fase de estadísticas).
 */
public interface LecturaRepository extends JpaRepository<Lectura, Long> {

    List<Lectura> findByEstacionAndTimestampBetweenOrderByTimestampAsc(
            Estacion estacion, Instant desde, Instant hasta);

    boolean existsByEstacionAndTimestamp(Estacion estacion, Instant timestamp);

    Optional<Lectura> findTopByEstacionOrderByTimestampDesc(Estacion estacion);
}

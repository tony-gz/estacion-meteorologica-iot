package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.StationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StationTokenRepository extends JpaRepository<StationToken, UUID> {

    /** Token activo cuyo hash coincide (validación en /api/device/auth). */
    Optional<StationToken> findByTokenHashAndActivoTrue(String tokenHash);

    Optional<StationToken> findByEstacionAndActivoTrue(Estacion estacion);
}

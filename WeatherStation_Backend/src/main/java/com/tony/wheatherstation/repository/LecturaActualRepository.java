package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.LecturaActual;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Snapshot de última lectura por estación. La PK es el id de la estación, de modo
 * que {@code save()} hace upsert (una fila por estación).
 */
public interface LecturaActualRepository extends JpaRepository<LecturaActual, UUID> {
}

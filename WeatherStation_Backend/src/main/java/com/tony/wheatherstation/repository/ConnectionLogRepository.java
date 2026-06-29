package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.ConnectionLog;
import com.tony.wheatherstation.entity.Estacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ConnectionLogRepository extends JpaRepository<ConnectionLog, UUID> {

    Page<ConnectionLog> findByEstacionOrderByCreatedAtDesc(Estacion estacion, Pageable pageable);
}

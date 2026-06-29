package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.LogAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LogAuditoriaRepository extends JpaRepository<LogAuditoria, UUID> {
}

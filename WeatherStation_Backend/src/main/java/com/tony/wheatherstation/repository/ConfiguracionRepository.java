package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.Configuracion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracionRepository extends JpaRepository<Configuracion, String> {
}

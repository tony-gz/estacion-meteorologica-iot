package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EstacionRepository extends JpaRepository<Estacion, UUID> {

    Optional<Estacion> findByUuid(UUID uuid);

    boolean existsByUuid(UUID uuid);

    List<Estacion> findByEscuelaId(UUID escuelaId);

    List<Estacion> findByMunicipio(String municipio);

    long countByEscuelaId(UUID escuelaId);

    List<Estacion> findByEstado(EstadoEstacion estado);

    List<Estacion> findByEstadoIn(List<EstadoEstacion> estados);
}

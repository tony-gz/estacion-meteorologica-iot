package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.Escuela;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EscuelaRepository extends JpaRepository<Escuela, UUID> {

    Optional<Escuela> findByClave(String clave);

    boolean existsByClave(String clave);
}

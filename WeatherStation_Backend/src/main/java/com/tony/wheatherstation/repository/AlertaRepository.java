package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.Alerta;
import com.tony.wheatherstation.entity.EstadoAlerta;
import com.tony.wheatherstation.entity.TipoAlerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertaRepository extends JpaRepository<Alerta, UUID> {

    /** Para deduplicación: alerta ACTIVA de un tipo para una estación. */
    Optional<Alerta> findFirstByEstacionIdAndTipoAndEstado(
            String estacionId, TipoAlerta tipo, EstadoAlerta estado);

    /** Búsqueda con filtros opcionales (cualquier combinación puede ser null). */
    @Query("""
            select a from Alerta a
            where (:estacionId is null or a.estacionId = :estacionId)
              and (:tipo is null or a.tipo = :tipo)
              and (:estado is null or a.estado = :estado)
            order by a.detectadaEn desc
            """)
    List<Alerta> buscar(@Param("estacionId") String estacionId,
                        @Param("tipo") TipoAlerta tipo,
                        @Param("estado") EstadoAlerta estado);
}

package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.EstadoSolicitud;
import com.tony.wheatherstation.entity.SolicitudRegistro;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SolicitudRepository extends JpaRepository<SolicitudRegistro, UUID> {

    List<SolicitudRegistro> findByEstado(EstadoSolicitud estado);

    List<SolicitudRegistro> findByEscuelaId(UUID escuelaId);

    List<SolicitudRegistro> findByEscuelaIdAndEstado(UUID escuelaId, EstadoSolicitud estado);

    List<SolicitudRegistro> findBySolicitanteIdOrderByCreatedAtDesc(UUID solicitanteId);
}

package com.tony.wheatherstation.dto.estacion;

import com.tony.wheatherstation.entity.Conectividad;
import com.tony.wheatherstation.entity.EstadoEstacion;

import java.time.Instant;
import java.util.UUID;

/**
 * Vista de gobernanza de una estación (PostgreSQL). Es el {@code EstacionResponse}
 * de la spec v3; se llama {@code StationResponse} durante la transición para no
 * colisionar con el DTO de lectura de v1 (se unifica al retirar Firebase en Fase 13).
 */
public record StationResponse(
        UUID id,
        UUID uuid,
        String nombre,
        String descripcion,
        UUID escuelaId,
        String escuelaNombre,
        UUID responsableId,
        String responsableNombre,
        String ubicacion,
        String municipio,
        Double latitud,
        Double longitud,
        Double altitud,
        String firmware,
        String hardware,
        Integer ultimoRssi,
        EstadoEstacion estado,
        Conectividad conectividad,
        Instant fechaRegistro,
        Instant ultimaConexion,
        boolean enLinea,
        LecturaResponse ultimaLectura
) {
}

package com.tony.wheatherstation.entity;

/**
 * Ciclo de vida de una estación (gobernanza, constitución principio VIII).
 * Solo {@code APPROVED} puede autenticarse y publicar. La conectividad
 * ONLINE/OFFLINE NO es un estado: se deriva de {@code ultimaConexion}.
 */
public enum EstadoEstacion {
    PENDING,
    APPROVED,
    REJECTED,
    DISABLED,
    MAINTENANCE
}

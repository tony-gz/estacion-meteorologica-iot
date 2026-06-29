package com.tony.wheatherstation.entity;

/**
 * Conectividad de una estación. Es un valor DERIVADO de {@code ultimaConexion} +
 * umbral {@code estacion.offline.minutos}; no se persiste como estado.
 */
public enum Conectividad {
    ONLINE,
    OFFLINE
}

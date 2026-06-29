package com.tony.wheatherstation.entity;

/** Tipo de evento registrado en el historial de conexiones de una estación. */
public enum EventoConexion {
    AUTH_OK,
    AUTH_FAIL,
    DATA_OK,
    DATA_REJECTED,
    HEARTBEAT,
    UNAUTHORIZED
}

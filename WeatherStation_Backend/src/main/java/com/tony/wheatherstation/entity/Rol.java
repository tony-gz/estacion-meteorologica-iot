package com.tony.wheatherstation.entity;

/**
 * Roles del sistema. Determinan los permisos según la matriz de autorización.
 * Se mapean a authorities de Spring Security con el prefijo {@code ROLE_}.
 */
public enum Rol {
    ADMIN,
    RESPONSABLE,
    INVESTIGADOR,
    USUARIO
}

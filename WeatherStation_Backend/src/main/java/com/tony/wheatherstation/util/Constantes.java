package com.tony.wheatherstation.util;

/** Constantes compartidas (rutas de Firebase, claves de configuración, etc.). */
public final class Constantes {

    private Constantes() {
    }

    // ── Rutas del esquema Firebase escrito por el ESP32 (NO modificar firmware) ──
    public static final String FB_REGISTRO = "registro";
    public static final String FB_ACTUAL = "actual";
    public static final String FB_HISTORIAL = "historial";

    // ── Claves de la tabla 'configuracion' ──
    public static final String CFG_ALERTA_HUMEDAD_UMBRAL = "alerta.humedad.umbral";
    public static final String CFG_ALERTA_PRESION_CAIDA = "alerta.presion.caida_hpa";
    public static final String CFG_ALERTA_VIENTO_UMBRAL = "alerta.viento.umbral";
    public static final String CFG_ALERTA_TEMP_UMBRAL = "alerta.temp.umbral";
    public static final String CFG_ESTACION_OFFLINE_MIN = "estacion.offline.minutos";

    // ── Authorities de Spring Security ──
    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_INVESTIGADOR = "ROLE_INVESTIGADOR";
    public static final String ROLE_USUARIO = "ROLE_USUARIO";
}

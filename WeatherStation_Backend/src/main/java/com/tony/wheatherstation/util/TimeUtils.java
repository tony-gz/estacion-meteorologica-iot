package com.tony.wheatherstation.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Utilidades de tiempo. Los ESP32 escriben timestamps en hora local UTC-6
 * (Chilpancingo) SIN información de zona (firmware: configTime(-6*3600, ...)).
 * Aquí se centraliza el parseo/normalización para evitar desfases (research R10).
 */
public final class TimeUtils {

    /** Zona horaria de las estaciones (UTC-6). */
    public static final ZoneOffset ZONA_ESTACION = ZoneOffset.ofHours(-6);

    /** Formato emitido por el ESP32: "yyyy-MM-dd'T'HH:mm:ss" (sin zona). */
    private static final DateTimeFormatter ESP32_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private TimeUtils() {
    }

    /**
     * Convierte un timestamp del ESP32 (hora local UTC-6, sin zona) a {@link Instant}.
     * Devuelve {@code null} si el valor es nulo, vacío o no parseable.
     */
    public static Instant parseEsp32Timestamp(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(raw.trim(), ESP32_FORMAT).toInstant(ZONA_ESTACION);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    /**
     * Inverso de {@link #parseEsp32Timestamp}: convierte un {@link Instant} a la
     * clave que usa el ESP32 en el historial ("yyyy-MM-dd'T'HH:mm:ss" en UTC-6).
     * Como las claves son ordenables lexicográficamente = cronológicamente, sirve
     * para acotar rangos con orderByKey/startAt/endAt en Firebase.
     */
    public static String formatEsp32Key(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZONA_ESTACION).format(ESP32_FORMAT);
    }
}

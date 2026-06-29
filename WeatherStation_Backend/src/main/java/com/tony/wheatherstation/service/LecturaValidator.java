package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.device.DeviceDataRequest;
import com.tony.wheatherstation.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Validación semántica de una lectura entrante (research R2). El formato (campos
 * presentes) ya lo cubre Bean Validation (→400); aquí van los rangos y la ventana
 * de timestamp, cuya violación es {@code 422 LECTURA_INVALIDA}.
 */
@Component
public class LecturaValidator {

    private final long ventanaMin;

    public LecturaValidator(@Value("${app.device.timestamp-ventana-min}") long ventanaMin) {
        this.ventanaMin = ventanaMin;
    }

    public void validar(DeviceDataRequest req) {
        exigir(finito(req.temperatura()), "temperatura no finita");
        exigir(finito(req.humedad()) && req.humedad() >= 0 && req.humedad() <= 100,
                "humedad fuera de rango [0,100]");
        exigir(finito(req.presion()) && req.presion() > 0, "presión debe ser > 0");
        exigir(finito(req.vientoKmh()) && req.vientoKmh() >= 0, "viento_kmh debe ser >= 0");
        exigir(finito(req.lluviaMm()) && req.lluviaMm() >= 0, "lluvia_mm debe ser >= 0");
        if (req.vientoGrados() != null) {
            exigir(finito(req.vientoGrados()) && req.vientoGrados() >= 0 && req.vientoGrados() <= 360,
                    "viento_grados fuera de rango [0,360]");
        }
        exigir(timestampEnVentana(req.timestamp()),
                "timestamp fuera de la ventana de " + ventanaMin + " min");
    }

    private boolean timestampEnVentana(Instant ts) {
        Instant ahora = Instant.now();
        Duration ventana = Duration.ofMinutes(ventanaMin);
        return !ts.isBefore(ahora.minus(ventana)) && !ts.isAfter(ahora.plus(ventana));
    }

    private boolean finito(Double v) {
        return v != null && !v.isNaN() && !v.isInfinite();
    }

    private void exigir(boolean condicion, String motivo) {
        if (!condicion) {
            throw new BusinessException("LECTURA_INVALIDA",
                    "Lectura inválida: " + motivo, HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }
}

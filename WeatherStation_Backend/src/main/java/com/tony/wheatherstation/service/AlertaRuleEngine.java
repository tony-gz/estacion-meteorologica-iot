package com.tony.wheatherstation.service;

import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.entity.Alerta;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoAlerta;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.Severidad;
import com.tony.wheatherstation.entity.TipoAlerta;
import com.tony.wheatherstation.repository.AlertaRepository;
import com.tony.wheatherstation.repository.ConfiguracionRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.util.Constantes;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Motor de reglas de alertas (US7, FR-030..032). Se ejecuta periódicamente sobre
 * las estaciones APPROVED de PostgreSQL y crea/resuelve alertas con deduplicación.
 * Reglas meteorológicas (lluvia/viento/calor) y de salud (desconexión / sensor sin
 * respuesta). Umbrales configurables en la tabla 'configuracion'.
 */
@Service
@RequiredArgsConstructor
public class AlertaRuleEngine {

    private static final Logger log = LoggerFactory.getLogger(AlertaRuleEngine.class);
    private static final long OFFLINE_MIN_DEFECTO = 10;

    private final EstacionRepository estacionRepository;
    private final WeatherDataService weatherDataService;
    private final AlertaRepository alertaRepository;
    private final ConfiguracionRepository configuracionRepository;

    @Scheduled(
            fixedDelayString = "${app.alertas.intervalo-ms}",
            initialDelayString = "${app.alertas.initial-delay-ms}")
    public void evaluar() {
        try {
            double humedadUmbral = cfg(Constantes.CFG_ALERTA_HUMEDAD_UMBRAL, 90);
            double presionCaida = cfg(Constantes.CFG_ALERTA_PRESION_CAIDA, 1.0);
            double vientoUmbral = cfg(Constantes.CFG_ALERTA_VIENTO_UMBRAL, 40);
            double tempUmbral = cfg(Constantes.CFG_ALERTA_TEMP_UMBRAL, 38);
            long offlineMin = (long) cfg(Constantes.CFG_ESTACION_OFFLINE_MIN, OFFLINE_MIN_DEFECTO);

            for (Estacion estacion : estacionRepository.findByEstado(EstadoEstacion.APPROVED)) {
                evaluarEstacion(estacion, humedadUmbral, presionCaida, vientoUmbral, tempUmbral, offlineMin);
            }
        } catch (Exception e) {
            log.warn("No se pudo evaluar el motor de alertas: {}", e.getMessage());
        }
    }

    private void evaluarEstacion(Estacion estacion, double humedadUmbral, double presionCaida,
                                 double vientoUmbral, double tempUmbral, long offlineMin) {
        String id = estacion.getUuid().toString();

        // ── Salud: desconexión ──
        Instant uc = estacion.getUltimaConexion();
        boolean desconectada = uc == null || Duration.between(uc, Instant.now()).toMinutes() >= offlineMin;
        aplicar(id, TipoAlerta.ESTACION_DESCONECTADA, Severidad.MEDIA, desconectada,
                0, "ultima_conexion", "Estación desconectada");

        Optional<LecturaMeteorologica> actualOpt = weatherDataService.leerActual(estacion);
        boolean sinSensor = !desconectada && actualOpt.isEmpty();
        aplicar(id, TipoAlerta.SENSOR_SIN_RESPUESTA, Severidad.MEDIA, sinSensor,
                0, "lectura", "Sensor sin respuesta");

        // ── Meteorológicas (solo si hay lectura actual; si no, se resuelven) ──
        boolean tiene = actualOpt.isPresent();
        LecturaMeteorologica a = actualOpt.orElse(null);
        double temp = tiene ? a.temperatura() : 0;
        double viento = tiene ? a.vientoKmh() : 0;
        double humedad = tiene ? a.humedad() : 0;

        aplicar(id, TipoAlerta.CALOR_EXTREMO, Severidad.ALTA, tiene && temp > tempUmbral,
                temp, "temperatura", String.format("Calor extremo: %.1f °C", temp));
        aplicar(id, TipoAlerta.VIENTO_FUERTE, Severidad.ALTA, tiene && viento > vientoUmbral,
                viento, "viento_kmh", String.format("Viento fuerte: %.1f km/h", viento));
        boolean lluvia = tiene && humedad > humedadUmbral && presionEnDescenso(estacion, presionCaida);
        aplicar(id, TipoAlerta.LLUVIA, Severidad.MEDIA, lluvia,
                humedad, "humedad",
                String.format("Posible lluvia: humedad %.1f %% y presión en descenso", humedad));
    }

    /** Crea la alerta si la condición se cumple y no hay otra ACTIVA del tipo; si no, la resuelve. */
    private void aplicar(String estacionId, TipoAlerta tipo, Severidad severidad, boolean condicion,
                         double valor, String variable, String mensaje) {
        Optional<Alerta> activa = alertaRepository
                .findFirstByEstacionIdAndTipoAndEstado(estacionId, tipo, EstadoAlerta.ACTIVA);
        if (condicion) {
            if (activa.isEmpty()) {
                Alerta alerta = Alerta.builder()
                        .estacionId(estacionId)
                        .tipo(tipo)
                        .severidad(severidad)
                        .estado(EstadoAlerta.ACTIVA)
                        .mensaje(mensaje)
                        .valorDisparo(valor)
                        .variableDisparo(variable)
                        .detectadaEn(Instant.now())
                        .build();
                alertaRepository.save(alerta);
                log.info("Alerta generada [{}] {} (valor={})", tipo, estacionId, valor);
            }
        } else if (activa.isPresent()) {
            Alerta alerta = activa.get();
            alerta.setEstado(EstadoAlerta.RESUELTA);
            alerta.setResueltaEn(Instant.now());
            alertaRepository.save(alerta);
            log.info("Alerta resuelta [{}] {}", tipo, estacionId);
        }
    }

    /** "Presión en descenso": cae al menos {@code caidaUmbral} hPa en las últimas 3 h. */
    private boolean presionEnDescenso(Estacion estacion, double caidaUmbral) {
        Instant hasta = Instant.now();
        List<LecturaMeteorologica> historial =
                weatherDataService.leerHistorial(estacion, hasta.minus(3, ChronoUnit.HOURS), hasta);
        if (historial.size() < 2) {
            return false;
        }
        double primera = historial.get(0).presion();
        double ultima = historial.get(historial.size() - 1).presion();
        return (primera - ultima) >= caidaUmbral;
    }

    private double cfg(String clave, double porDefecto) {
        return configuracionRepository.findById(clave)
                .map(c -> {
                    try {
                        return Double.parseDouble(c.getValor().trim());
                    } catch (NumberFormatException e) {
                        return porDefecto;
                    }
                })
                .orElse(porDefecto);
    }
}

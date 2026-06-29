package com.tony.wheatherstation.service;

import com.tony.wheatherstation.domain.EstacionInfo;
import com.tony.wheatherstation.domain.LecturaMeteorologica;
import com.tony.wheatherstation.dto.estacion.EstadisticasResponse;
import com.tony.wheatherstation.dto.ia.IaPrediccionRequest;
import com.tony.wheatherstation.dto.ia.IaPreguntaRequest;
import com.tony.wheatherstation.dto.ia.IaResponse;
import com.tony.wheatherstation.dto.ia.IaResumenRequest;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.LogAuditoria;
import com.tony.wheatherstation.exception.ResourceNotFoundException;
import com.tony.wheatherstation.gemini.GeminiClient;
import com.tony.wheatherstation.gemini.PromptBuilder;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.repository.LogAuditoriaRepository;
import com.tony.wheatherstation.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Orquesta la IA (US4): lee Firebase → construye contexto → invoca Gemini →
 * mapea la respuesta. Garantiza el "grounding" (constitución, principio VI).
 */
@Service
@RequiredArgsConstructor
public class IaService {

    private static final Logger log = LoggerFactory.getLogger(IaService.class);
    private static final int VENTANA_PREGUNTA_H = 24;
    private static final int VENTANA_PREDICCION_H = 48;
    private static final int VENTANA_RESUMEN_DEFECTO_H = 24;

    private final EstacionRepository estacionRepository;
    private final WeatherDataService weatherDataService;
    private final EstadisticaService estadisticaService;
    private final GeminiClient geminiClient;
    private final PromptBuilder promptBuilder;
    private final UsuarioRepository usuarioRepository;
    private final LogAuditoriaRepository logAuditoriaRepository;

    public IaResponse preguntar(IaPreguntaRequest req) {
        return responder(req.estacionId(), req.pregunta(), VENTANA_PREGUNTA_H, "IA_PREGUNTA");
    }

    public IaResponse resumen(IaResumenRequest req) {
        int horas = req.horas() != null ? req.horas() : VENTANA_RESUMEN_DEFECTO_H;
        String instruccion = "Resume el clima de la estación en las últimas " + horas
                + " horas, destacando temperatura, humedad, presión, viento y lluvia.";
        return responder(req.estacionId(), instruccion, horas, "IA_RESUMEN");
    }

    public IaResponse prediccion(IaPrediccionRequest req) {
        String instruccion = "Con base en las tendencias observadas (especialmente presión y "
                + "humedad), ofrece una estimación cualitativa del clima próximo y posibles "
                + "riesgos (lluvia, viento fuerte, calor). Indica el nivel de incertidumbre.";
        return responder(req.estacionId(), instruccion, VENTANA_PREDICCION_H, "IA_PREDICCION");
    }

    // ── Núcleo ────────────────────────────────────────────────────────────────

    private IaResponse responder(String estacionId, String instruccion, int horas, String accion) {
        Estacion estacion = resolver(estacionId);
        EstacionInfo info = weatherDataService.toInfo(estacion);

        Instant hasta = Instant.now();
        Instant desde = hasta.minus(horas, ChronoUnit.HOURS);

        LecturaMeteorologica actual = weatherDataService.leerActual(estacion).orElse(null);
        List<LecturaMeteorologica> historial = weatherDataService.leerHistorial(estacion, desde, hasta);
        EstadisticasResponse stats = estadisticaService.calcular(estacionId, desde, hasta, historial);

        int muestras = historial.size() + (actual != null ? 1 : 0);
        List<String> advertencias = new ArrayList<>();
        String respuesta;

        if (actual == null && historial.isEmpty()) {
            // Sin datos: no se invoca a Gemini; se declara explícitamente (principio VI).
            advertencias.add("datos insuficientes");
            respuesta = "No hay datos suficientes de la estación '" + estacionId
                    + "' para responder con fundamento.";
        } else {
            String contexto = promptBuilder.construirContexto(info, actual, stats);
            String userPrompt = contexto + "\nSolicitud del usuario: " + instruccion;
            respuesta = geminiClient.generar(promptBuilder.sistema(), userPrompt);
            if (respuesta == null || respuesta.isBlank()) {
                advertencias.add("respuesta vacía del modelo");
                respuesta = "No se pudo generar una respuesta en este momento.";
            }
        }

        registrarUso(accion, estacionId);
        return new IaResponse(estacionId, respuesta, desde, hasta, muestras, advertencias, Instant.now());
    }

    /** Resuelve la estación por su uuid (el {@code estacionId} de la API es el uuid). */
    private Estacion resolver(String estacionId) {
        java.util.UUID uuid;
        try {
            uuid = java.util.UUID.fromString(estacionId);
        } catch (IllegalArgumentException ex) {
            throw new ResourceNotFoundException("ESTACION_NO_ENCONTRADA",
                    "No existe la estación '" + estacionId + "'");
        }
        return estacionRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("ESTACION_NO_ENCONTRADA",
                        "No existe la estación '" + estacionId + "'"));
    }

    /** Audita el uso de IA sin secretos; un fallo de auditoría no rompe la petición. */
    private void registrarUso(String accion, String estacionId) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            usuarioRepository.findByEmail(email).ifPresent(usuario -> {
                LogAuditoria entry = LogAuditoria.builder()
                        .usuario(usuario)
                        .accion(accion)
                        .recurso("estacion:" + estacionId)
                        .build();
                logAuditoriaRepository.save(entry);
            });
        } catch (Exception e) {
            log.warn("No se pudo registrar el uso de IA: {}", e.getMessage());
        }
    }
}

package com.tony.wheatherstation.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Notificaciones por email para solicitudes de token de estación.
 *
 * <p>Usa la API HTTP de SendGrid (transaccional) en lugar de SMTP, porque el
 * plan free de Render bloquea los puertos SMTP salientes (25/465/587). El
 * remitente ({@code app.solicitudes.email-from}) debe estar verificado en
 * SendGrid (Single Sender Verification). Si no hay API key configurada, el envío
 * queda deshabilitado (se registra un aviso) sin afectar a la operación
 * principal (aprobar/rechazar).
 */
@Slf4j
@Service
public class EmailService {

    private final RestClient restClient;
    private final String from;
    private final String fromName;
    private final boolean habilitado;

    public EmailService(
            @Value("${app.solicitudes.email-from}") String from,
            @Value("${app.email.from-name:CLIMBOT}") String fromName,
            @Value("${app.email.sendgrid-api-key:}") String apiKey,
            @Value("${app.email.sendgrid-base-url:https://api.sendgrid.com}") String baseUrl) {
        this.from = from;
        this.fromName = fromName;
        this.habilitado = apiKey != null && !apiKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
        // Diagnóstico de arranque (sin exponer la key): confirma si el envío
        // quedó habilitado y con qué remitente, visible en los logs tras el deploy.
        log.info("EmailService: envío de correo {} (remitente='{}', api-key {} caracteres)",
                habilitado ? "HABILITADO" : "DESHABILITADO", from,
                apiKey == null ? 0 : apiKey.length());
    }

    public void enviarToken(String to, String stationName, UUID stationUuid, String token) {
        String asunto = "CLIMBOT — Token de estación \"" + stationName + "\" aprobado";
        String cuerpo = """
                ¡Hola!

                Tu solicitud para la estación "%s" ha sido aprobada.

                Datos de la estación:
                  UUID (identificador único): %s
                  Token de acceso:             %s

                Instrucciones para configurar tu ESP32:
                1. Copia el UUID y pégalo en EST_UUID del firmware.
                2. Copia el token (sin espacios) y pégalo en EST_TOKEN.
                3. La estación comenzará a enviar datos automáticamente.

                ⚠  Este token se muestra solo una vez. Si lo pierdes, un administrador
                   puede regenerarlo desde el panel de control.

                — CLIMBOT
                """.formatted(stationName, stationUuid, token);
        enviar(to, asunto, cuerpo);
    }

    public void enviarRechazo(String to, String stationName, String motivo) {
        String asunto = "CLIMBOT — Solicitud de estación \"" + stationName + "\" rechazada";
        String cuerpo = """
                ¡Hola!

                Tu solicitud para la estación "%s" ha sido rechazada.
                Motivo: %s

                Si crees que se trata de un error, contacta al administrador del sistema.

                — CLIMBOT
                """.formatted(stationName, motivo != null ? motivo : "No especificado");
        enviar(to, asunto, cuerpo);
    }

    private void enviar(String to, String asunto, String cuerpo) {
        if (!habilitado) {
            log.warn("Email NO enviado a {} (falta SENDGRID_API_KEY). Asunto: {}", to, asunto);
            return;
        }
        try {
            Map<String, Object> body = Map.of(
                    "personalizations", List.of(Map.of("to", List.of(Map.of("email", to)))),
                    "from", Map.of("email", from, "name", fromName),
                    "subject", asunto,
                    "content", List.of(Map.of("type", "text/plain", "value", cuerpo)));
            restClient.post()
                    .uri("/v3/mail/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email enviado a {}: {}", to, asunto);
        } catch (RestClientResponseException e) {
            // La API respondió con error (p. ej. remitente no verificado, key inválida).
            log.error("SendGrid rechazó el email a {} ({}): {}", to, e.getStatusCode(),
                    e.getResponseBodyAsString());
        } catch (Exception e) {
            // Fallo de red u otro: el email es un efecto secundario, no rompemos la
            // operación principal (la aprobación/rechazo ya se persistió en la BD).
            log.error("Error al enviar email a {}: {}", to, e.getMessage());
        }
    }
}

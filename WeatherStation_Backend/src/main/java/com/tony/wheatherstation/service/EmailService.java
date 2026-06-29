package com.tony.wheatherstation.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Notificaciones por email para solicitudes de token de estación.
 *
 * <p>Usa la API HTTP de Brevo (transaccional) en lugar de SMTP, porque el plan
 * free de Render bloquea los puertos SMTP salientes (25/465/587). El remitente
 * ({@code app.solicitudes.email-from}) debe estar verificado en Brevo. Si no hay
 * API key configurada, el envío queda deshabilitado (se registra un aviso) sin
 * afectar a la operación principal (aprobar/rechazar).
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
            @Value("${app.email.brevo-api-key:}") String apiKey,
            @Value("${app.email.brevo-base-url:https://api.brevo.com}") String baseUrl) {
        this.from = from;
        this.fromName = fromName;
        this.habilitado = apiKey != null && !apiKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("api-key", apiKey)
                .defaultHeader("accept", "application/json")
                .build();
    }

    public void enviarToken(String to, String stationName, String token) {
        String asunto = "CLIMBOT — Token de estación \"" + stationName + "\" aprobado";
        String cuerpo = """
                ¡Hola!

                Tu solicitud para la estación "%s" ha sido aprobada.

                Token de acceso: %s

                Instrucciones:
                1. Copia el token (sin espacios).
                2. Pégalo en la configuración de tu ESP32 (variable TOKEN en el firmware).
                3. Asegúrate de que el UUID de la estación también esté configurado.
                4. La estación comenzará a enviar datos automáticamente.

                Este token se muestra solo una vez. Si lo pierdes, un administrador puede
                regenerarlo desde el panel de control.

                — CLIMBOT
                """.formatted(stationName, token);
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
            log.warn("Email NO enviado a {} (falta BREVO_API_KEY). Asunto: {}", to, asunto);
            return;
        }
        try {
            Map<String, Object> body = Map.of(
                    "sender", Map.of("name", fromName, "email", from),
                    "to", List.of(Map.of("email", to)),
                    "subject", asunto,
                    "textContent", cuerpo);
            restClient.post()
                    .uri("/v3/smtp/email")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Email enviado a {}: {}", to, asunto);
        } catch (RestClientResponseException e) {
            // La API respondió con error (p. ej. remitente no verificado, key inválida).
            log.error("Brevo rechazó el email a {} ({}): {}", to, e.getStatusCode(),
                    e.getResponseBodyAsString());
        } catch (Exception e) {
            // Fallo de red u otro: el email es un efecto secundario, no rompemos la
            // operación principal (la aprobación/rechazo ya se persistió en la BD).
            log.error("Error al enviar email a {}: {}", to, e.getMessage());
        }
    }
}

package com.tony.wheatherstation.service;

import com.tony.wheatherstation.exception.ExternalServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Notificaciones por email para solicitudes de token de estación.
 * Usa Jakarta Mail (JavaMail) sobre SMTP configurable (por defecto Gmail).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.solicitudes.email-from}")
    private String from;

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
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(asunto);
            msg.setText(cuerpo);
            mailSender.send(msg);
            log.info("Email enviado a {}: {}", to, asunto);
        } catch (Exception e) {
            log.error("Error al enviar email a {}: {}", to, e.getMessage());
            // No lanzamos excepción al cliente; el email es un efecto secundario.
            // La operación principal (aprobar/rechazar) ya se completó en la BD.
        }
    }
}

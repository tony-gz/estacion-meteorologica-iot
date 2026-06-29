package com.tony.wheatherstation.gemini;

/**
 * Cliente de IA (Gemini). Abstrae la invocación para cumplir DIP y permitir
 * tests con fakes. El backend es el ÚNICO que invoca Gemini (constitución I).
 */
public interface GeminiClient {

    /**
     * Genera una respuesta a partir de una instrucción de sistema y el contenido
     * del usuario (datos + solicitud). Lanza ExternalServiceException ante fallos.
     */
    String generar(String systemPrompt, String userPrompt);
}

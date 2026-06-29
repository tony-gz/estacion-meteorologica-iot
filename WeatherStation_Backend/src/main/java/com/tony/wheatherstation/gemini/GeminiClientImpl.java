package com.tony.wheatherstation.gemini;

import com.tony.wheatherstation.exception.ExternalServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Implementación HTTP del cliente Gemini (Generative Language API, endpoint v1,
 * autenticación por cabecera {@code x-goog-api-key}). La API key viene por
 * variable de entorno y nunca se expone al cliente.
 */
@Component
public class GeminiClientImpl implements GeminiClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public GeminiClientImpl(
            @Value("${app.gemini.base-url}") String baseUrl,
            @Value("${app.gemini.api-key}") String apiKey,
            @Value("${app.gemini.model}") String model,
            @Value("${app.gemini.timeout-seconds}") int timeoutSeconds) {
        this.apiKey = apiKey;
        this.model = model;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    private static final int MAX_INTENTOS = 3;

    @Override
    public String generar(String systemPrompt, String userPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ExternalServiceException("GEMINI_NO_CONFIGURADO",
                    "La IA no está configurada en el servidor", null);
        }
        // El endpoint v1 no admite systemInstruction; se antepone al contenido.
        String texto = systemPrompt + "\n\n" + userPrompt;
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", texto)))),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 1024));

        RestClientException ultimoError = null;
        for (int intento = 1; intento <= MAX_INTENTOS; intento++) {
            try {
                GeminiResponse response = restClient.post()
                        .uri("/v1/models/{model}:generateContent", model)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(GeminiResponse.class);
                return extractText(response);
            } catch (RestClientException ex) {
                ultimoError = ex;
                if (intento < MAX_INTENTOS) {
                    dormir(500L * intento); // backoff ante 5xx/timeout transitorios de Gemini
                }
            }
        }
        throw new ExternalServiceException("GEMINI_ERROR",
                "Error al invocar el servicio de IA", ultimoError);
    }

    private void dormir(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String extractText(GeminiResponse response) {
        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            return "";
        }
        GeminiResponse.Candidate candidate = response.candidates().get(0);
        if (candidate.content() == null || candidate.content().parts() == null) {
            return "";
        }
        return candidate.content().parts().stream()
                .map(GeminiResponse.Part::text)
                .filter(t -> t != null && !t.isBlank())
                .reduce("", (a, b) -> a.isEmpty() ? b : a + "\n" + b);
    }

    /** Subconjunto de la respuesta de generateContent que nos interesa. */
    private record GeminiResponse(List<Candidate> candidates) {
        record Candidate(Content content, String finishReason) {
        }

        record Content(List<Part> parts) {
        }

        record Part(String text) {
        }
    }
}

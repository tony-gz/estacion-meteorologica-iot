package com.tony.wheatherstation.exception;

/**
 * Fallo de un servicio externo (Firebase / Gemini) → HTTP 503. No filtra
 * detalles internos al cliente (FR-021).
 */
public class ExternalServiceException extends RuntimeException {

    private final String code;

    public ExternalServiceException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

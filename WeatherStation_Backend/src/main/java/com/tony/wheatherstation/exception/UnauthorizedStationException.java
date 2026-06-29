package com.tony.wheatherstation.exception;

import org.springframework.http.HttpStatus;

/**
 * Una estación no puede autenticarse o publicar: token inválido/revocado (401) o
 * estación no aprobada / en mantenimiento / deshabilitada (403). El {@code status}
 * lo decide quien la lanza. Códigos de dominio: {@code TOKEN_ESTACION_INVALIDO},
 * {@code ESTACION_NO_APROBADA}.
 */
public class UnauthorizedStationException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public UnauthorizedStationException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

package com.tony.wheatherstation.exception;

import org.springframework.http.HttpStatus;

/** Violación de una regla de negocio (p. ej. email duplicado → 409). */
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, String message, HttpStatus status) {
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

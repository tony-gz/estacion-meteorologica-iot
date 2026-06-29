package com.tony.wheatherstation.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * JWT de dispositivo (HS256) firmado con un secreto SEPARADO del de usuarios
 * ({@code DEVICE_JWT_SECRET}) para poder rotarlo de forma independiente. Lleva el
 * claim {@code type=DEVICE} y {@code sub} = uuid de la estación. Vida corta; la
 * estación repite el handshake cuando expira (research R12).
 */
@Service
public class DeviceJwtService {

    public static final String TYPE_CLAIM = "type";
    public static final String TYPE_DEVICE = "DEVICE";

    private final SecretKey key;
    private final long expMillis;

    public DeviceJwtService(@Value("${app.device.jwt-secret}") String secret,
                            @Value("${app.device.jwt-exp-min}") long expMin) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expMillis = expMin * 60_000L;
    }

    /** Emite un JWT de dispositivo para la estación identificada por su uuid. */
    public String generar(UUID estacionUuid) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(estacionUuid.toString())
                .claim(TYPE_CLAIM, TYPE_DEVICE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expMillis)))
                .id(UUID.randomUUID().toString())
                .signWith(key)
                .compact();
    }

    /** Valida firma/expiración y exige {@code type=DEVICE}. Lanza si es inválido. */
    public Claims parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        if (!TYPE_DEVICE.equals(claims.get(TYPE_CLAIM, String.class))) {
            throw new io.jsonwebtoken.JwtException("No es un token de dispositivo");
        }
        return claims;
    }

    public long getExpSeconds() {
        return expMillis / 1000L;
    }
}

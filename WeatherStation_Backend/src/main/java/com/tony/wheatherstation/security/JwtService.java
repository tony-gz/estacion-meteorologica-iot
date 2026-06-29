package com.tony.wheatherstation.security;

import com.tony.wheatherstation.entity.Usuario;
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
 * Generación y validación de access tokens JWT (HS256). El refresh token es
 * opaco y se gestiona en AuthService (persistido y rotado). Ver plan.md
 * "Modelo de Autenticación".
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long accessExpMillis;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.access-exp-min}") long accessExpMin) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpMillis = accessExpMin * 60_000L;
    }

    /** Genera un access token con claims sub=email, uid, rol, jti y expiración. */
    public String generateAccessToken(Usuario usuario) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("uid", usuario.getId().toString())
                .claim("rol", usuario.getRol().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(accessExpMillis)))
                .id(UUID.randomUUID().toString())
                .signWith(key)
                .compact();
    }

    /** Valida la firma/expiración y devuelve los claims. Lanza JwtException si es inválido. */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessExpSeconds() {
        return accessExpMillis / 1000L;
    }
}

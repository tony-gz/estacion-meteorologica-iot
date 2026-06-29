package com.tony.wheatherstation.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Autentica las rutas protegidas de dispositivo (/api/device/data, /heartbeat,
 * /config) con el JWT de dispositivo. Aísla los sujetos: limpia cualquier
 * autenticación de usuario en estas rutas y solo concede {@code ROLE_DEVICE} si el
 * JWT es válido y de tipo DEVICE. Las rutas /register y /auth son públicas.
 */
@Component
@RequiredArgsConstructor
public class DeviceJwtFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    public static final String ROLE_DEVICE = "ROLE_DEVICE";

    private final DeviceJwtService deviceJwtService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (esRutaProtegidaDispositivo(path)) {
            // Aislamiento: un JWT de usuario NO sirve aquí.
            SecurityContextHolder.clearContext();
            String header = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (header != null && header.startsWith(BEARER_PREFIX)) {
                try {
                    Claims claims = deviceJwtService.parse(header.substring(BEARER_PREFIX.length()));
                    var authorities = List.of(new SimpleGrantedAuthority(ROLE_DEVICE));
                    var authentication = new UsernamePasswordAuthenticationToken(
                            claims.getSubject(), null, authorities);
                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } catch (Exception ex) {
                    SecurityContextHolder.clearContext();
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean esRutaProtegidaDispositivo(String path) {
        return path != null && path.startsWith("/api/device/")
                && !path.equals("/api/device/register")
                && !path.equals("/api/device/auth");
    }
}

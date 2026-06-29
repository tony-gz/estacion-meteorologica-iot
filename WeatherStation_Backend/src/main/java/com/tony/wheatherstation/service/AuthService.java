package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.auth.AuthResponse;
import com.tony.wheatherstation.dto.auth.LoginRequest;
import com.tony.wheatherstation.dto.auth.RefreshRequest;
import com.tony.wheatherstation.dto.auth.RegisterRequest;
import com.tony.wheatherstation.entity.RefreshToken;
import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.exception.BusinessException;
import com.tony.wheatherstation.mapper.UsuarioMapper;
import com.tony.wheatherstation.repository.RefreshTokenRepository;
import com.tony.wheatherstation.repository.UsuarioRepository;
import com.tony.wheatherstation.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Lógica de autenticación: registro, login y renovación de tokens con rotación
 * de refresh token y detección de reutilización (diagramas.md §3).
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UsuarioMapper usuarioMapper;

    @Value("${app.jwt.refresh-exp-days}")
    private long refreshExpDays;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (usuarioRepository.existsByEmail(req.email())) {
            throw new BusinessException("EMAIL_DUPLICADO",
                    "Ya existe un usuario con ese email", HttpStatus.CONFLICT);
        }
        Usuario usuario = Usuario.builder()
                .nombre(req.nombre())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .rol(Rol.USUARIO)
                .activo(true)
                .build();
        usuario = usuarioRepository.save(usuario);
        return issueTokens(usuario);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        // Lanza AuthenticationException (→ 401) si las credenciales fallan.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        Usuario usuario = usuarioRepository.findByEmail(req.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));
        return issueTokens(usuario);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest req) {
        String hash = sha256(req.refreshToken());
        RefreshToken actual = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadCredentialsException("Refresh token inválido"));

        if (actual.isRevocado()) {
            // Reutilización de un token ya rotado: posible robo → revocar la familia.
            refreshTokenRepository.revocarTodosDe(actual.getUsuario());
            throw new BadCredentialsException("Refresh token reutilizado");
        }
        if (actual.getExpiraEn().isBefore(Instant.now())) {
            throw new BadCredentialsException("Refresh token expirado");
        }

        Usuario usuario = actual.getUsuario();
        IssuedRefresh nuevo = persistRefreshToken(usuario);
        actual.setRevocado(true);
        actual.setReemplazadoPor(nuevo.entity().getId());
        refreshTokenRepository.save(actual);

        return buildResponse(usuario, nuevo.raw());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Refresh recién emitido: la entidad persistida y su valor en claro (solo en memoria). */
    private record IssuedRefresh(RefreshToken entity, String raw) {
    }

    private AuthResponse issueTokens(Usuario usuario) {
        IssuedRefresh nuevo = persistRefreshToken(usuario);
        return buildResponse(usuario, nuevo.raw());
    }

    private AuthResponse buildResponse(Usuario usuario, String refreshRaw) {
        return new AuthResponse(
                jwtService.generateAccessToken(usuario),
                refreshRaw,
                "Bearer",
                jwtService.getAccessExpSeconds(),
                usuarioMapper.toResponse(usuario));
    }

    /** Crea y persiste un refresh token; expone su valor en claro solo en memoria. */
    private IssuedRefresh persistRefreshToken(Usuario usuario) {
        String raw = generateOpaqueToken();
        RefreshToken token = RefreshToken.builder()
                .usuario(usuario)
                .tokenHash(sha256(raw))
                .expiraEn(Instant.now().plus(refreshExpDays, ChronoUnit.DAYS))
                .revocado(false)
                .build();
        token = refreshTokenRepository.save(token);
        return new IssuedRefresh(token, raw);
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo calcular SHA-256", e);
        }
    }
}

package com.tony.wheatherstation.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Genera y hashea tokens de estación (research R13). El valor en claro
 * ({@code stk_<aleatorio>}) se muestra UNA sola vez al generarse/regenerarse; en
 * BD se guarda solo su hash SHA-256 (determinista, para poder buscarlo en
 * /api/device/auth). El valor en claro nunca se persiste ni se loguea.
 */
public final class TokenGenerator {

    /** Prefijo identificable del token de estación. */
    public static final String PREFIJO = "stk_";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    private TokenGenerator() {
    }

    /** Token en claro de alta entropía: {@code stk_} + 32 bytes aleatorios (base64url). */
    public static String generarToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return PREFIJO + B64.encodeToString(bytes);
    }

    /** Hash SHA-256 (hex) del token en claro; es lo único que se almacena. */
    public static String hash(String tokenEnClaro) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] out = digest.digest(tokenEnClaro.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(out);
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 está garantizado por la plataforma; no debería ocurrir.
            throw new IllegalStateException("SHA-256 no disponible", ex);
        }
    }
}

package com.tony.wheatherstation.security;

import com.tony.wheatherstation.exception.RateLimitExceededException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting por usuario para los endpoints de IA (FR-020). Token bucket en
 * memoria (Bucket4j): N peticiones/min y M/día. Excedido → 429 con Retry-After.
 * Se ejecuta tras la seguridad, por lo que el usuario ya está autenticado.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final long porMinuto;
    private final long porDia;

    public RateLimitInterceptor(
            @Value("${app.ratelimit.ia-por-min}") long porMinuto,
            @Value("${app.ratelimit.ia-por-dia}") long porDia) {
        this.porMinuto = porMinuto;
        this.porDia = porDia;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Bucket bucket = buckets.computeIfAbsent(clave(), k -> nuevoBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long segundos = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            throw new RateLimitExceededException(
                    "Has superado el límite de peticiones de IA. Inténtalo más tarde.", segundos);
        }
        return true;
    }

    private Bucket nuevoBucket() {
        Bandwidth porMin = Bandwidth.builder()
                .capacity(porMinuto).refillGreedy(porMinuto, Duration.ofMinutes(1)).build();
        Bandwidth porDiaLimit = Bandwidth.builder()
                .capacity(porDia).refillGreedy(porDia, Duration.ofDays(1)).build();
        return Bucket.builder().addLimit(porMin).addLimit(porDiaLimit).build();
    }

    private String clave() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "anonimo";
    }
}

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
 * Rate limiting de {@code /api/device/**} (FR-021). Token bucket en memoria por
 * estación (uuid autenticado) o, en /register|/auth (sin auth), por IP. Excedido
 * → 429 con Retry-After.
 */
@Component
public class DeviceRateLimitInterceptor implements HandlerInterceptor {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final long porMinuto;

    public DeviceRateLimitInterceptor(@Value("${app.device.ratelimit-por-min}") long porMinuto) {
        this.porMinuto = porMinuto;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Bucket bucket = buckets.computeIfAbsent(clave(request), k -> nuevoBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long segundos = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
            throw new RateLimitExceededException(
                    "Límite de publicación de la estación superado. Reintenta más tarde.", segundos);
        }
        return true;
    }

    private Bucket nuevoBucket() {
        Bandwidth porMin = Bandwidth.builder()
                .capacity(porMinuto).refillGreedy(porMinuto, Duration.ofMinutes(1)).build();
        return Bucket.builder().addLimit(porMin).build();
    }

    private String clave(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null
                && !"anonymousUser".equals(auth.getName())) {
            return "dev:" + auth.getName();
        }
        return "ip:" + request.getRemoteAddr();
    }
}

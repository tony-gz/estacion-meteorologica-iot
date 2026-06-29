package com.tony.wheatherstation.config;

import com.tony.wheatherstation.security.DeviceRateLimitInterceptor;
import com.tony.wheatherstation.security.RateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registra los interceptores de rate limiting (IA y dispositivo). */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;
    private final DeviceRateLimitInterceptor deviceRateLimitInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor).addPathPatterns("/ia/**");
        // El limitador de dispositivo también protege el tier público (clave por IP).
        registry.addInterceptor(deviceRateLimitInterceptor)
                .addPathPatterns("/api/device/**", "/api/public/**");
    }
}

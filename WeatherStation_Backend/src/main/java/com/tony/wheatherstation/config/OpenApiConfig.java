package com.tony.wheatherstation.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuración de OpenAPI/Swagger. Declara el esquema de seguridad Bearer JWT
 * para que la documentación permita autenticarse (FR-029).
 */
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI weatherStationOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("WeatherStation Backend API")
                        .description("API del backend central de la Red de Estaciones "
                                + "Meteorológicas Inteligentes (CLIMBOT). Único componente con "
                                + "acceso a PostgreSQL (almacén único) y a Gemini. Las estaciones "
                                + "ESP32 publican vía /api/device/**.")
                        .version("3.1.0")
                        .contact(new Contact().name("WeatherStation")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME))
                .components(new Components().addSecuritySchemes(SECURITY_SCHEME,
                        new SecurityScheme()
                                .name(SECURITY_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}

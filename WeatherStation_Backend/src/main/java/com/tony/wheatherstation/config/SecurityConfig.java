package com.tony.wheatherstation.config;

import com.tony.wheatherstation.security.DeviceJwtFilter;
import com.tony.wheatherstation.security.JwtAuthEntryPoint;
import com.tony.wheatherstation.security.JwtAuthenticationFilter;
import com.tony.wheatherstation.security.RestAccessDeniedHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Configuración de seguridad: stateless (JWT), CORS, manejo uniforme de 401/403
 * y autorización por roles según la matriz (contracts/README.md).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final DeviceJwtFilter deviceJwtFilter;
    private final JwtAuthEntryPoint jwtAuthEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(jwtAuthEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        // Públicos
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                            .permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // Tier público de solo lectura (sin cuenta)
                        .requestMatchers("/api/public/**").permitAll()
                        // Dispositivo: register/auth públicos; el resto exige JWT de dispositivo
                        .requestMatchers("/api/device/register", "/api/device/auth").permitAll()
                        .requestMatchers("/api/device/**").hasRole("DEVICE")
                        // Escuelas: lectura para autenticados, escritura solo ADMIN
                        .requestMatchers(HttpMethod.POST, "/escuelas").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/escuelas/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/escuelas/**").hasRole("ADMIN")
                        // Gobernanza de estaciones: acciones de ciclo de vida solo ADMIN
                        .requestMatchers(HttpMethod.POST,
                                "/estaciones/*/aprobar", "/estaciones/*/rechazar",
                                "/estaciones/*/deshabilitar", "/estaciones/*/reactivar",
                                "/estaciones/*/mantenimiento", "/estaciones/*/regenerar-token")
                            .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/estaciones/*/conexiones")
                            .hasAnyRole("ADMIN", "RESPONSABLE")
                        // Registrar/editar estación: ADMIN o RESPONSABLE (propiedad en el servicio)
                        .requestMatchers(HttpMethod.POST, "/estaciones")
                            .hasAnyRole("ADMIN", "RESPONSABLE")
                        .requestMatchers(HttpMethod.PUT, "/estaciones/*")
                            .hasAnyRole("ADMIN", "RESPONSABLE")
                        .requestMatchers(HttpMethod.DELETE, "/estaciones/*").hasRole("ADMIN")
                        // Solicitudes: crear y ver mis-solicitudes cualquier autenticado
                        .requestMatchers(HttpMethod.POST, "/solicitudes").authenticated()
                        .requestMatchers(HttpMethod.GET, "/solicitudes/mis-solicitudes")
                            .authenticated()
                        // Aprobar/rechazar solo ADMIN
                        .requestMatchers(HttpMethod.POST, "/solicitudes/*/aprobar",
                                "/solicitudes/*/rechazar").hasRole("ADMIN")
                        // Eliminar solicitudes (depurar historial) solo ADMIN
                        .requestMatchers(HttpMethod.DELETE, "/solicitudes/*").hasRole("ADMIN")
                        // Listar/ver detalle: ADMIN, RESPONSABLE (USUARIO ve solo las suyas vía /mis-solicitudes)
                        .requestMatchers(HttpMethod.GET, "/solicitudes").hasAnyRole("ADMIN", "RESPONSABLE")
                        .requestMatchers(HttpMethod.GET, "/solicitudes/*").hasAnyRole("ADMIN", "RESPONSABLE")
                        // Datos analíticos: RESPONSABLE (su escuela), INVESTIGADOR o ADMIN
                        .requestMatchers(
                                "/estaciones/*/historial",
                                "/estaciones/*/ultimas24h",
                                "/estaciones/*/estadisticas",
                                "/estadisticas")
                            .hasAnyRole("RESPONSABLE", "INVESTIGADOR", "ADMIN")
                        // Alertas: consulta cualquier autenticado; eliminar solo ADMIN
                        .requestMatchers(HttpMethod.DELETE, "/alertas/*").hasRole("ADMIN")
                        // Gestión de usuarios: solo ADMIN
                        .requestMatchers("/usuarios/**").hasRole("ADMIN")
                        // El resto requiere autenticación
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class)
                // El filtro de dispositivo corre después del de usuario y aísla los
                // sujetos en /api/device/** (un JWT de usuario no concede acceso).
                .addFilterAfter(deviceJwtFilter, JwtAuthenticationFilter.class);
        return http.build();
    }
}

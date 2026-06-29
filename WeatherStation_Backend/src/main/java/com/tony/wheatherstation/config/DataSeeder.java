package com.tony.wheatherstation.config;

import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea un usuario ADMIN inicial si aún no existe (T013). Credenciales por
 * variables de entorno; se registra una advertencia para cambiarlas.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (usuarioRepository.existsByEmail(adminEmail)) {
            return;
        }
        Usuario admin = Usuario.builder()
                .nombre("Administrador")
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .rol(Rol.ADMIN)
                .activo(true)
                .build();
        usuarioRepository.save(admin);
        log.warn("Usuario ADMIN inicial creado ({}). CAMBIA la contraseña por defecto "
                + "configurando ADMIN_EMAIL / ADMIN_PASSWORD.", adminEmail);
    }
}

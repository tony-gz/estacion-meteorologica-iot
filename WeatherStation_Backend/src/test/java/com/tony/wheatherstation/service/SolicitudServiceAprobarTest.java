package com.tony.wheatherstation.service;

import com.tony.wheatherstation.entity.Escuela;
import com.tony.wheatherstation.entity.EstadoSolicitud;
import com.tony.wheatherstation.entity.Rol;
import com.tony.wheatherstation.entity.SolicitudRegistro;
import com.tony.wheatherstation.entity.Usuario;
import com.tony.wheatherstation.mapper.SolicitudMapper;
import com.tony.wheatherstation.repository.EscuelaRepository;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.repository.SolicitudRepository;
import com.tony.wheatherstation.repository.UsuarioRepository;
import com.tony.wheatherstation.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Verifica el fix de gobernanza (T-GOV1): al aprobar una solicitud, el solicitante
 * dueño de la estación se asciende a RESPONSABLE (no a INVESTIGADOR) y se le liga a la
 * escuela. Ver specs/002-app-movil/plan-provisioning-completo.md §7.
 */
@ExtendWith(MockitoExtension.class)
class SolicitudServiceAprobarTest {

    @Mock private SolicitudRepository solicitudRepository;
    @Mock private EstacionRepository estacionRepository;
    @Mock private EscuelaRepository escuelaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private StationTokenService stationTokenService;
    @Mock private CurrentUserService currentUserService;
    @Mock private SolicitudMapper solicitudMapper;
    @Mock private EmailService emailService;

    @InjectMocks private SolicitudService solicitudService;

    private SolicitudRegistro solicitudPendiente(Usuario solicitante, Escuela escuela) {
        return SolicitudRegistro.builder()
                .estado(EstadoSolicitud.PENDING)
                .escuela(escuela)
                .solicitante(solicitante)
                .uuidPropuesto(UUID.randomUUID())
                .nombre("Estación de prueba")
                .build();
    }

    private void stubAprobacion(UUID id, SolicitudRegistro solicitud) {
        when(solicitudRepository.findById(id)).thenReturn(Optional.of(solicitud));
        when(estacionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stationTokenService.generar(any())).thenReturn("stk_prueba");
        lenient().when(solicitudRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(usuarioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // La aprobación registra quién resolvió; devolvemos un ADMIN cualquiera.
        when(currentUserService.actual()).thenReturn(
                Usuario.builder().id(UUID.randomUUID()).rol(Rol.ADMIN).build());
    }

    @Test
    void aprobar_asciende_USUARIO_a_RESPONSABLE_y_le_asigna_escuela() {
        UUID id = UUID.randomUUID();
        Escuela escuela = Escuela.builder().id(UUID.randomUUID()).nombre("Prepa 36").build();
        Usuario solicitante = Usuario.builder()
                .id(UUID.randomUUID()).rol(Rol.USUARIO).escuela(null).build();
        stubAprobacion(id, solicitudPendiente(solicitante, escuela));

        solicitudService.aprobar(id);

        assertThat(solicitante.getRol()).isEqualTo(Rol.RESPONSABLE);
        assertThat(solicitante.getEscuela()).isEqualTo(escuela);
    }

    @Test
    void aprobar_asciende_INVESTIGADOR_a_RESPONSABLE() {
        UUID id = UUID.randomUUID();
        Escuela escuela = Escuela.builder().id(UUID.randomUUID()).nombre("Prepa 36").build();
        Usuario solicitante = Usuario.builder()
                .id(UUID.randomUUID()).rol(Rol.INVESTIGADOR).escuela(null).build();
        stubAprobacion(id, solicitudPendiente(solicitante, escuela));

        solicitudService.aprobar(id);

        assertThat(solicitante.getRol()).isEqualTo(Rol.RESPONSABLE);
    }

    @Test
    void aprobar_no_degrada_a_un_ADMIN_solicitante() {
        UUID id = UUID.randomUUID();
        Escuela escuela = Escuela.builder().id(UUID.randomUUID()).nombre("Prepa 36").build();
        Usuario solicitante = Usuario.builder()
                .id(UUID.randomUUID()).rol(Rol.ADMIN).escuela(null).build();
        stubAprobacion(id, solicitudPendiente(solicitante, escuela));

        solicitudService.aprobar(id);

        assertThat(solicitante.getRol()).isEqualTo(Rol.ADMIN);
    }
}

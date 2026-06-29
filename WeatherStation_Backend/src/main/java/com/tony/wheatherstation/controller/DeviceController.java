package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.device.DeviceAuthRequest;
import com.tony.wheatherstation.dto.device.DeviceAuthResponse;
import com.tony.wheatherstation.dto.device.DeviceConfigResponse;
import com.tony.wheatherstation.dto.device.DeviceDataRequest;
import com.tony.wheatherstation.dto.device.DeviceDataResponse;
import com.tony.wheatherstation.dto.device.DeviceHeartbeatRequest;
import com.tony.wheatherstation.dto.estacion.EstacionRegistroRequest;
import com.tony.wheatherstation.dto.solicitud.SolicitudResponse;
import com.tony.wheatherstation.service.DeviceAuthService;
import com.tony.wheatherstation.service.DeviceConfigService;
import com.tony.wheatherstation.service.HeartbeatService;
import com.tony.wheatherstation.service.IngestaService;
import com.tony.wheatherstation.service.SolicitudService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Endpoints del dispositivo (ESP32). /register y /auth son públicos (rate-limited);
 * /data, /heartbeat y /config exigen el JWT de dispositivo (el uuid de la estación
 * viaja en el principal, fijado por {@code DeviceJwtFilter}).
 */
@RestController
@RequestMapping("/api/device")
@RequiredArgsConstructor
@Tag(name = "Dispositivo", description = "Registro, autenticación, ingesta, latido y config del ESP32")
public class DeviceController {

    private final SolicitudService solicitudService;
    private final DeviceAuthService deviceAuthService;
    private final IngestaService ingestaService;
    private final HeartbeatService heartbeatService;
    private final DeviceConfigService deviceConfigService;

    @Operation(summary = "Solicitud de alta iniciada por el dispositivo (queda PENDING)")
    @PostMapping("/register")
    public ResponseEntity<SolicitudResponse> register(
            @Valid @RequestBody EstacionRegistroRequest request) {
        return ResponseEntity.accepted().body(solicitudService.crearDesdeDispositivo(request));
    }

    @Operation(summary = "Handshake: token permanente → JWT de dispositivo")
    @PostMapping("/auth")
    public DeviceAuthResponse auth(@Valid @RequestBody DeviceAuthRequest request,
                                   HttpServletRequest http) {
        return deviceAuthService.autenticar(request, http.getRemoteAddr());
    }

    @Operation(summary = "Publicar una lectura (se valida y persiste en PostgreSQL)")
    @SecurityRequirement(name = "deviceAuth")
    @PostMapping("/data")
    public ResponseEntity<DeviceDataResponse> data(@Valid @RequestBody DeviceDataRequest request,
                                                   Authentication auth, HttpServletRequest http) {
        DeviceDataResponse body = ingestaService.ingerir(uuid(auth), request, http.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(body);
    }

    @Operation(summary = "Latido de salud (firmware/hardware/RSSI; sin batería)")
    @SecurityRequirement(name = "deviceAuth")
    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(@Valid @RequestBody DeviceHeartbeatRequest request,
                                          Authentication auth, HttpServletRequest http) {
        heartbeatService.procesar(uuid(auth), request, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Configuración remota de la estación")
    @SecurityRequirement(name = "deviceAuth")
    @GetMapping("/config")
    public DeviceConfigResponse config(Authentication auth) {
        return deviceConfigService.config(uuid(auth));
    }

    private UUID uuid(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}

package com.tony.wheatherstation.service;

import com.tony.wheatherstation.dto.device.DeviceAuthRequest;
import com.tony.wheatherstation.dto.device.DeviceAuthResponse;
import com.tony.wheatherstation.entity.Estacion;
import com.tony.wheatherstation.entity.EstadoEstacion;
import com.tony.wheatherstation.entity.EventoConexion;
import com.tony.wheatherstation.entity.StationToken;
import com.tony.wheatherstation.exception.UnauthorizedStationException;
import com.tony.wheatherstation.repository.EstacionRepository;
import com.tony.wheatherstation.repository.StationTokenRepository;
import com.tony.wheatherstation.security.DeviceJwtService;
import com.tony.wheatherstation.util.TokenGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/**
 * Handshake de la estación (FR-017, diagramas §4): valida uuid + token + estado
 * APPROVED y emite un JWT de dispositivo. Registra la conexión (AUTH_OK/AUTH_FAIL/
 * UNAUTHORIZED). Los fallos de credenciales devuelven 401 genérico (no revelan qué
 * parte falló); estación no aprobada → 403.
 */
@Service
@RequiredArgsConstructor
public class DeviceAuthService {

    private final EstacionRepository estacionRepository;
    private final StationTokenRepository stationTokenRepository;
    private final DeviceJwtService deviceJwtService;
    private final ConnectionLogService connectionLogService;

    @Transactional
    public DeviceAuthResponse autenticar(DeviceAuthRequest req, String ip) {
        Optional<Estacion> opt = estacionRepository.findByUuid(req.uuid());
        if (opt.isEmpty()) {
            connectionLogService.registrar(null, String.valueOf(req.uuid()), ip, req.firmware(),
                    EventoConexion.UNAUTHORIZED, "uuid desconocido");
            throw credencialInvalida();
        }
        Estacion estacion = opt.get();

        StationToken activo = stationTokenRepository.findByEstacionAndActivoTrue(estacion)
                .orElse(null);
        if (activo == null || !activo.getTokenHash().equals(TokenGenerator.hash(req.token()))) {
            connectionLogService.registrar(estacion, String.valueOf(req.uuid()), ip, req.firmware(),
                    EventoConexion.AUTH_FAIL, "token inválido");
            throw credencialInvalida();
        }

        if (estacion.getEstado() != EstadoEstacion.APPROVED) {
            connectionLogService.registrar(estacion, String.valueOf(req.uuid()), ip, req.firmware(),
                    EventoConexion.AUTH_FAIL, "estado=" + estacion.getEstado());
            throw new UnauthorizedStationException("ESTACION_NO_APROBADA",
                    "La estación no está aprobada para publicar", HttpStatus.FORBIDDEN);
        }

        Instant ahora = Instant.now();
        activo.setUltimoUsoEn(ahora);
        stationTokenRepository.save(activo);
        if (req.firmware() != null && !req.firmware().isBlank()) {
            estacion.setFirmware(req.firmware());
            estacionRepository.save(estacion);
        }
        connectionLogService.registrar(estacion, String.valueOf(req.uuid()), ip, req.firmware(),
                EventoConexion.AUTH_OK, null);

        String jwt = deviceJwtService.generar(estacion.getUuid());
        return new DeviceAuthResponse(jwt, "Bearer", deviceJwtService.getExpSeconds());
    }

    private UnauthorizedStationException credencialInvalida() {
        return new UnauthorizedStationException("TOKEN_ESTACION_INVALIDO",
                "uuid o token de estación inválido", HttpStatus.UNAUTHORIZED);
    }
}

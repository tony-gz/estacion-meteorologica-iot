package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.estacion.EstacionAccionRequest;
import com.tony.wheatherstation.dto.estacion.StationTokenResponse;
import com.tony.wheatherstation.dto.solicitud.SolicitudCrearRequest;
import com.tony.wheatherstation.dto.solicitud.SolicitudResponse;
import com.tony.wheatherstation.entity.EstadoSolicitud;
import com.tony.wheatherstation.service.SolicitudService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Solicitudes de alta de estaciones. Lectura para ADMIN y RESPONSABLE (su
 * escuela); aprobar/rechazar solo ADMIN (lo fija {@code SecurityConfig}).
 * Los usuarios autenticados (USUARIO) pueden crear solicitudes y ver las suyas.
 */
@RestController
@RequestMapping("/solicitudes")
@RequiredArgsConstructor
@Tag(name = "Solicitudes", description = "Solicitudes de alta de estaciones")
@SecurityRequirement(name = "bearerAuth")
public class SolicitudController {

    private final SolicitudService solicitudService;

    @Operation(summary = "Crear solicitud de token (cualquier usuario autenticado)")
    @PostMapping
    public SolicitudResponse crear(@Valid @RequestBody SolicitudCrearRequest req) {
        return solicitudService.crearDesdeUsuario(req);
    }

    @Operation(summary = "Mis solicitudes (el usuario autenticado ve solo las suyas)")
    @GetMapping("/mis-solicitudes")
    public List<SolicitudResponse> misSolicitudes() {
        return solicitudService.misSolicitudes();
    }

    @Operation(summary = "Listar solicitudes (ADMIN; RESPONSABLE solo las de su escuela)")
    @GetMapping
    public List<SolicitudResponse> listar(@RequestParam(required = false) EstadoSolicitud estado) {
        return solicitudService.listar(estado);
    }

    @Operation(summary = "Ver una solicitud")
    @GetMapping("/{id}")
    public SolicitudResponse obtener(@PathVariable UUID id) {
        return solicitudService.obtener(id);
    }

    @Operation(summary = "Aprobar la solicitud (ADMIN) → crea estación + token (una vez)")
    @PostMapping("/{id}/aprobar")
    public StationTokenResponse aprobar(@PathVariable UUID id) {
        return solicitudService.aprobar(id);
    }

    @Operation(summary = "Rechazar la solicitud (ADMIN)")
    @PostMapping("/{id}/rechazar")
    public SolicitudResponse rechazar(@PathVariable UUID id,
                                      @RequestBody(required = false) EstacionAccionRequest request) {
        return solicitudService.rechazar(id, request != null ? request.motivo() : null);
    }

    @Operation(summary = "Eliminar una solicitud (ADMIN). Depura el historial acumulado.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        solicitudService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}

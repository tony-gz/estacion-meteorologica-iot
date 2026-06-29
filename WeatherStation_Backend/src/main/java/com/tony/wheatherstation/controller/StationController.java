package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.estacion.ConexionResponse;
import com.tony.wheatherstation.dto.estacion.EstacionAccionRequest;
import com.tony.wheatherstation.dto.estacion.EstacionRegistroRequest;
import com.tony.wheatherstation.dto.estacion.EstacionUpdateRequest;
import com.tony.wheatherstation.dto.estacion.StationResponse;
import com.tony.wheatherstation.dto.estacion.StationTokenResponse;
import com.tony.wheatherstation.service.StationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Gobernanza de estaciones (US2, principio VIII). Convive con {@link EstacionController}
 * (datos meteorológicos de v1): este añade las acciones POST/PUT/DELETE sobre
 * {@code /estaciones}. El {@code id} de las rutas es el {@code uuid} público.
 * La autorización por rol la fija {@code SecurityConfig}; la propiedad por escuela,
 * el servicio.
 */
@RestController
@RequestMapping("/estaciones")
@RequiredArgsConstructor
@Tag(name = "Estaciones", description = "Registro y gobernanza de estaciones")
@SecurityRequirement(name = "bearerAuth")
public class StationController {

    private final StationService stationService;

    @Operation(summary = "Registrar una estación (ADMIN/RESPONSABLE) → PENDING")
    @PostMapping
    public ResponseEntity<StationResponse> registrar(
            @Valid @RequestBody EstacionRegistroRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stationService.registrar(request));
    }

    @Operation(summary = "Actualizar metadata de la estación (ADMIN/RESPONSABLE de su escuela)")
    @PutMapping("/{id}")
    public StationResponse actualizar(@PathVariable UUID id,
                                      @Valid @RequestBody EstacionUpdateRequest request) {
        return stationService.actualizar(id, request);
    }

    @Operation(summary = "Eliminar una estación (ADMIN)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        stationService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Aprobar una estación (ADMIN) → APPROVED + token (una vez)")
    @PostMapping("/{id}/aprobar")
    public StationTokenResponse aprobar(@PathVariable UUID id) {
        return stationService.aprobar(id);
    }

    @Operation(summary = "Rechazar una estación (ADMIN)")
    @PostMapping("/{id}/rechazar")
    public StationResponse rechazar(@PathVariable UUID id,
                                    @RequestBody(required = false) EstacionAccionRequest request) {
        return stationService.rechazar(id, motivo(request));
    }

    @Operation(summary = "Deshabilitar una estación (ADMIN)")
    @PostMapping("/{id}/deshabilitar")
    public StationResponse deshabilitar(@PathVariable UUID id,
                                        @RequestBody(required = false) EstacionAccionRequest request) {
        return stationService.deshabilitar(id, motivo(request));
    }

    @Operation(summary = "Poner una estación en mantenimiento (ADMIN)")
    @PostMapping("/{id}/mantenimiento")
    public StationResponse mantenimiento(@PathVariable UUID id) {
        return stationService.mantenimiento(id);
    }

    @Operation(summary = "Reactivar una estación deshabilitada/en mantenimiento (ADMIN)")
    @PostMapping("/{id}/reactivar")
    public StationResponse reactivar(@PathVariable UUID id) {
        return stationService.reactivar(id);
    }

    @Operation(summary = "Regenerar el token de la estación (ADMIN) — revoca el anterior")
    @PostMapping("/{id}/regenerar-token")
    public StationTokenResponse regenerarToken(@PathVariable UUID id) {
        return stationService.regenerarToken(id);
    }

    @Operation(summary = "Historial de conexiones de la estación (ADMIN/RESPONSABLE)")
    @GetMapping("/{id}/conexiones")
    public List<ConexionResponse> conexiones(@PathVariable UUID id,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        return stationService.conexiones(id, page, size);
    }

    private String motivo(EstacionAccionRequest request) {
        return request != null ? request.motivo() : null;
    }
}

package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.estacion.EstadisticasResponse;
import com.tony.wheatherstation.dto.estacion.LecturaResponse;
import com.tony.wheatherstation.dto.estacion.StationResponse;
import com.tony.wheatherstation.service.EstacionConsultaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Consulta de estaciones y datos meteorológicos (US2/US5), leyendo de PostgreSQL.
 * El {@code id} de las rutas es el {@code uuid} público. Convive con
 * {@link StationController} (gobernanza, que añade POST/PUT/DELETE y acciones).
 */
@RestController
@RequestMapping("/estaciones")
@RequiredArgsConstructor
@Tag(name = "Estaciones", description = "Estaciones y datos meteorológicos (PostgreSQL)")
@SecurityRequirement(name = "bearerAuth")
public class EstacionController {

    private final EstacionConsultaService consultaService;

    @Operation(summary = "Listar estaciones visibles según el rol")
    @GetMapping
    public List<StationResponse> listar() {
        return consultaService.listar();
    }

    @Operation(summary = "Detalle de una estación")
    @GetMapping("/{id}")
    public StationResponse obtener(@PathVariable UUID id) {
        return consultaService.obtener(id);
    }

    @Operation(summary = "Última lectura de la estación")
    @GetMapping("/{id}/actual")
    public LecturaResponse obtenerActual(@PathVariable UUID id) {
        return consultaService.obtenerActual(id);
    }

    @Operation(summary = "Historial por rango (INVESTIGADOR, ADMIN). Por defecto, últimas 24 h.")
    @GetMapping("/{id}/historial")
    public List<LecturaResponse> historial(
            @PathVariable UUID id,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return consultaService.historial(id, desde, hasta);
    }

    @Operation(summary = "Lecturas de las últimas 24 horas (INVESTIGADOR, ADMIN)")
    @GetMapping("/{id}/ultimas24h")
    public List<LecturaResponse> ultimas24h(@PathVariable UUID id) {
        return consultaService.ultimas24h(id);
    }

    @Operation(summary = "Estadísticas agregadas del rango (INVESTIGADOR, ADMIN)")
    @GetMapping("/{id}/estadisticas")
    public EstadisticasResponse estadisticas(
            @PathVariable UUID id,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return consultaService.estadisticas(id, desde, hasta);
    }
}

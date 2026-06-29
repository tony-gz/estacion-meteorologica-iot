package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.estacion.EstadisticaAgrupadaResponse;
import com.tony.wheatherstation.service.EstadisticaAvanzadaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

/**
 * Estadísticas avanzadas agrupadas (FR-032b). Ruta separada de {@code /estaciones}
 * para no chocar con {@code /estaciones/{id}}. Acceso INVESTIGADOR/ADMIN/RESPONSABLE.
 */
@RestController
@RequestMapping("/estadisticas")
@RequiredArgsConstructor
@Tag(name = "Estaciones", description = "Estadísticas avanzadas agrupadas")
@SecurityRequirement(name = "bearerAuth")
public class EstadisticaController {

    private final EstadisticaAvanzadaService estadisticaAvanzadaService;

    @Operation(summary = "Estadísticas agregadas por día/mes y ámbito (escuela/municipio/red)")
    @GetMapping
    public EstadisticaAgrupadaResponse agrupadas(
            @RequestParam(defaultValue = "DIA") String agrupacion,
            @RequestParam(required = false) UUID escuelaId,
            @RequestParam(required = false) String municipio,
            @RequestParam(required = false) UUID estacionId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return estadisticaAvanzadaService.agrupar(agrupacion, escuelaId, municipio, estacionId, desde, hasta);
    }
}

package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.publico.PublicEstacionResponse;
import com.tony.wheatherstation.dto.publico.PublicEstadisticaResponse;
import com.tony.wheatherstation.service.PublicService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Tier público de solo lectura, SIN cuenta (US9). Solo estaciones aprobadas y
 * datos no sensibles; la IA y la gestión exigen autenticación.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Tag(name = "Público", description = "Consulta pública sin cuenta (sin IA ni datos sensibles)")
public class PublicController {

    private final PublicService publicService;

    @Operation(summary = "Listado público de estaciones aprobadas")
    @GetMapping("/stations")
    public List<PublicEstacionResponse> stations(@RequestParam(required = false) String municipio) {
        return publicService.estaciones(municipio);
    }

    @Operation(summary = "Última lectura por estación (mapa/listado público)")
    @GetMapping("/weather/latest")
    public List<PublicEstacionResponse> latest(@RequestParam(required = false) String municipio) {
        return publicService.estaciones(municipio);
    }

    @Operation(summary = "Estadísticas agregadas no sensibles (red/municipio/escuela)")
    @GetMapping("/statistics")
    public PublicEstadisticaResponse statistics(
            @RequestParam(required = false) String municipio,
            @RequestParam(required = false) UUID escuelaId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return publicService.estadisticas(municipio, escuelaId, desde, hasta);
    }
}

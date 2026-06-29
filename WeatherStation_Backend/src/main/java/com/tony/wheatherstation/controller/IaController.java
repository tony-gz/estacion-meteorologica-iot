package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.ia.IaPrediccionRequest;
import com.tony.wheatherstation.dto.ia.IaPreguntaRequest;
import com.tony.wheatherstation.dto.ia.IaResponse;
import com.tony.wheatherstation.dto.ia.IaResumenRequest;
import com.tony.wheatherstation.service.IaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Análisis inteligente con Gemini (US4). Requiere autenticación (cualquier rol)
 * y está sujeto a rate limiting.
 */
@RestController
@RequestMapping("/ia")
@RequiredArgsConstructor
@Tag(name = "IA", description = "Análisis inteligente con Gemini (rate limited)")
@SecurityRequirement(name = "bearerAuth")
public class IaController {

    private final IaService iaService;

    @Operation(summary = "Pregunta en lenguaje natural sobre una estación")
    @PostMapping("/preguntar")
    public IaResponse preguntar(@Valid @RequestBody IaPreguntaRequest request) {
        return iaService.preguntar(request);
    }

    @Operation(summary = "Resumen del clima de una ventana temporal")
    @PostMapping("/resumen")
    public IaResponse resumen(@Valid @RequestBody IaResumenRequest request) {
        return iaService.resumen(request);
    }

    @Operation(summary = "Estimación cualitativa basada en tendencias")
    @PostMapping("/prediccion")
    public IaResponse prediccion(@Valid @RequestBody IaPrediccionRequest request) {
        return iaService.prediccion(request);
    }
}

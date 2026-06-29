package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.alerta.AlertaResponse;
import com.tony.wheatherstation.entity.EstadoAlerta;
import com.tony.wheatherstation.entity.TipoAlerta;
import com.tony.wheatherstation.service.AlertaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Consulta de alertas meteorológicas (US5). Requiere autenticación (cualquier rol). */
@RestController
@RequestMapping("/alertas")
@RequiredArgsConstructor
@Tag(name = "Alertas", description = "Alertas generadas por el motor de reglas")
@SecurityRequirement(name = "bearerAuth")
public class AlertaController {

    private final AlertaService alertaService;

    @Operation(summary = "Listar alertas (filtros opcionales por estación, tipo y estado)")
    @GetMapping
    public List<AlertaResponse> listar(
            @RequestParam(required = false) String estacionId,
            @RequestParam(required = false) TipoAlerta tipo,
            @RequestParam(required = false) EstadoAlerta estado) {
        return alertaService.listar(estacionId, tipo, estado);
    }

    @Operation(summary = "Detalle de una alerta")
    @GetMapping("/{id}")
    public AlertaResponse obtener(@PathVariable UUID id) {
        return alertaService.obtener(id);
    }
}

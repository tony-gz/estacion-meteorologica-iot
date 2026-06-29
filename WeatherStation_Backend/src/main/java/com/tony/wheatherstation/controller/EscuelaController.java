package com.tony.wheatherstation.controller;

import com.tony.wheatherstation.dto.escuela.EscuelaRequest;
import com.tony.wheatherstation.dto.escuela.EscuelaResponse;
import com.tony.wheatherstation.service.EscuelaService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Escuelas (US8). Lectura para cualquier usuario autenticado; la escritura
 * (crear/editar/eliminar) la restringe {@code SecurityConfig} a ADMIN.
 */
@RestController
@RequestMapping("/escuelas")
@RequiredArgsConstructor
@Tag(name = "Escuelas", description = "Gestión de escuelas (escritura solo ADMIN)")
@SecurityRequirement(name = "bearerAuth")
public class EscuelaController {

    private final EscuelaService escuelaService;

    @Operation(summary = "Listar escuelas")
    @GetMapping
    public List<EscuelaResponse> listar() {
        return escuelaService.listar();
    }

    @Operation(summary = "Ver una escuela")
    @GetMapping("/{id}")
    public EscuelaResponse obtener(@PathVariable UUID id) {
        return escuelaService.obtener(id);
    }

    @Operation(summary = "Crear una escuela (ADMIN)")
    @PostMapping
    public ResponseEntity<EscuelaResponse> crear(@Valid @RequestBody EscuelaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(escuelaService.crear(request));
    }

    @Operation(summary = "Actualizar una escuela (ADMIN)")
    @PutMapping("/{id}")
    public EscuelaResponse actualizar(@PathVariable UUID id,
                                      @Valid @RequestBody EscuelaRequest request) {
        return escuelaService.actualizar(id, request);
    }

    @Operation(summary = "Eliminar una escuela (ADMIN)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable UUID id) {
        escuelaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}

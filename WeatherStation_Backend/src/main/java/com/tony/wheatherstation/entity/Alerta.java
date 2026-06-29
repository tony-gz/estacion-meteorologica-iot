package com.tony.wheatherstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Alerta meteorológica generada por el motor de reglas (PostgreSQL).
 * Se deduplica por estación + tipo mientras siga ACTIVA (ver research.md R6).
 */
@Entity
@Table(name = "alertas", indexes = {
        @Index(name = "idx_alertas_estacion", columnList = "estacion_id"),
        @Index(name = "idx_alertas_estado", columnList = "estado")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "estacion_id", nullable = false, length = 100)
    private String estacionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoAlerta tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Severidad severidad;

    @Column(nullable = false, length = 255)
    private String mensaje;

    @Column(name = "valor_disparo")
    private double valorDisparo;

    @Column(name = "variable_disparo", length = 50)
    private String variableDisparo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoAlerta estado;

    @Column(name = "detectada_en", nullable = false)
    private Instant detectadaEn;

    @Column(name = "resuelta_en")
    private Instant resueltaEn;
}

package com.tony.wheatherstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Lectura histórica (serie temporal). Insertada según la cadencia
 * {@code ingesta.historial.cada_min}; idempotente por {@code (estacion, medido_en)}.
 * El histórico no guarda {@code viento_grados} (igual que el esquema previo).
 */
@Entity
@Table(name = "lecturas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lectura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estacion_id", nullable = false)
    private Estacion estacion;

    @Column(name = "medido_en", nullable = false)
    private Instant timestamp;

    @Column(name = "recibido_en", nullable = false)
    private Instant recibidoEn;

    private Double temperatura;

    private Double humedad;

    private Double presion;

    @Column(name = "viento_kmh")
    private Double vientoKmh;

    @Column(name = "viento_dir", length = 8)
    private String vientoDir;

    @Column(name = "lluvia_mm")
    private Double lluviaMm;
}

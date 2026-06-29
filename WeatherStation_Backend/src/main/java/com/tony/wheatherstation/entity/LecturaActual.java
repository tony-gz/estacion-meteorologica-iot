package com.tony.wheatherstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Última lectura por estación (snapshot). Una fila por estación: la PK es el
 * {@code estacionId}, de modo que {@code save()} actúa como upsert. Sirve la
 * consulta O(1) de GET /estaciones/{id}/actual. El nombre de columna del instante
 * medido es {@code medido_en} para evitar la palabra reservada {@code timestamp}.
 */
@Entity
@Table(name = "lectura_actual")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LecturaActual {

    @Id
    @Column(name = "estacion_id")
    private UUID estacionId;

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

    @Column(name = "viento_grados")
    private Double vientoGrados;

    @Column(name = "lluvia_mm")
    private Double lluviaMm;
}

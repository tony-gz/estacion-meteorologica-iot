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
import java.util.UUID;

/**
 * Token de autenticación de una estación. Se guarda SOLO el hash; el valor en
 * claro se muestra una única vez al generarse/regenerarse. A lo sumo uno activo
 * por estación (rotación: aprobar/regenerar revoca el anterior).
 */
@Entity
@Table(name = "station_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estacion_id", nullable = false)
    private Estacion estacion;

    /** Hash (SHA-256) del token; el valor en claro nunca se almacena. */
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private boolean activo;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @Column(name = "revocado_en")
    private Instant revocadoEn;

    @Column(name = "ultimo_uso_en")
    private Instant ultimoUsoEn;
}

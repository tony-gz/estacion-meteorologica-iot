package com.tony.wheatherstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Estación de la red (PostgreSQL). Reemplaza a {@code EstacionAdmin} de v1: aquí
 * vive la identidad y el ciclo de vida completo (gobernanza, principio VIII).
 * El {@code uuid} es el identificador público usado por el dispositivo y en las
 * rutas REST; el {@code id} es la PK interna.
 */
@Entity
@Table(name = "estaciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Estacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Identificador público (clave en rutas REST y en /api/device/auth). */
    @Column(nullable = false, unique = true)
    private UUID uuid;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "escuela_id", nullable = false)
    private Escuela escuela;

    /** Usuario responsable (normalmente RESPONSABLE de la escuela). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    private Usuario responsable;

    @Column(length = 255)
    private String ubicacion;

    @Column(length = 120)
    private String municipio;

    private Double latitud;

    private Double longitud;

    private Double altitud;

    @Column(length = 40)
    private String firmware;

    @Column(length = 60)
    private String hardware;

    /** Último RSSI reportado en el heartbeat (dBm). Sin telemetría de batería. */
    @Column(name = "ultimo_rssi")
    private Integer ultimoRssi;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoEstacion estado;

    @Column(name = "fecha_registro", nullable = false)
    private Instant fechaRegistro;

    /** Última publicación o latido aceptado; base para derivar ONLINE/OFFLINE. */
    @Column(name = "ultima_conexion")
    private Instant ultimaConexion;

    @Column(name = "motivo_rechazo", length = 300)
    private String motivoRechazo;

    // ── Configuración remota servida por GET /api/device/config ──
    @Column(name = "intervalo_envio_seg", nullable = false)
    private Integer intervaloEnvioSeg;

    @Column(name = "muestreo_seg", nullable = false)
    private Integer muestreoSeg;

    @Column(name = "zona_horaria", nullable = false, length = 60)
    private String zonaHoraria;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

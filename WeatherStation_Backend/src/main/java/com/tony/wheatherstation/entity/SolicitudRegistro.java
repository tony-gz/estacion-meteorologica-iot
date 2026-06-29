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

import java.time.Instant;
import java.util.UUID;

/**
 * Solicitud de alta de una estación (intake). El alta puede iniciarla un
 * ADMIN/RESPONSABLE o el propio dispositivo (POST /api/device/register). Al
 * aprobarse, materializa una {@link Estacion} en APPROVED y dispara la generación
 * del token.
 */
@Entity
@Table(name = "solicitudes_registro")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudRegistro {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** uuid que usará la estación si se aprueba. */
    @Column(name = "uuid_propuesto", nullable = false)
    private UUID uuidPropuesto;

    @Column(nullable = false, length = 120)
    private String nombre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "escuela_id")
    private Escuela escuela;

    /** Nombre libre de la institución (cuando el solicitante no selecciona una escuela existente). */
    @Column(length = 255)
    private String institucion;

    /** Quién la solicitó; null si la inició el dispositivo (auto-registro). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitante_id")
    private Usuario solicitante;

    @Column(length = 255)
    private String ubicacion;

    @Column(length = 120)
    private String municipio;

    private Double latitud;

    private Double longitud;

    @Column(length = 40)
    private String firmware;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoSolicitud estado;

    @Column(name = "motivo_rechazo", length = 300)
    private String motivoRechazo;

    /** Estación materializada al aprobar (null hasta entonces). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estacion_id")
    private Estacion estacion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resuelta_en")
    private Instant resueltaEn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resuelta_por")
    private Usuario resueltaPor;
}

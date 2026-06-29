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
 * Historial de conexiones/ingesta de una estación (FR-014, FR-021). Permite
 * auditar autenticaciones, publicaciones y detectar estaciones no autorizadas.
 * Nunca registra el token en claro.
 */
@Entity
@Table(name = "connection_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConnectionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Null si el uuid reportado no corresponde a ninguna estación. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estacion_id")
    private Estacion estacion;

    @Column(name = "uuid_reportado", length = 64)
    private String uuidReportado;

    @Column(length = 64)
    private String ip;

    @Column(length = 40)
    private String firmware;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventoConexion evento;

    @Column(length = 255)
    private String detalle;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

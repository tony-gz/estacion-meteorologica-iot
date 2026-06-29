package com.tony.wheatherstation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
 * Escuela que instala estaciones en la red (PostgreSQL). Una escuela agrupa varias
 * estaciones y tiene usuarios {@code RESPONSABLE} asociados.
 */
@Entity
@Table(name = "escuelas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Escuela {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String nombre;

    /** Clave oficial (p. ej. CCT); única si se informa. */
    @Column(unique = true, length = 50)
    private String clave;

    @Column(length = 120)
    private String municipio;

    @Column(length = 255)
    private String ubicacion;

    private Double latitud;

    private Double longitud;

    @Column(length = 150)
    private String director;

    @Column(name = "contacto_email", length = 150)
    private String contactoEmail;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

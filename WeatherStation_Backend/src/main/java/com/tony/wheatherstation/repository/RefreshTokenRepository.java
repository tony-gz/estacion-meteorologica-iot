package com.tony.wheatherstation.repository;

import com.tony.wheatherstation.entity.RefreshToken;
import com.tony.wheatherstation.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken r set r.revocado = true where r.usuario = :usuario and r.revocado = false")
    int revocarTodosDe(@Param("usuario") Usuario usuario);
}

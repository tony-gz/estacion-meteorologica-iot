package com.tony.wheatherstation.dto.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** Envoltura genérica para respuestas paginadas. */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    /** Construye un {@link PageResponse} mapeando el contenido de una {@link Page}. */
    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}

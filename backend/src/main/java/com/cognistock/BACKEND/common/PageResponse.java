package com.cognistock.backend.common;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Generic reusable pagination DTO.
 * Wraps Spring's Page<T> into a clean, predictable API contract
 * without leaking Spring-specific fields (pageable, sort, etc.).
 *
 * Reusable across any paginated endpoint (sales, decisions, audit-logs, etc.).
 */
public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {

    /**
     * Factory method to convert a Spring Data Page into a PageResponse.
     */
    public static <T> PageResponse<T> from(Page<T> springPage) {
        return new PageResponse<>(
            springPage.getContent(),
            springPage.getNumber(),
            springPage.getSize(),
            springPage.getTotalElements(),
            springPage.getTotalPages(),
            springPage.isLast()
        );
    }
}

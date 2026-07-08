package com.aifinancemanager.transaction.web.dto;

import com.aifinancemanager.transaction.domain.Category;
import com.aifinancemanager.transaction.domain.CategoryKind;
import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(UUID id, String name, CategoryKind kind, Instant createdAt) {
  public static CategoryResponse from(Category category) {
    return new CategoryResponse(
        category.getId(), category.getName(), category.getKind(), category.getCreatedAt());
  }
}

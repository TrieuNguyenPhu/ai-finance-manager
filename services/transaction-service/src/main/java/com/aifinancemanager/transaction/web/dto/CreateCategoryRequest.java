package com.aifinancemanager.transaction.web.dto;

import com.aifinancemanager.transaction.domain.CategoryKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
    @NotBlank @Size(max = 120) String name, @NotNull CategoryKind kind) {}

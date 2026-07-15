package com.aifinancemanager.transaction.web.dto;

import com.aifinancemanager.transaction.domain.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAccountRequest(
    @NotBlank @Size(max = 200) String name,
    @NotNull AccountType accountType,
    @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency) {}

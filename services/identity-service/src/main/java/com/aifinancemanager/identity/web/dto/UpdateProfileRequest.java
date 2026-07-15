package com.aifinancemanager.identity.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(max = 200) String displayName,
    @Pattern(regexp = "[A-Z]{3}") String preferredCurrency,
    @Size(max = 32) String locale) {}

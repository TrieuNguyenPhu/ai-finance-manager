package com.aifinancemanager.identity.web.dto;

import com.aifinancemanager.identity.domain.Profile;
import java.time.Instant;

public record ProfileResponse(
    String userId,
    String displayName,
    String preferredCurrency,
    String locale,
    Instant createdAt,
    Instant updatedAt) {

  public static ProfileResponse from(Profile profile) {
    return new ProfileResponse(
        profile.getUserId(),
        profile.getDisplayName(),
        profile.getPreferredCurrency(),
        profile.getLocale(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }
}

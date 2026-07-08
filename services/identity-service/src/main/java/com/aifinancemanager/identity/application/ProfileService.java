package com.aifinancemanager.identity.application;

import com.aifinancemanager.identity.domain.Profile;
import com.aifinancemanager.identity.persistence.ProfileRepository;
import com.aifinancemanager.identity.web.dto.ProfileResponse;
import com.aifinancemanager.identity.web.dto.UpdateProfileRequest;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private final ProfileRepository profileRepository;
  private final Clock clock;

  public ProfileService(ProfileRepository profileRepository, Clock clock) {
    this.profileRepository = profileRepository;
    this.clock = clock;
  }

  @Transactional
  public ProfileResponse getOrCreate(String userId) {
    Profile profile =
        profileRepository
            .findById(userId)
            .orElseGet(
                () -> {
                  Instant now = Instant.now(clock);
                  return profileRepository.save(
                      new Profile(userId, null, "VND", "en-US", now, now));
                });
    return ProfileResponse.from(profile);
  }

  @Transactional
  public ProfileResponse update(String userId, UpdateProfileRequest request) {
    Profile profile =
        profileRepository
            .findById(userId)
            .orElseGet(
                () -> {
                  Instant now = Instant.now(clock);
                  return new Profile(userId, null, "VND", "en-US", now, now);
                });
    profile.update(
        request.displayName(),
        request.preferredCurrency() == null ? null : request.preferredCurrency().toUpperCase(),
        request.locale(),
        Instant.now(clock));
    return ProfileResponse.from(profileRepository.save(profile));
  }
}

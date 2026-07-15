package com.aifinancemanager.identity.web;

import com.aifinancemanager.identity.application.ProfileService;
import com.aifinancemanager.identity.web.dto.ProfileResponse;
import com.aifinancemanager.identity.web.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profile")
public class ProfileController {

  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping
  public ProfileResponse get() {
    return profileService.getOrCreate(UserIdResolver.requireUserId());
  }

  @PutMapping
  public ProfileResponse update(@Valid @RequestBody UpdateProfileRequest request) {
    return profileService.update(UserIdResolver.requireUserId(), request);
  }
}

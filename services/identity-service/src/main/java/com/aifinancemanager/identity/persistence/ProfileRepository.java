package com.aifinancemanager.identity.persistence;

import com.aifinancemanager.identity.domain.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, String> {}

package com.aifinancemanager.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "profiles")
public class Profile {

  @Id
  @Column(name = "user_id", length = 128)
  private String userId;

  @Column(name = "display_name", length = 200)
  private String displayName;

  @Column(name = "preferred_currency", nullable = false, length = 3)
  private String preferredCurrency;

  @Column(nullable = false, length = 32)
  private String locale;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected Profile() {}

  public Profile(
      String userId,
      String displayName,
      String preferredCurrency,
      String locale,
      Instant createdAt,
      Instant updatedAt) {
    this.userId = userId;
    this.displayName = displayName;
    this.preferredCurrency = preferredCurrency;
    this.locale = locale;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public String getUserId() {
    return userId;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getPreferredCurrency() {
    return preferredCurrency;
  }

  public String getLocale() {
    return locale;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void update(String displayName, String preferredCurrency, String locale, Instant now) {
    if (displayName != null) {
      this.displayName = displayName;
    }
    if (preferredCurrency != null) {
      this.preferredCurrency = preferredCurrency;
    }
    if (locale != null) {
      this.locale = locale;
    }
    this.updatedAt = now;
  }
}

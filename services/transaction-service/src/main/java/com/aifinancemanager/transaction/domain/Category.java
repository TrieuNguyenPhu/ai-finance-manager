package com.aifinancemanager.transaction.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {

  @Id
  private UUID id;

  @Column(name = "user_id", nullable = false, length = 128)
  private String userId;

  @Column(nullable = false, length = 120)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private CategoryKind kind;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Category() {}

  public Category(UUID id, String userId, String name, CategoryKind kind, Instant createdAt) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.kind = kind;
    this.createdAt = createdAt;
  }

  public UUID getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public String getName() {
    return name;
  }

  public CategoryKind getKind() {
    return kind;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

package com.aifinancemanager.transaction.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "idempotency_keys")
@IdClass(IdempotencyRecord.Pk.class)
public class IdempotencyRecord {

  @Id
  @Column(name = "user_id", length = 128)
  private String userId;

  @Id
  @Column(name = "idempotency_key", length = 128)
  private String idempotencyKey;

  @Column(name = "request_hash", nullable = false, length = 64)
  private String requestHash;

  @Column(name = "response_body", nullable = false, columnDefinition = "TEXT")
  private String responseBody;

  @Column(name = "status_code", nullable = false)
  private int statusCode;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected IdempotencyRecord() {}

  public IdempotencyRecord(
      String userId,
      String idempotencyKey,
      String requestHash,
      String responseBody,
      int statusCode,
      Instant createdAt) {
    this.userId = userId;
    this.idempotencyKey = idempotencyKey;
    this.requestHash = requestHash;
    this.responseBody = responseBody;
    this.statusCode = statusCode;
    this.createdAt = createdAt;
  }

  public String getUserId() {
    return userId;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public String getRequestHash() {
    return requestHash;
  }

  public String getResponseBody() {
    return responseBody;
  }

  public int getStatusCode() {
    return statusCode;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public static final class Pk implements Serializable {
    private String userId;
    private String idempotencyKey;

    public Pk() {}

    public Pk(String userId, String idempotencyKey) {
      this.userId = userId;
      this.idempotencyKey = idempotencyKey;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) {
        return true;
      }
      if (!(o instanceof Pk pk)) {
        return false;
      }
      return Objects.equals(userId, pk.userId) && Objects.equals(idempotencyKey, pk.idempotencyKey);
    }

    @Override
    public int hashCode() {
      return Objects.hash(userId, idempotencyKey);
    }
  }
}

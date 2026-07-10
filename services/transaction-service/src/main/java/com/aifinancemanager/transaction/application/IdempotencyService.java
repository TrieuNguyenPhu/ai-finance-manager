package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.domain.IdempotencyRecord;
import com.aifinancemanager.transaction.persistence.IdempotencyRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class IdempotencyService {

  private final IdempotencyRepository idempotencyRepository;
  private final IdempotencyLock idempotencyLock;
  private final JsonMapper jsonMapper;
  private final Clock clock;

  public IdempotencyService(
      IdempotencyRepository idempotencyRepository,
      IdempotencyLock idempotencyLock,
      JsonMapper jsonMapper,
      Clock clock) {
    this.idempotencyRepository = idempotencyRepository;
    this.idempotencyLock = idempotencyLock;
    this.jsonMapper = jsonMapper;
    this.clock = clock;
  }

  @Transactional
  public <T> ResponseEntity<T> execute(
      String userId,
      String operation,
      String idempotencyKey,
      Object requestBody,
      Class<T> responseType,
      Supplier<T> action) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new DomainException("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required", 400);
    }
    if (idempotencyKey.length() > 128) {
      throw new DomainException(
          "IDEMPOTENCY_KEY_TOO_LONG", "Idempotency-Key must not exceed 128 characters", 400);
    }
    if (operation == null || operation.isBlank() || operation.length() > 64) {
      throw new IllegalArgumentException("Idempotency operation must contain 1 to 64 characters");
    }
    String scopedKey = hashBytes((operation + "\u0000" + idempotencyKey).getBytes(StandardCharsets.UTF_8));
    idempotencyLock.acquire(userId, scopedKey);

    String hash = hash(requestBody);
    Optional<IdempotencyRecord> existing =
        idempotencyRepository.findById(new IdempotencyRecord.Pk(userId, scopedKey));
    if (existing.isEmpty() && !scopedKey.equals(idempotencyKey)) {
      // Compatibility with records written before operation-scoped keys were
      // introduced. New records always use the scoped digest.
      existing = idempotencyRepository.findById(new IdempotencyRecord.Pk(userId, idempotencyKey));
    }
    if (existing.isPresent()) {
      IdempotencyRecord record = existing.get();
      if (!record.getRequestHash().equals(hash)) {
        throw new DomainException(
            "IDEMPOTENCY_KEY_REUSE", "Idempotency-Key reused with different payload", 409);
      }
      T body = jsonMapper.readValue(record.getResponseBody(), responseType);
      return ResponseEntity.status(record.getStatusCode()).body(body);
    }

    T result = action.get();
    String json = jsonMapper.writeValueAsString(result);
    idempotencyRepository.save(
        new IdempotencyRecord(userId, scopedKey, hash, json, 201, Instant.now(clock)));
    return ResponseEntity.status(201).body(result);
  }

  private String hash(Object requestBody) {
    return hashBytes(jsonMapper.writeValueAsBytes(requestBody));
  }

  private String hashBytes(byte[] bytes) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(bytes));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("Unable to hash request", e);
    }
  }
}

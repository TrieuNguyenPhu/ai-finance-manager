package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.domain.IdempotencyRecord;
import com.aifinancemanager.transaction.persistence.IdempotencyRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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
  private final JsonMapper jsonMapper;
  private final Clock clock;

  public IdempotencyService(
      IdempotencyRepository idempotencyRepository, JsonMapper jsonMapper, Clock clock) {
    this.idempotencyRepository = idempotencyRepository;
    this.jsonMapper = jsonMapper;
    this.clock = clock;
  }

  @Transactional
  public <T> ResponseEntity<T> execute(
      String userId,
      String idempotencyKey,
      Object requestBody,
      Class<T> responseType,
      Supplier<T> action) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new DomainException("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required", 400);
    }
    String hash = hash(requestBody);
    Optional<IdempotencyRecord> existing =
        idempotencyRepository.findById(new IdempotencyRecord.Pk(userId, idempotencyKey));
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
        new IdempotencyRecord(userId, idempotencyKey, hash, json, 201, Instant.now(clock)));
    return ResponseEntity.status(201).body(result);
  }

  private String hash(Object requestBody) {
    try {
      byte[] bytes = jsonMapper.writeValueAsBytes(requestBody);
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(bytes));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("Unable to hash request", e);
    }
  }
}

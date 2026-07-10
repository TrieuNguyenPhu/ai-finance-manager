package com.aifinancemanager.transaction.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aifinancemanager.transaction.domain.IdempotencyRecord;
import com.aifinancemanager.transaction.persistence.IdempotencyRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import tools.jackson.databind.json.JsonMapper;

class IdempotencyServiceTest {

  private IdempotencyRepository repository;
  private IdempotencyLock lock;
  private IdempotencyService service;

  @BeforeEach
  void setUp() {
    repository = mock(IdempotencyRepository.class);
    lock = mock(IdempotencyLock.class);
    service =
        new IdempotencyService(
            repository,
            lock,
            JsonMapper.builder().build(),
            Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC));
  }

  @Test
  void locksBeforeCheckingAndReplaysStoredResponse() {
    IdempotencyRecord stored =
        new IdempotencyRecord(
            "user-1",
            "stored-key",
            requestHash(new TestRequest("same")),
            "{\"value\":\"created\"}",
            201,
            Instant.parse("2026-07-23T00:00:00Z"));
    when(repository.findById(any(IdempotencyRecord.Pk.class))).thenReturn(Optional.of(stored));
    AtomicInteger actions = new AtomicInteger();

    var response =
        service.execute(
            "user-1",
            "accounts.create",
            "retry-key",
            new TestRequest("same"),
            TestResponse.class,
            () -> {
              actions.incrementAndGet();
              return new TestResponse("duplicate");
            });

    assertEquals(201, response.getStatusCode().value());
    assertEquals("created", response.getBody().value());
    assertEquals(0, actions.get());
    InOrder order = inOrder(lock, repository);
    order.verify(lock).acquire(any(String.class), any(String.class));
    order.verify(repository).findById(any(IdempotencyRecord.Pk.class));
    verify(repository, never()).save(any());
  }

  @Test
  void scopesTheSameClientKeyByOperation() {
    when(repository.findById(any(IdempotencyRecord.Pk.class))).thenReturn(Optional.empty());

    service.execute(
        "user-1",
        "accounts.create",
        "same-key",
        new TestRequest("account"),
        TestResponse.class,
        () -> new TestResponse("account"));
    service.execute(
        "user-1",
        "categories.create",
        "same-key",
        new TestRequest("category"),
        TestResponse.class,
        () -> new TestResponse("category"));

    ArgumentCaptor<IdempotencyRecord> records =
        ArgumentCaptor.forClass(IdempotencyRecord.class);
    verify(repository, org.mockito.Mockito.times(2)).save(records.capture());
    List<IdempotencyRecord> saved = records.getAllValues();
    assertNotEquals(saved.get(0).getIdempotencyKey(), saved.get(1).getIdempotencyKey());
    assertEquals(64, saved.get(0).getIdempotencyKey().length());
  }

  @Test
  void rejectsAnOversizedClientKeyBeforeTakingALock() {
    assertThrows(
        DomainException.class,
        () ->
            service.execute(
                "user-1",
                "accounts.create",
                "x".repeat(129),
                new TestRequest("account"),
                TestResponse.class,
                () -> new TestResponse("account")));

    verify(lock, never()).acquire(any(), any());
  }

  private String requestHash(TestRequest request) {
    IdempotencyRepository isolatedRepository = mock(IdempotencyRepository.class);
    IdempotencyLock isolatedLock = mock(IdempotencyLock.class);
    when(isolatedRepository.findById(any())).thenReturn(Optional.empty());
    IdempotencyService isolated =
        new IdempotencyService(
            isolatedRepository,
            isolatedLock,
            JsonMapper.builder().build(),
            Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC));
    isolated.execute(
        "user-1",
        "hash.probe",
        "probe",
        request,
        TestResponse.class,
        () -> new TestResponse("ignored"));
    ArgumentCaptor<IdempotencyRecord> record =
        ArgumentCaptor.forClass(IdempotencyRecord.class);
    verify(isolatedRepository).save(record.capture());
    return record.getValue().getRequestHash();
  }

  private record TestRequest(String value) {}

  private record TestResponse(String value) {}
}

package com.aifinancemanager.transaction.web;

import com.aifinancemanager.transaction.application.IdempotencyService;
import com.aifinancemanager.transaction.application.LedgerService;
import com.aifinancemanager.transaction.web.dto.CreateLedgerEntryRequest;
import com.aifinancemanager.transaction.web.dto.LedgerEntryResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ledger-entries")
public class LedgerController {

  private final LedgerService ledgerService;
  private final IdempotencyService idempotencyService;

  public LedgerController(LedgerService ledgerService, IdempotencyService idempotencyService) {
    this.ledgerService = ledgerService;
    this.idempotencyService = idempotencyService;
  }

  @GetMapping
  public List<LedgerEntryResponse> list(
      @RequestParam(defaultValue = "50") int limit) {
    return ledgerService.list(UserIdResolver.requireUserId(), limit);
  }

  @PostMapping
  public ResponseEntity<LedgerEntryResponse> create(
      @RequestHeader("Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody CreateLedgerEntryRequest request) {
    String userId = UserIdResolver.requireUserId();
    return idempotencyService.execute(
        userId,
        idempotencyKey,
        request,
        LedgerEntryResponse.class,
        () -> ledgerService.create(userId, request));
  }

  @PostMapping("/{id}/reversals")
  public ResponseEntity<LedgerEntryResponse> reverse(
      @PathVariable UUID id, @RequestHeader("Idempotency-Key") String idempotencyKey) {
    String userId = UserIdResolver.requireUserId();
    return idempotencyService.execute(
        userId,
        idempotencyKey,
        id,
        LedgerEntryResponse.class,
        () -> ledgerService.reverse(userId, id));
  }
}

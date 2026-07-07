package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.domain.Account;
import com.aifinancemanager.transaction.domain.EntryType;
import com.aifinancemanager.transaction.domain.LedgerEntry;
import com.aifinancemanager.transaction.domain.OutboxMessage;
import com.aifinancemanager.transaction.persistence.LedgerEntryRepository;
import com.aifinancemanager.transaction.persistence.OutboxRepository;
import com.aifinancemanager.transaction.web.dto.CreateLedgerEntryRequest;
import com.aifinancemanager.transaction.web.dto.LedgerEntryResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class LedgerService {

  private static final DateTimeFormatter YEAR_MONTH =
      DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneOffset.UTC);

  private final LedgerEntryRepository ledgerEntryRepository;
  private final OutboxRepository outboxRepository;
  private final AccountService accountService;
  private final CategoryService categoryService;
  private final JsonMapper jsonMapper;
  private final Clock clock;

  public LedgerService(
      LedgerEntryRepository ledgerEntryRepository,
      OutboxRepository outboxRepository,
      AccountService accountService,
      CategoryService categoryService,
      JsonMapper jsonMapper,
      Clock clock) {
    this.ledgerEntryRepository = ledgerEntryRepository;
    this.outboxRepository = outboxRepository;
    this.accountService = accountService;
    this.categoryService = categoryService;
    this.jsonMapper = jsonMapper;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<LedgerEntryResponse> list(String userId) {
    return ledgerEntryRepository.findByUserIdOrderByOccurredAtDesc(userId).stream()
        .map(LedgerEntryResponse::from)
        .toList();
  }

  @Transactional
  public LedgerEntryResponse create(String userId, CreateLedgerEntryRequest request) {
    if (request.entryType() == EntryType.REVERSAL) {
      throw new DomainException(
          "USE_REVERSAL_ENDPOINT", "Use POST /ledger-entries/{id}/reversals", 400);
    }
    Account account = accountService.requireOwned(request.accountId(), userId);
    Instant occurredAt = request.occurredAt() == null ? Instant.now(clock) : request.occurredAt();
    UUID categoryId = null;
    if (request.categoryId() != null) {
      categoryId = categoryService.requireOwned(request.categoryId(), userId).getId();
    }

    if (request.entryType() == EntryType.TRANSFER) {
      if (request.transferAccountId() == null) {
        throw new DomainException("TRANSFER_TARGET_REQUIRED", "transferAccountId is required", 400);
      }
      Account target = accountService.requireOwned(request.transferAccountId(), userId);
      if (!account.getCurrency().equals(target.getCurrency())) {
        throw new DomainException("CURRENCY_MISMATCH", "Transfer accounts must share currency", 400);
      }
      if (account.getId().equals(target.getId())) {
        throw new DomainException("INVALID_TRANSFER", "Cannot transfer to the same account", 400);
      }
      account.applyDelta(-request.amountMinor());
      target.applyDelta(request.amountMinor());
    } else if (request.entryType() == EntryType.INCOME) {
      account.applyDelta(request.amountMinor());
    } else if (request.entryType() == EntryType.EXPENSE) {
      account.applyDelta(-request.amountMinor());
    } else {
      throw new DomainException("INVALID_ENTRY_TYPE", "Unsupported entry type", 400);
    }

    LedgerEntry entry =
        new LedgerEntry(
            UUID.randomUUID(),
            userId,
            account.getId(),
            categoryId,
            request.entryType(),
            request.amountMinor(),
            account.getCurrency(),
            request.memo(),
            occurredAt,
            request.transferAccountId(),
            null,
            Instant.now(clock));
    LedgerEntry saved = ledgerEntryRepository.save(entry);
    enqueuePostedEvent(saved);
    return LedgerEntryResponse.from(saved);
  }

  @Transactional
  public LedgerEntryResponse reverse(String userId, UUID entryId) {
    LedgerEntry original =
        ledgerEntryRepository
            .findByIdAndUserId(entryId, userId)
            .orElseThrow(() -> new DomainException("ENTRY_NOT_FOUND", "Ledger entry not found", 404));
    if (original.getEntryType() == EntryType.REVERSAL) {
      throw new DomainException("CANNOT_REVERSE_REVERSAL", "Cannot reverse a reversal", 400);
    }
    if (ledgerEntryRepository.existsByReversesEntryId(original.getId())) {
      throw new DomainException("ALREADY_REVERSED", "Entry already reversed", 409);
    }

    Account account = accountService.requireOwned(original.getAccountId(), userId);
    if (original.getEntryType() == EntryType.TRANSFER) {
      Account target = accountService.requireOwned(original.getTransferAccountId(), userId);
      account.applyDelta(original.getAmountMinor());
      target.applyDelta(-original.getAmountMinor());
    } else if (original.getEntryType() == EntryType.INCOME) {
      account.applyDelta(-original.getAmountMinor());
    } else if (original.getEntryType() == EntryType.EXPENSE) {
      account.applyDelta(original.getAmountMinor());
    }

    LedgerEntry reversal =
        new LedgerEntry(
            UUID.randomUUID(),
            userId,
            original.getAccountId(),
            original.getCategoryId(),
            EntryType.REVERSAL,
            original.getAmountMinor(),
            original.getCurrency(),
            "Reversal of " + original.getId(),
            Instant.now(clock),
            original.getTransferAccountId(),
            original.getId(),
            Instant.now(clock));
    LedgerEntry saved = ledgerEntryRepository.save(reversal);
    enqueuePostedEvent(saved);
    return LedgerEntryResponse.from(saved);
  }

  private void enqueuePostedEvent(LedgerEntry entry) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("eventId", UUID.randomUUID().toString());
    payload.put("userId", entry.getUserId());
    payload.put("entryId", entry.getId().toString());
    payload.put("accountId", entry.getAccountId().toString());
    payload.put("categoryId", entry.getCategoryId() == null ? null : entry.getCategoryId().toString());
    payload.put("entryType", entry.getEntryType().name());
    payload.put("amountMinor", entry.getAmountMinor());
    payload.put("currency", entry.getCurrency());
    payload.put("occurredAt", entry.getOccurredAt().toString());
    payload.put("yearMonth", YEAR_MONTH.format(entry.getOccurredAt()));
    payload.put("reversesEntryId", entry.getReversesEntryId() == null ? null : entry.getReversesEntryId().toString());
    outboxRepository.save(
        new OutboxMessage(
            UUID.randomUUID(),
            "ledger_entry",
            entry.getId(),
            "transaction.ledger_entry.posted",
            jsonMapper.writeValueAsString(payload),
            Instant.now(clock)));
  }
}

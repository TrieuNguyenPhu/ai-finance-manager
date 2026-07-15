package com.aifinancemanager.transaction.web.dto;

import com.aifinancemanager.transaction.domain.EntryType;
import com.aifinancemanager.transaction.domain.LedgerEntry;
import java.time.Instant;
import java.util.UUID;

public record LedgerEntryResponse(
    UUID id,
    UUID accountId,
    UUID categoryId,
    EntryType entryType,
    long amountMinor,
    String currency,
    String memo,
    Instant occurredAt,
    UUID transferAccountId,
    UUID reversesEntryId,
    Instant createdAt) {

  public static LedgerEntryResponse from(LedgerEntry entry) {
    return new LedgerEntryResponse(
        entry.getId(),
        entry.getAccountId(),
        entry.getCategoryId(),
        entry.getEntryType(),
        entry.getAmountMinor(),
        entry.getCurrency(),
        entry.getMemo(),
        entry.getOccurredAt(),
        entry.getTransferAccountId(),
        entry.getReversesEntryId(),
        entry.getCreatedAt());
  }
}

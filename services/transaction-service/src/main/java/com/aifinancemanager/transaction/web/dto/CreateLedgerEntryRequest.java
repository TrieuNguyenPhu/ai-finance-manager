package com.aifinancemanager.transaction.web.dto;

import com.aifinancemanager.transaction.domain.EntryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record CreateLedgerEntryRequest(
    @NotNull UUID accountId,
    UUID categoryId,
    @NotNull EntryType entryType,
    @Positive long amountMinor,
    @Size(max = 500) String memo,
    Instant occurredAt,
    UUID transferAccountId) {}

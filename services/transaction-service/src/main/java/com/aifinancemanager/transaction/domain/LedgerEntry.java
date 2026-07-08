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
@Table(name = "ledger_entries")
public class LedgerEntry {

  @Id
  private UUID id;

  @Column(name = "user_id", nullable = false, length = 128)
  private String userId;

  @Column(name = "account_id", nullable = false)
  private UUID accountId;

  @Column(name = "category_id")
  private UUID categoryId;

  @Enumerated(EnumType.STRING)
  @Column(name = "entry_type", nullable = false, length = 16)
  private EntryType entryType;

  @Column(name = "amount_minor", nullable = false)
  private long amountMinor;

  @Column(nullable = false, length = 3)
  private String currency;

  @Column(length = 500)
  private String memo;

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt;

  @Column(name = "transfer_account_id")
  private UUID transferAccountId;

  @Column(name = "reverses_entry_id")
  private UUID reversesEntryId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected LedgerEntry() {}

  public LedgerEntry(
      UUID id,
      String userId,
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
    if (amountMinor <= 0) {
      throw new IllegalArgumentException("amountMinor must be positive");
    }
    this.id = id;
    this.userId = userId;
    this.accountId = accountId;
    this.categoryId = categoryId;
    this.entryType = entryType;
    this.amountMinor = amountMinor;
    this.currency = currency;
    this.memo = memo;
    this.occurredAt = occurredAt;
    this.transferAccountId = transferAccountId;
    this.reversesEntryId = reversesEntryId;
    this.createdAt = createdAt;
  }

  public UUID getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public UUID getAccountId() {
    return accountId;
  }

  public UUID getCategoryId() {
    return categoryId;
  }

  public EntryType getEntryType() {
    return entryType;
  }

  public long getAmountMinor() {
    return amountMinor;
  }

  public String getCurrency() {
    return currency;
  }

  public String getMemo() {
    return memo;
  }

  public Instant getOccurredAt() {
    return occurredAt;
  }

  public UUID getTransferAccountId() {
    return transferAccountId;
  }

  public UUID getReversesEntryId() {
    return reversesEntryId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

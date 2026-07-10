package com.aifinancemanager.transaction.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts")
public class Account {

  @Id
  private UUID id;

  @Column(name = "user_id", nullable = false, length = 128)
  private String userId;

  @Column(nullable = false, length = 200)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "account_type", nullable = false, length = 32)
  private AccountType accountType;

  @Column(nullable = false, length = 3)
  private String currency;

  @Column(name = "balance_minor", nullable = false)
  private long balanceMinor;

  @Version
  @Column(nullable = false)
  private long version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Account() {}

  public Account(UUID id, String userId, String name, AccountType accountType, String currency, Instant createdAt) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.accountType = accountType;
    this.currency = currency;
    this.balanceMinor = 0L;
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

  public AccountType getAccountType() {
    return accountType;
  }

  public String getCurrency() {
    return currency;
  }

  public long getBalanceMinor() {
    return balanceMinor;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void applyDelta(long deltaMinor) {
    this.balanceMinor = Math.addExact(this.balanceMinor, deltaMinor);
  }
}

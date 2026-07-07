package com.aifinancemanager.transaction.application;

import com.aifinancemanager.transaction.domain.Account;
import com.aifinancemanager.transaction.persistence.AccountRepository;
import com.aifinancemanager.transaction.web.dto.AccountResponse;
import com.aifinancemanager.transaction.web.dto.CreateAccountRequest;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

  private final AccountRepository accountRepository;
  private final Clock clock;

  public AccountService(AccountRepository accountRepository, Clock clock) {
    this.accountRepository = accountRepository;
    this.clock = clock;
  }

  @Transactional
  public AccountResponse create(String userId, CreateAccountRequest request) {
    Account account =
        new Account(
            UUID.randomUUID(),
            userId,
            request.name().trim(),
            request.accountType(),
            request.currency().toUpperCase(),
            Instant.now(clock));
    return AccountResponse.from(accountRepository.save(account));
  }

  @Transactional(readOnly = true)
  public List<AccountResponse> list(String userId) {
    return accountRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
        .map(AccountResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public Account requireOwned(UUID accountId, String userId) {
    return accountRepository
        .findByIdAndUserId(accountId, userId)
        .orElseThrow(() -> new DomainException("ACCOUNT_NOT_FOUND", "Account not found", 404));
  }
}

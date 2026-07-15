package com.aifinancemanager.transaction.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aifinancemanager.transaction.domain.Account;
import com.aifinancemanager.transaction.domain.AccountType;
import com.aifinancemanager.transaction.domain.EntryType;
import com.aifinancemanager.transaction.domain.LedgerEntry;
import com.aifinancemanager.transaction.persistence.LedgerEntryRepository;
import com.aifinancemanager.transaction.persistence.OutboxRepository;
import com.aifinancemanager.transaction.web.dto.CreateLedgerEntryRequest;
import com.aifinancemanager.transaction.web.dto.LedgerEntryResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class LedgerServiceTest {

  @Mock private LedgerEntryRepository ledgerEntryRepository;
  @Mock private OutboxRepository outboxRepository;
  @Mock private AccountService accountService;
  @Mock private CategoryService categoryService;

  private LedgerService ledgerService;
  private final Clock clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);

  @BeforeEach
  void setUp() {
    ledgerService =
        new LedgerService(
            ledgerEntryRepository,
            outboxRepository,
            accountService,
            categoryService,
            JsonMapper.builder().build(),
            clock);
  }

  @Test
  void createExpenseDecreasesBalance() {
    UUID accountId = UUID.randomUUID();
    Account account =
        new Account(accountId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    account.applyDelta(100_000L);
    when(accountService.requireOwned(accountId, "user-1")).thenReturn(account);
    when(ledgerEntryRepository.save(any(LedgerEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    CreateLedgerEntryRequest request =
        new CreateLedgerEntryRequest(
            accountId, null, EntryType.EXPENSE, 25_000L, "Coffee", null, null);
    LedgerEntryResponse response = ledgerService.create("user-1", request);

    assertEquals(EntryType.EXPENSE, response.entryType());
    assertEquals(25_000L, response.amountMinor());
    assertEquals(75_000L, account.getBalanceMinor());
    verify(outboxRepository).save(any());
  }

  @Test
  void reverseRejectsSecondReversal() {
    UUID entryId = UUID.randomUUID();
    LedgerEntry original =
        new LedgerEntry(
            entryId,
            "user-1",
            UUID.randomUUID(),
            null,
            EntryType.EXPENSE,
            10L,
            "VND",
            "x",
            Instant.now(clock),
            null,
            null,
            Instant.now(clock));
    when(ledgerEntryRepository.findByIdAndUserId(entryId, "user-1"))
        .thenReturn(java.util.Optional.of(original));
    when(ledgerEntryRepository.existsByReversesEntryId(entryId)).thenReturn(true);

    DomainException ex =
        assertThrows(DomainException.class, () -> ledgerService.reverse("user-1", entryId));
    assertEquals("ALREADY_REVERSED", ex.getCode());
  }

  @Test
  void createPersistsPositiveAmountOnly() {
    ArgumentCaptor<LedgerEntry> captor = ArgumentCaptor.forClass(LedgerEntry.class);
    UUID accountId = UUID.randomUUID();
    Account account =
        new Account(accountId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    when(accountService.requireOwned(accountId, "user-1")).thenReturn(account);
    when(ledgerEntryRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

    ledgerService.create(
        "user-1",
        new CreateLedgerEntryRequest(accountId, null, EntryType.INCOME, 5_000L, null, null, null));

    assertEquals(5_000L, captor.getValue().getAmountMinor());
  }
}

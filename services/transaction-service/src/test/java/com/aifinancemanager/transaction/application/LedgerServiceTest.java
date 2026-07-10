package com.aifinancemanager.transaction.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aifinancemanager.transaction.domain.Account;
import com.aifinancemanager.transaction.domain.AccountType;
import com.aifinancemanager.transaction.domain.Category;
import com.aifinancemanager.transaction.domain.CategoryKind;
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
import java.util.Map;
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
  private final JsonMapper jsonMapper = JsonMapper.builder().build();

  @BeforeEach
  void setUp() {
    ledgerService =
        new LedgerService(
            ledgerEntryRepository,
            outboxRepository,
            accountService,
            categoryService,
            jsonMapper,
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
    when(ledgerEntryRepository.findByIdAndUserIdForUpdate(entryId, "user-1"))
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

  @Test
  void postedExpenseEventCarriesCanonicalCategoryImpact() {
    ArgumentCaptor<OutboxMessage> outbox = ArgumentCaptor.forClass(OutboxMessage.class);
    UUID accountId = UUID.randomUUID();
    UUID categoryId = UUID.randomUUID();
    Account account =
        new Account(accountId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    Category category =
        new Category(
            categoryId,
            "user-1",
            "Food",
            CategoryKind.EXPENSE,
            Instant.now(clock));
    when(accountService.requireOwned(accountId, "user-1")).thenReturn(account);
    when(categoryService.requireOwned(categoryId, "user-1")).thenReturn(category);
    when(ledgerEntryRepository.save(any(LedgerEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ledgerService.create(
        "user-1",
        new CreateLedgerEntryRequest(
            accountId, categoryId, EntryType.EXPENSE, 45_000L, "Lunch", null, null));

    verify(outboxRepository).save(outbox.capture());
    Map<String, Object> payload = payload(outbox.getValue());
    assertEquals(1, number(payload, "eventVersion"));
    assertEquals(outbox.getValue().getId().toString(), payload.get("eventId"));
    assertEquals(categoryId.toString(), payload.get("categoryId"));
    assertEquals("Food", payload.get("categoryName"));
    assertEquals("EXPENSE", payload.get("effectEntryType"));
    assertEquals(0L, number(payload, "incomeDeltaMinor"));
    assertEquals(45_000L, number(payload, "expenseDeltaMinor"));
    assertEquals(45_000L, number(payload, "categorySpendDeltaMinor"));
  }

  @Test
  void uncategorizedExpenseDoesNotCreateCategorySpend() {
    ArgumentCaptor<OutboxMessage> outbox = ArgumentCaptor.forClass(OutboxMessage.class);
    UUID accountId = UUID.randomUUID();
    Account account =
        new Account(accountId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    when(accountService.requireOwned(accountId, "user-1")).thenReturn(account);
    when(ledgerEntryRepository.save(any(LedgerEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ledgerService.create(
        "user-1",
        new CreateLedgerEntryRequest(
            accountId, null, EntryType.EXPENSE, 12_000L, "Uncategorized", null, null));

    verify(outboxRepository).save(outbox.capture());
    Map<String, Object> payload = payload(outbox.getValue());
    assertEquals(null, payload.get("categoryId"));
    assertEquals(null, payload.get("categoryName"));
    assertEquals(12_000L, number(payload, "expenseDeltaMinor"));
    assertEquals(0L, number(payload, "categorySpendDeltaMinor"));
  }

  @Test
  void rejectsCategoryWhoseKindDoesNotMatchEntryType() {
    UUID accountId = UUID.randomUUID();
    UUID categoryId = UUID.randomUUID();
    Category incomeCategory =
        new Category(
            categoryId,
            "user-1",
            "Salary",
            CategoryKind.INCOME,
            Instant.now(clock));
    when(categoryService.requireOwned(categoryId, "user-1")).thenReturn(incomeCategory);

    DomainException error =
        assertThrows(
            DomainException.class,
            () ->
                ledgerService.create(
                    "user-1",
                    new CreateLedgerEntryRequest(
                        accountId,
                        categoryId,
                        EntryType.EXPENSE,
                        12_000L,
                        "Lunch",
                        null,
                        null)));

    assertEquals("CATEGORY_KIND_MISMATCH", error.getCode());
  }

  @Test
  void reversingIncomeEmitsNegativeIncomeOnly() {
    UUID entryId = UUID.randomUUID();
    UUID accountId = UUID.randomUUID();
    Account account =
        new Account(accountId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    LedgerEntry original =
        ledgerEntry(
            entryId,
            accountId,
            null,
            EntryType.INCOME,
            90_000L,
            null,
            Instant.parse("2026-06-30T20:00:00Z"));
    when(ledgerEntryRepository.findByIdAndUserIdForUpdate(entryId, "user-1"))
        .thenReturn(java.util.Optional.of(original));
    when(ledgerEntryRepository.existsByReversesEntryId(entryId)).thenReturn(false);
    when(accountService.requireOwned(accountId, "user-1")).thenReturn(account);
    when(ledgerEntryRepository.save(any(LedgerEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    ArgumentCaptor<OutboxMessage> outbox = ArgumentCaptor.forClass(OutboxMessage.class);

    ledgerService.reverse("user-1", entryId);

    verify(outboxRepository).save(outbox.capture());
    Map<String, Object> payload = payload(outbox.getValue());
    assertEquals("REVERSAL", payload.get("entryType"));
    assertEquals("INCOME", payload.get("effectEntryType"));
    assertEquals(-90_000L, number(payload, "incomeDeltaMinor"));
    assertEquals(0L, number(payload, "expenseDeltaMinor"));
    assertEquals(0L, number(payload, "categorySpendDeltaMinor"));
    assertEquals("2026-06", payload.get("yearMonth"));
  }

  @Test
  void reversingExpenseEmitsExactCategoryInverse() {
    UUID entryId = UUID.randomUUID();
    UUID accountId = UUID.randomUUID();
    UUID categoryId = UUID.randomUUID();
    Account account =
        new Account(accountId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    Category category =
        new Category(
            categoryId,
            "user-1",
            "Food",
            CategoryKind.EXPENSE,
            Instant.now(clock));
    LedgerEntry original =
        ledgerEntry(
            entryId,
            accountId,
            categoryId,
            EntryType.EXPENSE,
            35_000L,
            null,
            Instant.parse("2026-05-15T00:00:00Z"));
    when(ledgerEntryRepository.findByIdAndUserIdForUpdate(entryId, "user-1"))
        .thenReturn(java.util.Optional.of(original));
    when(ledgerEntryRepository.existsByReversesEntryId(entryId)).thenReturn(false);
    when(accountService.requireOwned(accountId, "user-1")).thenReturn(account);
    when(categoryService.requireOwned(categoryId, "user-1")).thenReturn(category);
    when(ledgerEntryRepository.save(any(LedgerEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    ArgumentCaptor<OutboxMessage> outbox = ArgumentCaptor.forClass(OutboxMessage.class);

    ledgerService.reverse("user-1", entryId);

    verify(outboxRepository).save(outbox.capture());
    Map<String, Object> payload = payload(outbox.getValue());
    assertEquals("EXPENSE", payload.get("effectEntryType"));
    assertEquals(categoryId.toString(), payload.get("categoryId"));
    assertEquals("Food", payload.get("categoryName"));
    assertEquals(0L, number(payload, "incomeDeltaMinor"));
    assertEquals(-35_000L, number(payload, "expenseDeltaMinor"));
    assertEquals(-35_000L, number(payload, "categorySpendDeltaMinor"));
    assertEquals("2026-05", payload.get("yearMonth"));
  }

  @Test
  void reversingTransferHasNoReportingOrCategoryImpact() {
    UUID entryId = UUID.randomUUID();
    UUID sourceId = UUID.randomUUID();
    UUID targetId = UUID.randomUUID();
    Account source =
        new Account(sourceId, "user-1", "Cash", AccountType.CASH, "VND", Instant.now(clock));
    Account target =
        new Account(targetId, "user-1", "Bank", AccountType.BANK, "VND", Instant.now(clock));
    LedgerEntry original =
        ledgerEntry(
            entryId,
            sourceId,
            null,
            EntryType.TRANSFER,
            10_000L,
            targetId,
            Instant.parse("2026-04-01T00:00:00Z"));
    when(ledgerEntryRepository.findByIdAndUserIdForUpdate(entryId, "user-1"))
        .thenReturn(java.util.Optional.of(original));
    when(ledgerEntryRepository.existsByReversesEntryId(entryId)).thenReturn(false);
    when(accountService.requireOwned(sourceId, "user-1")).thenReturn(source);
    when(accountService.requireOwned(targetId, "user-1")).thenReturn(target);
    when(ledgerEntryRepository.save(any(LedgerEntry.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    ArgumentCaptor<OutboxMessage> outbox = ArgumentCaptor.forClass(OutboxMessage.class);

    ledgerService.reverse("user-1", entryId);

    verify(outboxRepository).save(outbox.capture());
    Map<String, Object> payload = payload(outbox.getValue());
    assertEquals("TRANSFER", payload.get("effectEntryType"));
    assertEquals(0L, number(payload, "incomeDeltaMinor"));
    assertEquals(0L, number(payload, "expenseDeltaMinor"));
    assertEquals(0L, number(payload, "categorySpendDeltaMinor"));
  }

  private LedgerEntry ledgerEntry(
      UUID id,
      UUID accountId,
      UUID categoryId,
      EntryType entryType,
      long amountMinor,
      UUID transferAccountId,
      Instant occurredAt) {
    return new LedgerEntry(
        id,
        "user-1",
        accountId,
        categoryId,
        entryType,
        amountMinor,
        "VND",
        "test",
        occurredAt,
        transferAccountId,
        null,
        occurredAt);
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> payload(OutboxMessage message) {
    return jsonMapper.readValue(message.getPayload(), Map.class);
  }

  private long number(Map<String, Object> payload, String field) {
    return ((Number) payload.get(field)).longValue();
  }
}

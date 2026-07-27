package budget

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestCreateRequiresIdempotencyKeyBeforeOpeningTransaction(t *testing.T) {
	service := NewService(nil)

	_, err := service.Create(
		context.Background(),
		"user-1",
		"",
		CreateInput{},
	)

	if !errors.Is(err, ErrValidation) {
		t.Fatalf("Create() error = %v, want ErrValidation", err)
	}
}

func TestNormalizeCreateInputCanonicalizesDefaults(t *testing.T) {
	categoryID := "0C40E8EF-8357-4742-95D9-DE0F23E84E15"

	normalized, err := normalizeCreateInput(CreateInput{
		CategoryID:   categoryID,
		CategoryName: "  Food  ",
		YearMonth:    "2026-07",
		LimitMinor:   500_000,
		Currency:     "VND",
	})

	if err != nil {
		t.Fatalf("normalizeCreateInput() error = %v", err)
	}
	if normalized.CategoryID != "0c40e8ef-8357-4742-95d9-de0f23e84e15" {
		t.Fatalf("CategoryID = %q, want canonical UUID", normalized.CategoryID)
	}
	if normalized.CategoryName != "Food" || normalized.ThresholdPercent != 80 {
		t.Fatalf(
			"normalized name/threshold = %q/%d, want Food/80",
			normalized.CategoryName,
			normalized.ThresholdPercent,
		)
	}
}

func TestNormalizeCreateInputRejectsUnsafeLimit(t *testing.T) {
	_, err := normalizeCreateInput(CreateInput{
		CategoryName: "Food",
		YearMonth:    "2026-07",
		LimitMinor:   maxSafeMinor + 1,
		Currency:     "VND",
	})

	if !errors.Is(err, ErrValidation) {
		t.Fatalf("normalizeCreateInput() error = %v, want ErrValidation", err)
	}
}

func TestDecodeV1CategoryImpactUsesSignedDeltaAndIdentity(t *testing.T) {
	delta := int64(-35_000)
	payload := ledgerPayload{
		EventVersion:            1,
		EventID:                 "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07",
		EventType:               ledgerEntryPostedEvent,
		UserID:                  "user-1",
		EntryType:               "REVERSAL",
		EffectEntryType:         "EXPENSE",
		AmountMinor:             35_000,
		CategoryID:              "0c40e8ef-8357-4742-95d9-de0f23e84e15",
		CategoryName:            "Food",
		Currency:                "VND",
		YearMonth:               "2026-05",
		CategorySpendDeltaMinor: &delta,
	}

	decoded, impact, err := decodeCategoryImpact(mustLedgerJSON(t, payload))
	if err != nil {
		t.Fatalf("decodeCategoryImpact() error = %v", err)
	}
	if decoded.CategoryID != payload.CategoryID || decoded.CategoryName != "Food" {
		t.Fatalf("category identity = %s/%s, want %s/Food",
			decoded.CategoryID, decoded.CategoryName, payload.CategoryID)
	}
	if impact.deltaMinor != -35_000 {
		t.Fatalf("delta = %d, want -35000", impact.deltaMinor)
	}
}

func TestDecodeV1RejectsNonZeroSpendWithoutCategoryIdentity(t *testing.T) {
	delta := int64(12_000)
	payload := ledgerPayload{
		EventVersion:            1,
		EventID:                 "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07",
		EventType:               ledgerEntryPostedEvent,
		UserID:                  "user-1",
		EntryType:               "EXPENSE",
		EffectEntryType:         "EXPENSE",
		AmountMinor:             12_000,
		Currency:                "VND",
		YearMonth:               "2026-07",
		CategorySpendDeltaMinor: &delta,
	}

	if _, _, err := decodeCategoryImpact(mustLedgerJSON(t, payload)); err == nil {
		t.Fatal("decodeCategoryImpact() error = nil, want missing categoryId error")
	}
}

func TestDecodeLegacyCategorizedExpenseRequiresV1Replay(t *testing.T) {
	payload := ledgerPayload{
		EventVersion: 0,
		EventID:      "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07",
		UserID:       "user-1",
		EntryType:    "EXPENSE",
		AmountMinor:  12_000,
		CategoryID:   "0c40e8ef-8357-4742-95d9-de0f23e84e15",
		Currency:     "VND",
		YearMonth:    "2026-07",
	}

	if _, _, err := decodeCategoryImpact(mustLedgerJSON(t, payload)); err == nil {
		t.Fatal("decodeCategoryImpact() error = nil, want v1 replay error")
	}
}

func TestDecodeV1CategoryImpactRejectsAnotherEventType(t *testing.T) {
	delta := int64(0)
	payload := ledgerPayload{
		EventVersion:            1,
		EventID:                 "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07",
		EventType:               "transaction.account.created",
		UserID:                  "user-1",
		Currency:                "VND",
		YearMonth:               "2026-07",
		CategorySpendDeltaMinor: &delta,
	}

	if _, _, err := decodeCategoryImpact(mustLedgerJSON(t, payload)); err == nil {
		t.Fatal("decodeCategoryImpact() error = nil, want unsupported event type")
	}
}

func TestDecodeV1CategoryImpactRejectsInconsistentSignedDelta(t *testing.T) {
	delta := int64(35_000)
	payload := ledgerPayload{
		EventVersion:            1,
		EventID:                 "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07",
		EventType:               ledgerEntryPostedEvent,
		UserID:                  "user-1",
		EntryType:               "REVERSAL",
		EffectEntryType:         "EXPENSE",
		AmountMinor:             35_000,
		CategoryID:              "0c40e8ef-8357-4742-95d9-de0f23e84e15",
		CategoryName:            "Food",
		Currency:                "VND",
		YearMonth:               "2026-07",
		CategorySpendDeltaMinor: &delta,
	}

	if _, _, err := decodeCategoryImpact(mustLedgerJSON(t, payload)); err == nil {
		t.Fatal("decodeCategoryImpact() error = nil, want inconsistent impact")
	}
}

func TestDecodeV1CategoryImpactRejectsInvalidProjectionIdentity(t *testing.T) {
	delta := int64(35_000)
	valid := ledgerPayload{
		EventVersion:            1,
		EventID:                 "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07",
		EventType:               ledgerEntryPostedEvent,
		UserID:                  "user-1",
		EntryType:               "EXPENSE",
		EffectEntryType:         "EXPENSE",
		AmountMinor:             35_000,
		CategoryID:              "0c40e8ef-8357-4742-95d9-de0f23e84e15",
		CategoryName:            "Food",
		Currency:                "VND",
		YearMonth:               "2026-07",
		CategorySpendDeltaMinor: &delta,
	}
	tests := map[string]func(*ledgerPayload){
		"blank user":        func(payload *ledgerPayload) { payload.UserID = " " },
		"invalid category":  func(payload *ledgerPayload) { payload.CategoryID = "not-a-uuid" },
		"blank category":    func(payload *ledgerPayload) { payload.CategoryName = " " },
		"invalid currency":  func(payload *ledgerPayload) { payload.Currency = "vnd" },
		"invalid yearMonth": func(payload *ledgerPayload) { payload.YearMonth = "2026-13" },
	}

	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			payload := valid
			mutate(&payload)
			if _, _, err := decodeCategoryImpact(mustLedgerJSON(t, payload)); err == nil {
				t.Fatal("decodeCategoryImpact() error = nil, want invalid identity error")
			}
		})
	}
}

func TestCanonicalEventIDRequiresMatchingV1PayloadIdentity(t *testing.T) {
	const eventID = "45fd2fd9-a6fe-4fcd-a42b-960291b1ae07"

	if _, err := canonicalEventID(eventID, ledgerPayload{EventVersion: 1}); err == nil {
		t.Fatal("canonicalEventID() error = nil, want missing payload eventId error")
	}
	if _, err := canonicalEventID(
		"23f9a417-7c36-45ad-aa64-178f0e306a16",
		ledgerPayload{EventVersion: 1, EventID: eventID},
	); err == nil {
		t.Fatal("canonicalEventID() error = nil, want envelope mismatch error")
	}

	canonical, err := canonicalEventID(
		strings.ToUpper(eventID),
		ledgerPayload{EventVersion: 1, EventID: eventID},
	)
	if err != nil {
		t.Fatalf("canonicalEventID() error = %v", err)
	}
	if canonical != eventID {
		t.Fatalf("canonicalEventID() = %q, want %q", canonical, eventID)
	}
}

func TestCategoryProjectionIsIdempotentOrderIndependentAndCategoryScoped(t *testing.T) {
	foodID := "80d2585a-34da-4af7-a286-71f0067281b2"
	travelID := "20c02bd3-3e3f-4110-a81c-b446444312c0"
	postedFood, reversedFood, postedTravel := int64(45_000), int64(-45_000), int64(20_000)
	foodExpense := categoryPayload(
		"7625930a-2842-4106-a215-cec0081b2c87", foodID, "Food", postedFood)
	foodReversal := categoryPayload(
		"c5180c06-6b95-4d64-8138-148b2fa0b77e", foodID, "Food", reversedFood)
	travelExpense := categoryPayload(
		"6ee69399-62c7-4be9-a0a5-c3380ded912f", travelID, "Travel", postedTravel)

	forward := reduceCategorySpend(
		t, []ledgerPayload{foodExpense, travelExpense, foodReversal, foodExpense})
	reversed := reduceCategorySpend(
		t, []ledgerPayload{foodReversal, travelExpense, foodExpense, foodReversal})

	if forward[foodID] != 0 || reversed[foodID] != 0 {
		t.Fatalf("food totals forward=%d reversed=%d, want 0",
			forward[foodID], reversed[foodID])
	}
	if forward[travelID] != 20_000 || reversed[travelID] != 20_000 {
		t.Fatalf("travel totals forward=%d reversed=%d, want 20000",
			forward[travelID], reversed[travelID])
	}
}

func TestProjectionCanExistBeforeBudgetAndNegativeTransientIsNotDisplayed(t *testing.T) {
	categoryID := "b14b154e-e3ea-4402-a7ef-75be0950c819"
	expense := int64(70_000)
	projection := reduceCategorySpend(t, []ledgerPayload{
		categoryPayload("f7ddf851-ac19-4f90-bdb7-522e27a3f43a", categoryID, "Food", expense),
	})

	// Budget creation reads category_spend, so the already-projected expense is its initial progress.
	if projection[categoryID] != 70_000 {
		t.Fatalf("pre-budget projection = %d, want 70000", projection[categoryID])
	}
	if displaySpent(-1) != 0 {
		t.Fatalf("displaySpent(-1) = %d, want 0", displaySpent(-1))
	}
}

func categoryPayload(eventID, categoryID, categoryName string, delta int64) ledgerPayload {
	entryType := "EXPENSE"
	amount := delta
	if delta < 0 {
		entryType = "REVERSAL"
		amount = -delta
	}
	return ledgerPayload{
		EventVersion:            1,
		EventID:                 eventID,
		EventType:               ledgerEntryPostedEvent,
		UserID:                  "user-1",
		EntryType:               entryType,
		EffectEntryType:         "EXPENSE",
		AmountMinor:             amount,
		CategoryID:              categoryID,
		CategoryName:            categoryName,
		Currency:                "VND",
		YearMonth:               "2026-07",
		CategorySpendDeltaMinor: &delta,
	}
}

func reduceCategorySpend(t *testing.T, payloads []ledgerPayload) map[string]int64 {
	t.Helper()
	seen := make(map[string]struct{})
	totals := make(map[string]int64)
	for _, payload := range payloads {
		if _, duplicate := seen[payload.EventID]; duplicate {
			continue
		}
		decoded, impact, err := decodeCategoryImpact(mustLedgerJSON(t, payload))
		if err != nil {
			t.Fatalf("decodeCategoryImpact() error = %v", err)
		}
		seen[payload.EventID] = struct{}{}
		totals[decoded.CategoryID] += impact.deltaMinor
	}
	return totals
}

func mustLedgerJSON(t *testing.T, value any) string {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	return string(encoded)
}

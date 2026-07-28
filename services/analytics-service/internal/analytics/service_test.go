package analytics

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestDecodeV1ReportingImpactUsesSignedDeltas(t *testing.T) {
	income := int64(-90_000)
	expense := int64(0)
	payload := ledgerPayload{
		EventVersion:      1,
		EventID:           "17ac0ed3-a14f-4cb2-8ca1-a4ba832cbe44",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "REVERSAL",
		EffectEntryType:   "INCOME",
		AmountMinor:       90_000,
		Currency:          "VND",
		YearMonth:         "2026-06",
		IncomeDeltaMinor:  &income,
		ExpenseDeltaMinor: &expense,
	}

	decoded, impact, err := decodeReportingImpact(mustJSON(t, payload))
	if err != nil {
		t.Fatalf("decodeReportingImpact() error = %v", err)
	}
	if decoded.EventVersion != 1 {
		t.Fatalf("event version = %d, want 1", decoded.EventVersion)
	}
	if impact.incomeDeltaMinor != -90_000 || impact.expenseDeltaMinor != 0 {
		t.Fatalf("impact = %+v, want income=-90000 expense=0", impact)
	}
}

func TestSignedReportingImpactsAreIdempotentAndOrderIndependent(t *testing.T) {
	postedIncome, zero := int64(125_000), int64(0)
	reversedIncome := int64(-125_000)
	posted := ledgerPayload{
		EventVersion:      1,
		EventID:           "48e31225-69a4-4732-890f-0484991bc94e",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "INCOME",
		EffectEntryType:   "INCOME",
		AmountMinor:       125_000,
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &postedIncome,
		ExpenseDeltaMinor: &zero,
	}
	reversal := ledgerPayload{
		EventVersion:      1,
		EventID:           "2d372dad-7578-44fa-9cb2-87d1568fcdb5",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "REVERSAL",
		EffectEntryType:   "INCOME",
		AmountMinor:       125_000,
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &reversedIncome,
		ExpenseDeltaMinor: &zero,
	}

	forward := reduceReporting(t, []ledgerPayload{posted, reversal, posted})
	reversed := reduceReporting(t, []ledgerPayload{reversal, posted, reversal})
	if forward != (reportingImpact{}) || reversed != (reportingImpact{}) {
		t.Fatalf("forward=%+v reversed=%+v, want zero after dedupe", forward, reversed)
	}
}

func TestCanonicalEventIDRequiresMatchingV1PayloadIdentity(t *testing.T) {
	const eventID = "d4fac537-2b13-41a0-954d-b99c11d05570"

	if _, err := canonicalEventID(eventID, ledgerPayload{EventVersion: 1}); err == nil {
		t.Fatal("canonicalEventID() error = nil, want missing payload eventId rejected")
	}
	if _, err := canonicalEventID(
		"6fa6aab9-03d8-49fa-ad70-0368966a0064",
		ledgerPayload{EventVersion: 1, EventID: eventID},
	); err == nil {
		t.Fatal("canonicalEventID() error = nil, want mismatched v1 IDs rejected")
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

func TestV1ReportingImpactRejectsAnotherEventType(t *testing.T) {
	zero := int64(0)
	payload := ledgerPayload{
		EventVersion:      1,
		EventID:           "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:         "transaction.account.created",
		UserID:            "user-1",
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &zero,
		ExpenseDeltaMinor: &zero,
	}

	if _, _, err := decodeReportingImpact(mustJSON(t, payload)); err == nil {
		t.Fatal("decodeReportingImpact() error = nil, want unsupported event type")
	}
}

func TestV1ReportingImpactRejectsInconsistentSignedDeltas(t *testing.T) {
	income := int64(10_000)
	expense := int64(0)
	payload := ledgerPayload{
		EventVersion:      1,
		EventID:           "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "REVERSAL",
		EffectEntryType:   "INCOME",
		AmountMinor:       10_000,
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &income,
		ExpenseDeltaMinor: &expense,
	}

	if _, _, err := decodeReportingImpact(mustJSON(t, payload)); err == nil {
		t.Fatal("decodeReportingImpact() error = nil, want inconsistent impact")
	}
}

func TestV1ReportingImpactRejectsDeltaThatDoesNotEqualAmount(t *testing.T) {
	income := int64(9_999)
	expense := int64(0)
	payload := ledgerPayload{
		EventVersion:      1,
		EventID:           "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "INCOME",
		EffectEntryType:   "INCOME",
		AmountMinor:       10_000,
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &income,
		ExpenseDeltaMinor: &expense,
	}

	if _, _, err := decodeReportingImpact(mustJSON(t, payload)); err == nil {
		t.Fatal("decodeReportingImpact() error = nil, want mismatched amount and delta rejected")
	}
}

func TestV1ReportingImpactRejectsUnsafeAmount(t *testing.T) {
	income := int64(maxSafeIntegerMinor + 1)
	expense := int64(0)
	payload := ledgerPayload{
		EventVersion:      1,
		EventID:           "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "INCOME",
		EffectEntryType:   "INCOME",
		AmountMinor:       maxSafeIntegerMinor + 1,
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &income,
		ExpenseDeltaMinor: &expense,
	}

	if _, _, err := decodeReportingImpact(mustJSON(t, payload)); err == nil {
		t.Fatal("decodeReportingImpact() error = nil, want unsafe amount rejected")
	}
}

func TestV1ReportingImpactRejectsInvalidProjectionIdentity(t *testing.T) {
	income, expense := int64(10_000), int64(0)
	valid := ledgerPayload{
		EventVersion:      1,
		EventID:           "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:         ledgerEntryPostedEvent,
		UserID:            "user-1",
		EntryType:         "INCOME",
		EffectEntryType:   "INCOME",
		AmountMinor:       10_000,
		Currency:          "VND",
		YearMonth:         "2026-07",
		IncomeDeltaMinor:  &income,
		ExpenseDeltaMinor: &expense,
	}
	tests := map[string]func(*ledgerPayload){
		"blank user":        func(payload *ledgerPayload) { payload.UserID = " " },
		"invalid currency":  func(payload *ledgerPayload) { payload.Currency = "vnd" },
		"invalid yearMonth": func(payload *ledgerPayload) { payload.YearMonth = "2026-13" },
	}

	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			payload := valid
			mutate(&payload)
			if _, _, err := decodeReportingImpact(mustJSON(t, payload)); err == nil {
				t.Fatal("decodeReportingImpact() error = nil, want invalid identity error")
			}
		})
	}
}

func reduceReporting(t *testing.T, payloads []ledgerPayload) reportingImpact {
	t.Helper()
	seen := make(map[string]struct{})
	total := reportingImpact{}
	for _, payload := range payloads {
		if _, duplicate := seen[payload.EventID]; duplicate {
			continue
		}
		_, impact, err := decodeReportingImpact(mustJSON(t, payload))
		if err != nil {
			t.Fatalf("decodeReportingImpact() error = %v", err)
		}
		seen[payload.EventID] = struct{}{}
		total.incomeDeltaMinor += impact.incomeDeltaMinor
		total.expenseDeltaMinor += impact.expenseDeltaMinor
	}
	return total
}

func mustJSON(t *testing.T, value any) string {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	return string(encoded)
}

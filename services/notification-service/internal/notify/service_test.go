package notify

import (
	"strings"
	"testing"
)

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

func TestV1EventRejectsAnotherEventType(t *testing.T) {
	payload := ledgerPayload{
		EventVersion: 1,
		EventID:      "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:    "transaction.account.created",
		UserID:       "user-1",
		Currency:     "VND",
		YearMonth:    "2026-07",
	}

	if err := validateLedgerPayload(payload); err == nil {
		t.Fatal("validateLedgerPayload() error = nil, want unsupported event type")
	}
}

func TestV1EventRejectsInvalidLedgerFields(t *testing.T) {
	valid := ledgerPayload{
		EventVersion: 1,
		EventID:      "d4fac537-2b13-41a0-954d-b99c11d05570",
		EventType:    ledgerEntryPostedEvent,
		UserID:       "user-1",
		EntryType:    "EXPENSE",
		AmountMinor:  100,
		Currency:     "VND",
		YearMonth:    "2026-07",
	}
	tests := map[string]func(*ledgerPayload){
		"blank user":        func(payload *ledgerPayload) { payload.UserID = " " },
		"invalid type":      func(payload *ledgerPayload) { payload.EntryType = "DELETE" },
		"invalid currency":  func(payload *ledgerPayload) { payload.Currency = "vnd" },
		"invalid yearMonth": func(payload *ledgerPayload) { payload.YearMonth = "2026-13" },
		"zero amount":       func(payload *ledgerPayload) { payload.AmountMinor = 0 },
		"unsafe amount":     func(payload *ledgerPayload) { payload.AmountMinor = maxSafeMinor + 1 },
	}

	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			payload := valid
			mutate(&payload)
			if err := validateLedgerPayload(payload); err == nil {
				t.Fatal("validateLedgerPayload() error = nil, want invalid ledger fields")
			}
		})
	}
}

func TestLegacyEventCanUseEnvelopeID(t *testing.T) {
	payload := ledgerPayload{EventVersion: 0}
	envelopeID := "6fa6aab9-03d8-49fa-ad70-0368966a0064"

	eventID, err := canonicalEventID(envelopeID, payload)
	if err != nil {
		t.Fatalf("canonicalEventID() error = %v", err)
	}
	if eventID != envelopeID {
		t.Fatalf("canonicalEventID() = %s, want %s", eventID, envelopeID)
	}
}

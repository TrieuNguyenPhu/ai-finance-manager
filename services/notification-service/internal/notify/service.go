package notify

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

const ledgerEntryPostedEvent = "transaction.ledger_entry.posted"
const maxSafeMinor = int64(9_007_199_254_740_991)

var (
	yearMonthPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)
	currencyPattern  = regexp.MustCompile(`^[A-Z]{3}$`)
)

type Notification struct {
	ID          string  `json:"id"`
	UserID      string  `json:"userId"`
	Channel     string  `json:"channel"`
	Subject     string  `json:"subject"`
	Body        string  `json:"body"`
	CreatedAt   string  `json:"createdAt"`
	DeliveredAt *string `json:"deliveredAt"`
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) List(ctx context.Context, userID string, limit int) ([]Notification, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, user_id, channel, subject, body, created_at, delivered_at
		FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Notification, 0)
	for rows.Next() {
		var n Notification
		var created time.Time
		var delivered sql.NullTime
		if err := rows.Scan(&n.ID, &n.UserID, &n.Channel, &n.Subject, &n.Body, &created, &delivered); err != nil {
			return nil, err
		}
		n.CreatedAt = created.UTC().Format(time.RFC3339)
		if delivered.Valid {
			v := delivered.Time.UTC().Format(time.RFC3339)
			n.DeliveredAt = &v
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

type ledgerPayload struct {
	EventVersion int    `json:"eventVersion"`
	EventID      string `json:"eventId"`
	EventType    string `json:"eventType"`
	UserID       string `json:"userId"`
	EntryType    string `json:"entryType"`
	AmountMinor  int64  `json:"amountMinor"`
	Currency     string `json:"currency"`
	YearMonth    string `json:"yearMonth"`
}

func (s *Service) HandleEvent(ctx context.Context, envelopeEventID, payloadJSON string) error {
	var payload ledgerPayload
	if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
		return err
	}
	if err := validateLedgerPayload(payload); err != nil {
		return err
	}
	eventID, err := canonicalEventID(envelopeEventID, payload)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var exists int
	err = tx.QueryRowContext(ctx, `SELECT 1 FROM processed_events WHERE event_id = $1::uuid`, eventID).Scan(&exists)
	if err == nil {
		return tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	if payload.EntryType == "EXPENSE" || payload.EntryType == "REVERSAL" {
		id := uuid.NewString()
		subject := fmt.Sprintf("Ledger %s recorded", payload.EntryType)
		body := fmt.Sprintf("%s %d %s for %s", payload.EntryType, payload.AmountMinor, payload.Currency, payload.YearMonth)
		now := time.Now().UTC()
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO notifications (id, user_id, channel, subject, body, created_at, delivered_at)
			VALUES ($1::uuid, $2, 'in_app', $3, $4, $5, $5)`,
			id, payload.UserID, subject, body, now); err != nil {
			return err
		}
		log.Printf("notification-service stored in-app notification event=%s", eventID)
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO processed_events (event_id, event_version) VALUES ($1::uuid, $2)`,
		eventID,
		payload.EventVersion,
	); err != nil {
		return err
	}
	return tx.Commit()
}

func validateLedgerPayload(payload ledgerPayload) error {
	if strings.TrimSpace(payload.UserID) == "" || payload.Currency == "" || payload.YearMonth == "" {
		return errors.New("ledger event missing notification identity")
	}
	if payload.EventVersion < 0 || payload.EventVersion > 1 {
		return fmt.Errorf("unsupported ledger event version %d", payload.EventVersion)
	}
	if payload.EventVersion == 1 && payload.EventType != ledgerEntryPostedEvent {
		return fmt.Errorf("unsupported ledger event type %q", payload.EventType)
	}
	if payload.EventVersion == 1 {
		if utf8.RuneCountInString(payload.UserID) > 128 ||
			!currencyPattern.MatchString(payload.Currency) ||
			!yearMonthPattern.MatchString(payload.YearMonth) ||
			payload.AmountMinor < 1 ||
			payload.AmountMinor > maxSafeMinor {
			return errors.New("v1 ledger event has invalid notification fields")
		}
		switch payload.EntryType {
		case "INCOME", "EXPENSE", "TRANSFER", "REVERSAL":
		default:
			return fmt.Errorf("unsupported ledger entry type %q", payload.EntryType)
		}
	}
	return nil
}

func canonicalEventID(envelopeEventID string, payload ledgerPayload) (string, error) {
	if payload.EventVersion >= 1 && payload.EventID == "" {
		return "", errors.New("v1 ledger event missing payload eventId")
	}

	eventID := payload.EventID
	if eventID == "" {
		eventID = envelopeEventID
	}
	if eventID == "" {
		return "", errors.New("ledger event missing eventId")
	}
	parsedEventID, err := uuid.Parse(eventID)
	if err != nil {
		return "", errors.New("ledger event has invalid eventId")
	}

	if payload.EventVersion >= 1 && envelopeEventID != "" {
		parsedEnvelopeID, err := uuid.Parse(envelopeEventID)
		if err != nil {
			return "", errors.New("ledger event envelope has invalid eventId")
		}
		if parsedEnvelopeID != parsedEventID {
			return "", errors.New("v1 ledger eventId does not match its envelope")
		}
	}
	return parsedEventID.String(), nil
}

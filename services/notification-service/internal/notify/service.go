package notify

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
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
	EventID     string `json:"eventId"`
	UserID      string `json:"userId"`
	EntryType   string `json:"entryType"`
	AmountMinor int64  `json:"amountMinor"`
	Currency    string `json:"currency"`
	YearMonth   string `json:"yearMonth"`
}

func (s *Service) HandleEvent(ctx context.Context, envelopeEventID, payloadJSON string) error {
	var payload ledgerPayload
	if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
		return err
	}
	eventID := envelopeEventID
	if payload.EventID != "" {
		eventID = payload.EventID
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
		log.Printf("notification-service stored in-app notification for user=%s event=%s", payload.UserID, eventID)
	}

	if _, err := tx.ExecContext(ctx, `INSERT INTO processed_events (event_id) VALUES ($1::uuid)`, eventID); err != nil {
		return err
	}
	return tx.Commit()
}

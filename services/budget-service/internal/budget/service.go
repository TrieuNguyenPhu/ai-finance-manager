package budget

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"
)

// ErrValidation marks client-input errors whose message is safe to return.
var ErrValidation = errors.New("validation error")

var (
	yearMonthPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)
	currencyPattern  = regexp.MustCompile(`^[A-Z]{3}$`)
)

type Budget struct {
	ID               string `json:"id"`
	UserID           string `json:"userId"`
	CategoryName     string `json:"categoryName"`
	YearMonth        string `json:"yearMonth"`
	LimitMinor       int64  `json:"limitMinor"`
	Currency         string `json:"currency"`
	ThresholdPercent int    `json:"thresholdPercent"`
	SpentMinor       int64  `json:"spentMinor"`
	CreatedAt        string `json:"createdAt"`
}

type CreateInput struct {
	CategoryName     string `json:"categoryName"`
	YearMonth        string `json:"yearMonth"`
	LimitMinor       int64  `json:"limitMinor"`
	Currency         string `json:"currency"`
	ThresholdPercent int    `json:"thresholdPercent"`
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) List(ctx context.Context, userID string, limit int) ([]Budget, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, user_id, category_name, year_month, limit_minor, currency,
		       threshold_percent, spent_minor, created_at
		FROM budgets WHERE user_id = $1
		ORDER BY year_month DESC, category_name ASC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Budget, 0)
	for rows.Next() {
		var b Budget
		var created time.Time
		if err := rows.Scan(
			&b.ID, &b.UserID, &b.CategoryName, &b.YearMonth, &b.LimitMinor, &b.Currency,
			&b.ThresholdPercent, &b.SpentMinor, &created,
		); err != nil {
			return nil, err
		}
		b.CreatedAt = created.UTC().Format(time.RFC3339)
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Service) Create(ctx context.Context, userID string, in CreateInput) (Budget, error) {
	if in.CategoryName == "" || in.YearMonth == "" || in.Currency == "" {
		return Budget{}, fmt.Errorf("%w: categoryName, yearMonth and currency are required", ErrValidation)
	}
	if len(in.CategoryName) > 128 {
		return Budget{}, fmt.Errorf("%w: categoryName too long", ErrValidation)
	}
	if !yearMonthPattern.MatchString(in.YearMonth) {
		return Budget{}, fmt.Errorf("%w: yearMonth must be YYYY-MM", ErrValidation)
	}
	if !currencyPattern.MatchString(in.Currency) {
		return Budget{}, fmt.Errorf("%w: currency must be an ISO 4217 code", ErrValidation)
	}
	if in.LimitMinor < 0 {
		return Budget{}, fmt.Errorf("%w: limitMinor must be >= 0", ErrValidation)
	}
	if in.ThresholdPercent == 0 {
		in.ThresholdPercent = 80
	}
	if in.ThresholdPercent < 1 || in.ThresholdPercent > 100 {
		return Budget{}, fmt.Errorf("%w: thresholdPercent must be between 1 and 100", ErrValidation)
	}
	id := uuid.NewString()
	now := time.Now().UTC()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO budgets (
			id, user_id, category_name, year_month, limit_minor, currency, threshold_percent, spent_minor, created_at
		) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 0, $8)`,
		id, userID, in.CategoryName, in.YearMonth, in.LimitMinor, in.Currency, in.ThresholdPercent, now)
	if err != nil {
		return Budget{}, err
	}
	return Budget{
		ID: id, UserID: userID, CategoryName: in.CategoryName, YearMonth: in.YearMonth,
		LimitMinor: in.LimitMinor, Currency: in.Currency, ThresholdPercent: in.ThresholdPercent,
		SpentMinor: 0, CreatedAt: now.Format(time.RFC3339),
	}, nil
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

	delta := int64(0)
	switch payload.EntryType {
	case "EXPENSE":
		delta = payload.AmountMinor
	case "REVERSAL":
		delta = -payload.AmountMinor
	}
	if delta != 0 {
		if _, err := tx.ExecContext(ctx, `
			UPDATE budgets SET spent_minor = GREATEST(0, spent_minor + $1)
			WHERE user_id = $2 AND year_month = $3 AND currency = $4`,
			delta, payload.UserID, payload.YearMonth, payload.Currency); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO processed_events (event_id) VALUES ($1::uuid)`, eventID); err != nil {
		return err
	}
	return tx.Commit()
}

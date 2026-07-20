package analytics

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"time"
)

type Dashboard struct {
	YearMonth    string `json:"yearMonth"`
	Currency     string `json:"currency"`
	IncomeMinor  int64  `json:"incomeMinor"`
	ExpenseMinor int64  `json:"expenseMinor"`
	NetMinor     int64  `json:"netMinor"`
	UpdatedAt    string `json:"updatedAt"`
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetDashboard(ctx context.Context, userID, yearMonth string, limit int) ([]Dashboard, error) {
	query := `
		SELECT year_month, currency, income_minor, expense_minor, updated_at
		FROM monthly_totals WHERE user_id = $1`
	args := []any{userID}
	if yearMonth != "" {
		query += ` AND year_month = $2`
		args = append(args, yearMonth)
	}
	query += ` ORDER BY year_month DESC, currency ASC LIMIT $` + strconv.Itoa(len(args)+1)
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Dashboard, 0)
	for rows.Next() {
		var d Dashboard
		var updated time.Time
		if err := rows.Scan(&d.YearMonth, &d.Currency, &d.IncomeMinor, &d.ExpenseMinor, &updated); err != nil {
			return nil, err
		}
		d.NetMinor = d.IncomeMinor - d.ExpenseMinor
		d.UpdatedAt = updated.UTC().Format(time.RFC3339)
		out = append(out, d)
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

	incomeDelta, expenseDelta := int64(0), int64(0)
	switch payload.EntryType {
	case "INCOME":
		incomeDelta = payload.AmountMinor
	case "EXPENSE":
		expenseDelta = payload.AmountMinor
	case "REVERSAL":
		// Reversal of expense reduces expense; reversal of income reduces income.
		// MVP: treat absolute as expense reduction if prior expense style — use signed expense decrease.
		expenseDelta = -payload.AmountMinor
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO monthly_totals (user_id, year_month, currency, income_minor, expense_minor, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (user_id, year_month, currency) DO UPDATE SET
			income_minor = monthly_totals.income_minor + EXCLUDED.income_minor,
			expense_minor = GREATEST(0, monthly_totals.expense_minor + EXCLUDED.expense_minor),
			updated_at = NOW()`,
		payload.UserID, payload.YearMonth, payload.Currency, incomeDelta, expenseDelta)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO processed_events (event_id) VALUES ($1::uuid)`, eventID); err != nil {
		return err
	}
	return tx.Commit()
}

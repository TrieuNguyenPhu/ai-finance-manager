package analytics

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

const ledgerEntryPostedEvent = "transaction.ledger_entry.posted"

var (
	yearMonthPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)
	currencyPattern  = regexp.MustCompile(`^[A-Z]{3}$`)
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
	EventVersion      int    `json:"eventVersion"`
	EventID           string `json:"eventId"`
	EventType         string `json:"eventType"`
	UserID            string `json:"userId"`
	EntryType         string `json:"entryType"`
	EffectEntryType   string `json:"effectEntryType"`
	AmountMinor       int64  `json:"amountMinor"`
	Currency          string `json:"currency"`
	YearMonth         string `json:"yearMonth"`
	IncomeDeltaMinor  *int64 `json:"incomeDeltaMinor"`
	ExpenseDeltaMinor *int64 `json:"expenseDeltaMinor"`
}

type reportingImpact struct {
	incomeDeltaMinor  int64
	expenseDeltaMinor int64
}

const maxSafeIntegerMinor int64 = 9_007_199_254_740_991

func (s *Service) HandleEvent(ctx context.Context, envelopeEventID, payloadJSON string) error {
	payload, impact, err := decodeReportingImpact(payloadJSON)
	if err != nil {
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

	if impact.incomeDeltaMinor != 0 || impact.expenseDeltaMinor != 0 {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO monthly_totals (user_id, year_month, currency, income_minor, expense_minor, updated_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
			ON CONFLICT (user_id, year_month, currency) DO UPDATE SET
				income_minor = monthly_totals.income_minor + EXCLUDED.income_minor,
				expense_minor = monthly_totals.expense_minor + EXCLUDED.expense_minor,
				updated_at = NOW()`,
			payload.UserID,
			payload.YearMonth,
			payload.Currency,
			impact.incomeDeltaMinor,
			impact.expenseDeltaMinor)
		if err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO processed_events (event_id, event_version) VALUES ($1::uuid, $2)`,
		eventID, payload.EventVersion); err != nil {
		return err
	}
	return tx.Commit()
}

func decodeReportingImpact(payloadJSON string) (ledgerPayload, reportingImpact, error) {
	var payload ledgerPayload
	if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
		return ledgerPayload{}, reportingImpact{}, err
	}
	if payload.UserID == "" || payload.Currency == "" || payload.YearMonth == "" {
		return ledgerPayload{}, reportingImpact{}, errors.New("ledger event missing reporting identity")
	}

	switch payload.EventVersion {
	case 0:
		// Compatibility for events created before the additive v1 impact fields.
		// A legacy reversal cannot be classified safely and must be replayed as v1.
		switch payload.EntryType {
		case "INCOME":
			return payload, reportingImpact{incomeDeltaMinor: payload.AmountMinor}, nil
		case "EXPENSE":
			return payload, reportingImpact{expenseDeltaMinor: payload.AmountMinor}, nil
		case "TRANSFER":
			return payload, reportingImpact{}, nil
		case "REVERSAL":
			return ledgerPayload{}, reportingImpact{},
				errors.New("legacy reversal lacks its original reporting effect")
		default:
			return ledgerPayload{}, reportingImpact{}, fmt.Errorf("unsupported legacy entry type %q", payload.EntryType)
		}
	case 1:
		if payload.EventType != ledgerEntryPostedEvent {
			return ledgerPayload{}, reportingImpact{},
				fmt.Errorf("unsupported ledger event type %q", payload.EventType)
		}
		if err := validateV1ReportingIdentity(payload); err != nil {
			return ledgerPayload{}, reportingImpact{}, err
		}
		if payload.IncomeDeltaMinor == nil || payload.ExpenseDeltaMinor == nil {
			return ledgerPayload{}, reportingImpact{}, errors.New("v1 ledger event missing signed reporting deltas")
		}
		if err := validateV1ReportingImpact(payload); err != nil {
			return ledgerPayload{}, reportingImpact{}, err
		}
		return payload, reportingImpact{
			incomeDeltaMinor:  *payload.IncomeDeltaMinor,
			expenseDeltaMinor: *payload.ExpenseDeltaMinor,
		}, nil
	default:
		return ledgerPayload{}, reportingImpact{}, fmt.Errorf("unsupported ledger event version %d", payload.EventVersion)
	}
}

func validateV1ReportingIdentity(payload ledgerPayload) error {
	if strings.TrimSpace(payload.UserID) == "" || utf8.RuneCountInString(payload.UserID) > 128 {
		return errors.New("v1 ledger event has invalid userId")
	}
	if !currencyPattern.MatchString(payload.Currency) {
		return errors.New("v1 ledger event has invalid currency")
	}
	if !yearMonthPattern.MatchString(payload.YearMonth) {
		return errors.New("v1 ledger event has invalid yearMonth")
	}
	return nil
}

func validateV1ReportingImpact(payload ledgerPayload) error {
	if payload.AmountMinor <= 0 || payload.AmountMinor > maxSafeIntegerMinor {
		return errors.New("v1 ledger event amountMinor must be a positive safe integer")
	}
	income := *payload.IncomeDeltaMinor
	expense := *payload.ExpenseDeltaMinor
	valid := false
	switch payload.EntryType {
	case "INCOME":
		valid = payload.EffectEntryType == "INCOME" &&
			income == payload.AmountMinor && expense == 0
	case "EXPENSE":
		valid = payload.EffectEntryType == "EXPENSE" &&
			income == 0 && expense == payload.AmountMinor
	case "TRANSFER":
		valid = payload.EffectEntryType == "TRANSFER" && income == 0 && expense == 0
	case "REVERSAL":
		switch payload.EffectEntryType {
		case "INCOME":
			valid = income == -payload.AmountMinor && expense == 0
		case "EXPENSE":
			valid = income == 0 && expense == -payload.AmountMinor
		case "TRANSFER":
			valid = income == 0 && expense == 0
		}
	}
	if !valid {
		return errors.New("v1 ledger event has inconsistent reporting semantics")
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

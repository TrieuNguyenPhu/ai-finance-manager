package budget

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrValidation marks client-input errors whose message is safe to return.
var ErrValidation = errors.New("validation error")
var ErrConflict = errors.New("conflict")
var ErrIdempotencyReuse = errors.New("idempotency key reuse")

var (
	yearMonthPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)
	currencyPattern  = regexp.MustCompile(`^[A-Z]{3}$`)
)

const maxSafeMinor = int64(9_007_199_254_740_991)
const ledgerEntryPostedEvent = "transaction.ledger_entry.posted"

type Budget struct {
	ID               string  `json:"id"`
	UserID           string  `json:"userId"`
	CategoryID       *string `json:"categoryId"`
	CategoryName     string  `json:"categoryName"`
	YearMonth        string  `json:"yearMonth"`
	LimitMinor       int64   `json:"limitMinor"`
	Currency         string  `json:"currency"`
	ThresholdPercent int     `json:"thresholdPercent"`
	SpentMinor       int64   `json:"spentMinor"`
	CreatedAt        string  `json:"createdAt"`
}

type CreateInput struct {
	CategoryID       string `json:"categoryId"`
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
		SELECT b.id::text, b.user_id, b.category_id::text, b.category_name, b.year_month,
		       b.limit_minor, b.currency, b.threshold_percent,
		       COALESCE((
		           SELECT SUM(cs.spent_minor)
		           FROM category_spend cs
		           WHERE cs.user_id = b.user_id
		             AND cs.year_month = b.year_month
		             AND cs.currency = b.currency
		             AND (
		                 (b.category_id IS NOT NULL AND cs.category_id = b.category_id)
		                 OR (
		                     b.category_id IS NULL
		                     AND LOWER(cs.category_name) = LOWER(b.category_name)
		                 )
		             )
		       ), 0),
		       b.created_at
		FROM budgets b WHERE b.user_id = $1
		ORDER BY year_month DESC, category_name ASC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Budget, 0)
	for rows.Next() {
		var b Budget
		var created time.Time
		var categoryID sql.NullString
		if err := rows.Scan(
			&b.ID, &b.UserID, &categoryID, &b.CategoryName, &b.YearMonth, &b.LimitMinor, &b.Currency,
			&b.ThresholdPercent, &b.SpentMinor, &created,
		); err != nil {
			return nil, err
		}
		if categoryID.Valid {
			b.CategoryID = &categoryID.String
		}
		b.SpentMinor = displaySpent(b.SpentMinor)
		b.CreatedAt = created.UTC().Format(time.RFC3339)
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Service) Create(
	ctx context.Context,
	userID, idempotencyKey string,
	in CreateInput,
) (Budget, error) {
	if strings.TrimSpace(idempotencyKey) == "" {
		return Budget{}, fmt.Errorf("%w: Idempotency-Key is required", ErrValidation)
	}
	if len(idempotencyKey) > 128 {
		return Budget{}, fmt.Errorf(
			"%w: Idempotency-Key must not exceed 128 characters",
			ErrValidation,
		)
	}

	normalized, err := normalizeCreateInput(in)
	if err != nil {
		return Budget{}, err
	}
	requestJSON, err := json.Marshal(normalized)
	if err != nil {
		return Budget{}, fmt.Errorf("encode idempotent request: %w", err)
	}
	requestHash := fmt.Sprintf("%x", sha256.Sum256(requestJSON))

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Budget{}, err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
		userID,
		idempotencyKey,
	); err != nil {
		return Budget{}, fmt.Errorf("lock idempotent request: %w", err)
	}

	var existingHash, responseJSON string
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM idempotency_keys
		WHERE user_id = $1 AND idempotency_key = $2`,
		userID, idempotencyKey).Scan(&existingHash, &responseJSON)
	if err == nil {
		if existingHash != requestHash {
			return Budget{}, fmt.Errorf(
				"%w: Idempotency-Key was used with a different request",
				ErrIdempotencyReuse,
			)
		}
		var existing Budget
		if err := json.Unmarshal([]byte(responseJSON), &existing); err != nil {
			return Budget{}, fmt.Errorf("decode idempotent response: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return Budget{}, err
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Budget{}, err
	}

	id := uuid.NewString()
	now := time.Now().UTC()
	spentMinor, err := currentSpent(
		ctx,
		tx,
		userID,
		normalized.CategoryID,
		normalized.CategoryName,
		normalized.YearMonth,
		normalized.Currency,
	)
	if err != nil {
		return Budget{}, err
	}
	var categoryID any
	if normalized.CategoryID != "" {
		categoryID = normalized.CategoryID
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO budgets (
			id, user_id, category_id, category_name, year_month, limit_minor, currency,
			threshold_percent, spent_minor, created_at
		) VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, 0, $9)`,
		id,
		userID,
		categoryID,
		normalized.CategoryName,
		normalized.YearMonth,
		normalized.LimitMinor,
		normalized.Currency,
		normalized.ThresholdPercent,
		now,
	)
	if err != nil {
		var pgError *pgconn.PgError
		if errors.As(err, &pgError) && pgError.Code == "23505" {
			return Budget{}, fmt.Errorf(
				"%w: a budget already exists for that category, month and currency",
				ErrConflict,
			)
		}
		return Budget{}, err
	}
	created := Budget{
		ID: id, UserID: userID, CategoryName: normalized.CategoryName,
		YearMonth: normalized.YearMonth, LimitMinor: normalized.LimitMinor,
		Currency: normalized.Currency, ThresholdPercent: normalized.ThresholdPercent,
		SpentMinor: displaySpent(spentMinor), CreatedAt: now.Format(time.RFC3339),
	}
	if normalized.CategoryID != "" {
		created.CategoryID = &normalized.CategoryID
	}
	encodedResponse, err := json.Marshal(created)
	if err != nil {
		return Budget{}, fmt.Errorf("encode idempotent response: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO idempotency_keys (
			user_id, idempotency_key, request_hash, response_body
		) VALUES ($1, $2, $3, $4)`,
		userID, idempotencyKey, requestHash, string(encodedResponse)); err != nil {
		return Budget{}, err
	}
	if err := tx.Commit(); err != nil {
		return Budget{}, err
	}
	return created, nil
}

func normalizeCreateInput(in CreateInput) (CreateInput, error) {
	in.CategoryName = strings.TrimSpace(in.CategoryName)
	if in.CategoryName == "" || in.YearMonth == "" || in.Currency == "" {
		return CreateInput{}, fmt.Errorf(
			"%w: categoryName, yearMonth and currency are required",
			ErrValidation,
		)
	}
	if len(in.CategoryName) > 120 {
		return CreateInput{}, fmt.Errorf("%w: categoryName too long", ErrValidation)
	}
	if in.CategoryID != "" {
		parsed, err := uuid.Parse(in.CategoryID)
		if err != nil {
			return CreateInput{}, fmt.Errorf("%w: categoryId must be a UUID", ErrValidation)
		}
		in.CategoryID = parsed.String()
	}
	if !yearMonthPattern.MatchString(in.YearMonth) {
		return CreateInput{}, fmt.Errorf("%w: yearMonth must be YYYY-MM", ErrValidation)
	}
	if !currencyPattern.MatchString(in.Currency) {
		return CreateInput{}, fmt.Errorf(
			"%w: currency must be an ISO 4217 code",
			ErrValidation,
		)
	}
	if in.LimitMinor < 0 {
		return CreateInput{}, fmt.Errorf("%w: limitMinor must be >= 0", ErrValidation)
	}
	if in.LimitMinor > maxSafeMinor {
		return CreateInput{}, fmt.Errorf(
			"%w: limitMinor exceeds the browser-safe integer range",
			ErrValidation,
		)
	}
	if in.ThresholdPercent == 0 {
		in.ThresholdPercent = 80
	}
	if in.ThresholdPercent < 1 || in.ThresholdPercent > 100 {
		return CreateInput{}, fmt.Errorf(
			"%w: thresholdPercent must be between 1 and 100",
			ErrValidation,
		)
	}
	return in, nil
}

type ledgerPayload struct {
	EventVersion            int    `json:"eventVersion"`
	EventID                 string `json:"eventId"`
	EventType               string `json:"eventType"`
	UserID                  string `json:"userId"`
	EntryType               string `json:"entryType"`
	EffectEntryType         string `json:"effectEntryType"`
	AmountMinor             int64  `json:"amountMinor"`
	CategoryID              string `json:"categoryId"`
	CategoryName            string `json:"categoryName"`
	Currency                string `json:"currency"`
	YearMonth               string `json:"yearMonth"`
	CategorySpendDeltaMinor *int64 `json:"categorySpendDeltaMinor"`
}

type categoryImpact struct {
	deltaMinor int64
}

func (s *Service) HandleEvent(ctx context.Context, envelopeEventID, payloadJSON string) error {
	payload, impact, err := decodeCategoryImpact(payloadJSON)
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

	if impact.deltaMinor != 0 {
		if payload.CategoryID == "" {
			return errors.New("categorized spend delta requires categoryId")
		}
		if _, err := uuid.Parse(payload.CategoryID); err != nil {
			return fmt.Errorf("ledger event categoryId must be a UUID: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO category_spend (
				user_id, category_id, category_name, year_month, currency, spent_minor, updated_at
			) VALUES ($1, $2::uuid, $3, $4, $5, $6, NOW())
			ON CONFLICT (user_id, category_id, year_month, currency) DO UPDATE SET
				category_name = EXCLUDED.category_name,
				spent_minor = category_spend.spent_minor + EXCLUDED.spent_minor,
				updated_at = NOW()`,
			payload.UserID, payload.CategoryID, payload.CategoryName,
			payload.YearMonth, payload.Currency, impact.deltaMinor); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE budgets
			SET category_name = $1
			WHERE user_id = $2 AND category_id = $3::uuid`,
			payload.CategoryName, payload.UserID, payload.CategoryID); err != nil {
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

type rowQuerier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func currentSpent(
	ctx context.Context,
	queryer rowQuerier,
	userID, categoryID, categoryName, yearMonth, currency string,
) (int64, error) {
	var spentMinor int64
	var err error
	if categoryID != "" {
		err = queryer.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(spent_minor), 0)
			FROM category_spend
			WHERE user_id = $1 AND category_id = $2::uuid AND year_month = $3 AND currency = $4`,
			userID, categoryID, yearMonth, currency).Scan(&spentMinor)
	} else {
		err = queryer.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(spent_minor), 0)
			FROM category_spend
			WHERE user_id = $1
			  AND LOWER(category_name) = LOWER($2)
			  AND year_month = $3
			  AND currency = $4`,
			userID, categoryName, yearMonth, currency).Scan(&spentMinor)
	}
	return spentMinor, err
}

func displaySpent(spentMinor int64) int64 {
	if spentMinor < 0 {
		return 0
	}
	return spentMinor
}

func decodeCategoryImpact(payloadJSON string) (ledgerPayload, categoryImpact, error) {
	var payload ledgerPayload
	if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
		return ledgerPayload{}, categoryImpact{}, err
	}
	if payload.UserID == "" || payload.Currency == "" || payload.YearMonth == "" {
		return ledgerPayload{}, categoryImpact{}, errors.New("ledger event missing category-spend identity")
	}

	switch payload.EventVersion {
	case 0:
		switch payload.EntryType {
		case "EXPENSE":
			if payload.CategoryID == "" {
				return payload, categoryImpact{}, nil
			}
			return ledgerPayload{}, categoryImpact{},
				errors.New("legacy categorized expense lacks categoryName; replay it as v1")
		case "INCOME", "TRANSFER":
			return payload, categoryImpact{}, nil
		case "REVERSAL":
			return ledgerPayload{}, categoryImpact{},
				errors.New("legacy reversal lacks its original category-spend effect")
		default:
			return ledgerPayload{}, categoryImpact{}, fmt.Errorf("unsupported legacy entry type %q", payload.EntryType)
		}
	case 1:
		if payload.EventType != ledgerEntryPostedEvent {
			return ledgerPayload{}, categoryImpact{},
				fmt.Errorf("unsupported ledger event type %q", payload.EventType)
		}
		if err := validateV1Identity(payload); err != nil {
			return ledgerPayload{}, categoryImpact{}, err
		}
		if payload.CategorySpendDeltaMinor == nil {
			return ledgerPayload{}, categoryImpact{}, errors.New("v1 ledger event missing category-spend delta")
		}
		if err := validateV1CategoryImpact(payload); err != nil {
			return ledgerPayload{}, categoryImpact{}, err
		}
		if *payload.CategorySpendDeltaMinor != 0 {
			if payload.CategoryID == "" {
				return ledgerPayload{}, categoryImpact{},
					errors.New("v1 categorized spend is missing categoryId")
			}
			if strings.TrimSpace(payload.CategoryName) == "" {
				return ledgerPayload{}, categoryImpact{},
					errors.New("v1 categorized spend is missing categoryName")
			}
		}
		return payload, categoryImpact{deltaMinor: *payload.CategorySpendDeltaMinor}, nil
	default:
		return ledgerPayload{}, categoryImpact{}, fmt.Errorf("unsupported ledger event version %d", payload.EventVersion)
	}
}

func validateV1Identity(payload ledgerPayload) error {
	if strings.TrimSpace(payload.UserID) == "" || utf8.RuneCountInString(payload.UserID) > 128 {
		return errors.New("v1 ledger event has invalid userId")
	}
	if !currencyPattern.MatchString(payload.Currency) {
		return errors.New("v1 ledger event has invalid currency")
	}
	if !yearMonthPattern.MatchString(payload.YearMonth) {
		return errors.New("v1 ledger event has invalid yearMonth")
	}
	if payload.CategoryID != "" {
		if _, err := uuid.Parse(payload.CategoryID); err != nil {
			return errors.New("v1 ledger event has invalid categoryId")
		}
	}
	if utf8.RuneCountInString(payload.CategoryName) > 120 {
		return errors.New("v1 ledger event has invalid categoryName")
	}
	return nil
}

func validateV1CategoryImpact(payload ledgerPayload) error {
	if payload.AmountMinor < 1 || payload.AmountMinor > maxSafeMinor {
		return errors.New("v1 ledger event amount is outside the supported range")
	}

	expectedDelta := int64(0)
	validEffect := false
	switch payload.EntryType {
	case "INCOME":
		validEffect = payload.EffectEntryType == "INCOME"
	case "EXPENSE":
		validEffect = payload.EffectEntryType == "EXPENSE"
		if payload.CategoryID != "" {
			expectedDelta = payload.AmountMinor
		}
	case "TRANSFER":
		validEffect = payload.EffectEntryType == "TRANSFER"
	case "REVERSAL":
		validEffect =
			payload.EffectEntryType == "INCOME" ||
				payload.EffectEntryType == "EXPENSE" ||
				payload.EffectEntryType == "TRANSFER"
		if payload.EffectEntryType == "EXPENSE" && payload.CategoryID != "" {
			expectedDelta = -payload.AmountMinor
		}
	}
	if !validEffect || *payload.CategorySpendDeltaMinor != expectedDelta {
		return errors.New("v1 ledger event has inconsistent category-spend semantics")
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

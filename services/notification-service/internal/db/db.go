package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

//go:embed migrations/*.sql
var migrations embed.FS

func Open(ctx context.Context) (*sql.DB, error) {
	dsn := envOr("NOTIFICATION_DATABASE_URL",
		"postgres://notification_app:notification_local@127.0.0.1:5432/afm?search_path=notification&sslmode=disable")
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	configurePool(db)
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	if err := applyMigrations(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func applyMigrations(ctx context.Context, db *sql.DB) error {
	entries, err := migrations.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migrations: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtext(current_schema()), hashtext('afm_migrations'))`,
	); err != nil {
		return fmt.Errorf("lock migrations: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS afm_schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		)`); err != nil {
		return fmt.Errorf("create migration history: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		var applied bool
		if err := tx.QueryRowContext(
			ctx,
			`SELECT EXISTS (SELECT 1 FROM afm_schema_migrations WHERE version = $1)`,
			entry.Name(),
		).Scan(&applied); err != nil {
			return fmt.Errorf("check migration %s: %w", entry.Name(), err)
		}
		if applied {
			continue
		}
		body, err := migrations.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		if _, err := tx.ExecContext(ctx, string(body)); err != nil {
			return fmt.Errorf("apply migration %s: %w", entry.Name(), err)
		}
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO afm_schema_migrations (version) VALUES ($1)`,
			entry.Name(),
		); err != nil {
			return fmt.Errorf("record migration %s: %w", entry.Name(), err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migrations: %w", err)
	}
	return nil
}

func configurePool(db *sql.DB) {
	maxOpen := positiveIntEnv("DB_MAX_OPEN_CONNS", 2)
	maxIdle := nonNegativeIntEnv("DB_MAX_IDLE_CONNS", 0)
	if maxIdle > maxOpen {
		maxIdle = maxOpen
	}
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)
}

func positiveIntEnv(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

func nonNegativeIntEnv(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value < 0 {
		return fallback
	}
	return value
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

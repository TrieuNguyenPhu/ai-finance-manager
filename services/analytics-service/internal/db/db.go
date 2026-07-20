package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"os"
	"strconv"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

//go:embed migrations/*.sql
var migrations embed.FS

func Open(ctx context.Context, envKey, defaultDSN string) (*sql.DB, error) {
	dsn := envOr(envKey, defaultDSN)
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	configurePool(db)
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	body, err := migrations.ReadFile("migrations/001_dashboard.sql")
	if err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("read migration: %w", err)
	}
	if _, err := db.ExecContext(ctx, string(body)); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

func configurePool(db *sql.DB) {
	maxOpen := positiveIntEnv("DB_MAX_OPEN_CONNS", 10)
	maxIdle := positiveIntEnv("DB_MAX_IDLE_CONNS", 5)
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

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

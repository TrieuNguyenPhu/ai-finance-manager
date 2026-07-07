package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"os"

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
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	body, err := migrations.ReadFile("migrations/001_notifications.sql")
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

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

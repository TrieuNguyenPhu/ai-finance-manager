package main

import (
	"context"
	"crypto/subtle"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ai-finance-manager/analytics-service/internal/analytics"
	"github.com/ai-finance-manager/analytics-service/internal/db"
	"github.com/gin-gonic/gin"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	sqlDB, err := db.Open(ctx, "ANALYTICS_DATABASE_URL",
		"postgres://analytics_app:analytics_local@127.0.0.1:5432/afm?search_path=analytics&sslmode=disable")
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer sqlDB.Close()

	svc := analytics.NewService(sqlDB)
	addr := envOr("ANALYTICS_ADDR", ":8083")
	internalToken := envOr("INTERNAL_EVENTS_TOKEN", "local-internal-events-token")

	r := gin.New()
	r.Use(gin.Recovery())
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "analytics-service"})
	})
	r.GET("/dashboard", func(c *gin.Context) {
		userID := c.GetHeader("X-User-Id")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "message": "X-User-Id required"})
			return
		}
		items, err := svc.GetDashboard(c.Request.Context(), userID, c.Query("yearMonth"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL", "message": "dashboard failed"})
			return
		}
		c.JSON(http.StatusOK, items)
	})
	r.POST("/internal/events", requireInternalToken(internalToken), func(c *gin.Context) {
		var envelope struct {
			EventID string `json:"eventId"`
			Payload string `json:"payload"`
		}
		if err := c.ShouldBindJSON(&envelope); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": "VALIDATION_ERROR", "message": "invalid envelope"})
			return
		}
		if err := svc.HandleEvent(c.Request.Context(), envelope.EventID, envelope.Payload); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": "INTERNAL", "message": "event handling failed"})
			return
		}
		c.Status(http.StatusAccepted)
	})

	server := &http.Server{
		Addr:              addr,
		Handler:           http.MaxBytesHandler(r, 64<<10),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	go func() {
		log.Printf("analytics-service listening on %s", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
	log.Print("analytics-service shutting down")
}

// requireInternalToken guards service-to-service event delivery. Only
// transaction-service (outbox relay) should reach /internal/events.
func requireInternalToken(token string) gin.HandlerFunc {
	return func(c *gin.Context) {
		provided := c.GetHeader("X-Internal-Token")
		if subtle.ConstantTimeCompare([]byte(provided), []byte(token)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized,
				gin.H{"code": "UNAUTHORIZED", "message": "invalid internal token"})
			return
		}
		c.Next()
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

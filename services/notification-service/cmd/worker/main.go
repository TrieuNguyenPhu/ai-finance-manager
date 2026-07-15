package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Print("notification-service worker started (SQS consumer not wired yet)")
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Print("notification-service shutting down")
			return
		case <-ticker.C:
			log.Print("notification-service heartbeat — waiting for SQS wiring")
		}
	}
}

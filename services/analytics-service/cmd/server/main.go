package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	addr := envOr("ANALYTICS_ADDR", ":8083")
	r := gin.New()
	r.Use(gin.Recovery())
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "analytics-service"})
	})
	log.Printf("analytics-service listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

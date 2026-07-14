package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func main() {
	addr := envOr("GATEWAY_ADDR", ":8080")
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)

	log.Printf("gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "gateway",
	})
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

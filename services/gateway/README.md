# gateway

Minimal Go HTTP gateway scaffold. Foundation exposes `/health` only.

Routing, auth forwarding, and BFF aggregation are intentionally not implemented yet.

## Requirements

- Go 1.22+

## Commands

```bash
go test ./...
go run .
```

Default listen address: `:8080` (`GATEWAY_ADDR`).

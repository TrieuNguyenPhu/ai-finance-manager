# k6 load tests

The scripts call only `gateway-service`. They default to a local health smoke
test and do not create ledger data.

```bash
k6 run k6/smoke.js
k6 run --env BASE_URL=http://127.0.0.1:8000 k6/smoke.js
```

`BASE_URL` may point to a disposable test environment. Do not pass production
tokens, financial payloads or real user identifiers to these scripts.

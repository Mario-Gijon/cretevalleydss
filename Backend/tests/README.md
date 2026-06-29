``# Backend Tests

Run the backend tests with:

```bash
cd Backend
bun run test
```

Current layers cover:

- auth and account/session behavior
- expression domains
- issue input normalization
- issue lifecycle behavior
- issue model runtime and actor/model loading
- issue creation integration and protected issue API basics

Tests use a MongoDB in-memory replica set via `mongodb-memory-server`, so transaction-backed flows can run without an external database.

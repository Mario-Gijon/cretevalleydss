# Backend Tests

Run the backend tests with:

```bash
cd Backend
bun run test
```

Current layers cover:

- auth and account/session behavior
- profile, account update, email change, and safe account deletion/purge behavior
- expression domains
- issue input normalization
- issue lifecycle behavior
- scenario access, payload, delete, and creation-boundary behavior
- issue participation editing, invitations, and leaving/removal flows
- notifications behavior and notification API contracts
- issue model runtime and actor/model loading
- issue creation integration and protected issue API basics
- active/finished issue visibility rules and finished detail access
- users/models catalog basics

Tests use a MongoDB in-memory replica set via `mongodb-memory-server`, so transaction-backed flows can run without an external database.

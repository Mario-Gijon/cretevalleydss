# API Contract, Auth, and Errors

## Canonical HTTP response contract

Success envelope:

```json
{ "success": true, "message": "...", "data": {} }
```

Error envelope:

```json
{
  "success": false,
  "message": "...",
  "data": null,
  "error": {
    "code": "BAD_REQUEST",
    "field": "optionalField",
    "details": {}
  }
}
```

## Where the contract is enforced

- Success helpers: `utils/common/responses.js` (`buildApiResponse`, `sendSuccess`).
- Typed errors: `utils/common/errors.js` (`AppError` and factory helpers).
- Global serialization: `middlewares/errorHandler.js`.

## Authentication model

- Access token: Bearer JWT in `Authorization` header.
- Refresh token: JWT cookie (`refreshToken`).
- Token helpers: `services/token.service.js`.

## Authorization middlewares

- `requireToken`: validates access token and sets request identity.
- `requireRefreshToken`: validates refresh cookie for token refresh.
- `requireAdmin`: enforces admin role.

## Auth routes (`/api/auth`)

- `POST /signup`
- `POST /login`
- `POST /logout`
- `GET /me`
- `DELETE /me`
- `PUT /me/password`
- `PATCH /me/university`
- `PATCH /me/name`
- `PATCH /me/email`
- `GET /refresh`
- `GET /account/confirm/:token`
- `GET /email-change/confirm/:token`
- `GET /admin/check`

## Error normalization and ApiModels compatibility

`services/modelApi/modelResponse.js` normalizes upstream responses and failures.
Model execution can return HTTP `200` with `success: false` in body; this is converted into typed errors for consistent API behavior.

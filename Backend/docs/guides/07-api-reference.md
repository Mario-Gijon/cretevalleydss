# API Reference

Base prefix: `/api`

## System routes

- `GET /api/openapi.json`
- `GET /api/docs`
- `GET /api/docs/jsdoc`

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

## Issues routes (`/api/issues`)

Catalog and users:

- `GET /models`
- `GET /users`

Expression domains:

- `GET /expression-domains`
- `POST /expression-domains`
- `PATCH /expression-domains/:id`
- `DELETE /expression-domains/:id`

Issue lifecycle:

- `POST /`
- `GET /active`
- `GET /finished`
- `GET /finished/:id`
- `DELETE /finished/:id`
- `DELETE /:id`
- `POST /:id/leave`
- `PATCH /:id/experts`
- `POST /:id/invitation-response`

Notifications:

- `GET /notifications`
- `POST /notifications/read-all`
- `DELETE /notifications/:notificationId`

Evaluations and resolution:

- `GET /:id/evaluations`
- `POST /:id/evaluations/draft`
- `POST /:id/evaluations/submit`
- `POST /:id/resolve`

Weights:

- `GET /:id/weights/bwm`
- `POST /:id/weights/bwm/draft`
- `POST /:id/weights/bwm/submit`
- `POST /:id/weights/bwm/compute`
- `GET /:id/weights/manual`
- `POST /:id/weights/manual/draft`
- `POST /:id/weights/manual/submit`
- `POST /:id/weights/manual/compute`

Scenarios:

- `GET /:id/scenarios`
- `POST /:id/scenarios`
- `GET /scenarios/:scenarioId`
- `DELETE /scenarios/:scenarioId`

## Admin routes (`/api/admin`)

All routes require `requireToken` and `requireAdmin`.

Experts:

- `GET /experts`
- `POST /experts`
- `PATCH /experts/:id`
- `DELETE /experts/:id`

Models:

- `GET /models/catalog`
- `GET /models/manifest/dry-run`
- `POST /models/manifest/sync`
- `PATCH /models/:id/catalog-visibility`

Issues:

- `GET /issues`
- `GET /issues/:id`
- `DELETE /issues/:id`
- `GET /issues/:id/experts/progress`
- `GET /issues/:issueId/experts/:expertId/evaluations`
- `GET /issues/:issueId/experts/:expertId/weights`
- `PATCH /issues/:id/admin`
- `PATCH /issues/:id/experts`
- `POST /issues/:id/weights/compute`
- `POST /issues/:id/resolve`

## Response contract reminder

Success: `{ success: true, message, data }`

Error: `{ success: false, message, data: null, error: { code, field, details } }`

# Contexto Frontend-Backend: Contrato HTTP Unificado

Fecha de auditoria: 2026-04-16  
Proyecto: `CreteValleyDSS`

Este documento esta pensado para compartirlo con ChatGPT y usarlo como contexto para adaptar el frontend al nuevo contrato de respuestas del backend.

## 1) Contrato HTTP actual del backend

Fuentes de verdad:
- `Backend/utils/common/responses.js`
- `Backend/utils/common/errors.js`
- `Backend/middlewares/errorHandler.js`

### 1.1 Respuesta de exito

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

Notas:
- `data` puede ser un objeto, array o `null`.
- Siempre hay `success`, `message`, `data`.

### 1.2 Respuesta de error

```json
{
  "success": false,
  "message": "Error message",
  "data": null,
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INTERNAL_ERROR|...",
    "field": "fieldName|null",
    "details": {}
  }
}
```

### 1.3 Excepciones al contrato JSON estandar

- `GET /api/openapi.json` devuelve el spec OpenAPI crudo.
- `GET /api/auth/account/confirm/:token` y `GET /api/auth/email-change/confirm/:token` devuelven redireccion `302` (no JSON API).
- `app.use("/api", ...)` en `Backend/app.js` devuelve `404` con:
  - `{ success: false, message: "API route not found" }`
  - No incluye `data` ni `error`.

## 2) Como devuelve respuestas el frontend ahora

### 2.1 Capa normalizada (issues)

Archivo: `Frontend/src/services/issue.service.js`  
Usa `requestJson` de `Frontend/src/services/service.utils.js`.

Shape de salida normalizada:

```json
{
  "success": true,
  "message": "string|null",
  "data": {},
  "error": null,
  "status": 200
}
```

Si falla:

```json
{
  "success": false,
  "message": "string",
  "data": null,
  "error": {
    "code": "string",
    "field": "string|null",
    "details": {}
  },
  "status": 400
}
```

### 2.2 Capa sin normalizar (auth + admin)

Archivos:
- `Frontend/src/services/auth.service.js`
- `Frontend/src/services/admin.service.js`

Devuelven casi siempre el JSON backend crudo (`safeJson`), con algunos casos que devuelven `false` o errores de red locales.

## 3) Mapa de endpoints usados por frontend y shape esperado en `data`

## 3.1 Auth

- `POST /auth/login` -> `data: { userId, token, expiresIn, role, isAdmin }`
- `POST /auth/logout` -> `data: null`
- `GET /auth/me` -> `data: { user: { university, name, email, accountCreation, role, isAdmin } }`
- `DELETE /auth/me` -> `data: null`
- `PUT /auth/me/password` -> `data: null`
- `PATCH /auth/me/university` -> `data: null`
- `PATCH /auth/me/name` -> `data: null`
- `PATCH /auth/me/email` -> `data: null`
- `GET /auth/refresh` -> `data: { token, expiresIn }`
- `GET /auth/admin/check` -> `data: null`

## 3.2 Issues

- `GET /issues/models` -> `data: IssueModel[]`
- `GET /issues/users` -> `data: UserLite[]`
- `GET /issues/expression-domains` -> `data: { globals: ExpressionDomain[], userDomains: ExpressionDomain[] }`
- `POST /issues/expression-domains` -> `data: ExpressionDomain`
- `PATCH /issues/expression-domains/:id` -> `data: ExpressionDomain`
- `DELETE /issues/expression-domains/:id` -> `data: { id }`
- `POST /issues` -> `data: { issueName }`
- `GET /issues/active` -> `data: { issues: IssueCard[], tasks: TaskItem[], taskCenter: object|null, filtersMeta: object|null }`
- `GET /issues/finished` -> `data: FinishedIssue[]`
- `GET /issues/finished/:id` -> `data: FinishedIssueDetail`
- `DELETE /issues/finished/:id` -> `data: { issueName }`
- `DELETE /issues/:id` -> `data: { issueName }`
- `POST /issues/:id/leave` -> `data: { issueName }`
- `PATCH /issues/:id/experts` -> `data: null`
- `POST /issues/:id/invitation-response` -> `data: null`
- `GET /issues/notifications` -> `data: { notifications: Notification[] }`
- `POST /issues/notifications/read-all` -> `data: null`
- `DELETE /issues/notifications/:notificationId` -> `data: { notificationId }`
- `GET /issues/:id/evaluations` -> `data: { evaluations, collectiveEvaluations }`
- `POST /issues/:id/evaluations/draft` -> `data: null`
- `POST /issues/:id/evaluations/submit` -> `data: null`
- `POST /issues/:id/resolve` -> `data: { finished: boolean, rankedAlternatives: any|null }`
- `GET /issues/:id/weights/bwm` -> `data: { bwmData }`
- `POST /issues/:id/weights/bwm/draft` -> `data: null`
- `POST /issues/:id/weights/bwm/submit` -> `data: null`
- `POST /issues/:id/weights/bwm/compute` -> `data: { finished: boolean, weights, criteriaOrder }`
- `GET /issues/:id/weights/manual` -> `data: { manualWeights }`
- `POST /issues/:id/weights/manual/draft` -> `data: null`
- `POST /issues/:id/weights/manual/submit` -> `data: null`
- `POST /issues/:id/weights/manual/compute` -> `data: { finished: boolean, weights, criteriaOrder }`
- `GET /issues/:id/scenarios` -> `data: Scenario[]`
- `POST /issues/:id/scenarios` -> `data: { scenarioId }`
- `GET /issues/scenarios/:scenarioId` -> `data: Scenario`
- `DELETE /issues/scenarios/:scenarioId` -> `data: { scenarioId }`

## 3.3 Admin

- `GET /admin/experts` -> `data: { users: AdminUser[] }`
- `POST /admin/experts` -> `data: { user: AdminUser }`
- `PATCH /admin/experts/:id` -> `data: { user: AdminUser }`
- `DELETE /admin/experts/:id` -> `data: { deletedUser, summary }`
- `GET /admin/issues` -> `data: { issues: AdminIssueRow[] }`
- `GET /admin/issues/:id` -> `data: { issue: AdminIssueDetail }`
- `DELETE /admin/issues/:id` -> `data: { issueName }`
- `GET /admin/issues/:id/experts/progress` -> `data: { issue, experts }`
- `GET /admin/issues/:issueId/experts/:expertId/evaluations` -> `data: { issue, expert, participation, stats, evaluations, collectiveEvaluations }`
- `GET /admin/issues/:issueId/experts/:expertId/weights` -> `data: { issue, expert, participation, weights }`
- `PATCH /admin/issues/:id/admin` -> `data: { issue, admin }`
- `PATCH /admin/issues/:id/experts` -> `data: { issueName }`
- `POST /admin/issues/:id/weights/compute` -> `data: { finished, weights, criteriaOrder }`
- `POST /admin/issues/:id/resolve` -> `data: { finished, rankedAlternatives }`

## 4) Incompatibilidades detectadas en frontend (a corregir)

## 4.1 Uso de `msg` legado en vez de `message`

Hay muchos usos de `response.msg` y `result.msg`.

Busqueda para localizar:

```bash
rg -n "\.msg\b" Frontend/src
```

Ejemplos claros:
- `Frontend/src/features/activeIssues/hooks/useActiveIssueActions.js`
- `Frontend/src/features/issueAlternativeEvaluation/dialogs/direct/DirectAlternativesEvaluationDialog.jsx`
- `Frontend/src/features/issueAlternativeEvaluation/dialogs/pairwise/PairwiseAlternativesEvaluationDialog.jsx`
- `Frontend/src/features/issueWeightEvaluation/dialogs/manual/ManualWeightsEvaluationDialog.jsx`
- `Frontend/src/features/issueWeightEvaluation/dialogs/bwm/BwmWeightsEvaluationDialog.jsx`
- `Frontend/src/components/CreateLinguisticExpressionDialog/CreateLinguisticExpressionDialog.jsx`
- `Frontend/src/pages/private/createIssue/Steps/ExpressionDomainStep/ExpressionDomainStep.jsx`
- `Frontend/src/components/ResponsiveNabvar/ResponsiveNavbar.jsx`
- `Frontend/src/pages/private/admin/sections/ExpertsSection.jsx`
- `Frontend/src/pages/private/admin/sections/IssuesSection.jsx`
- `Frontend/src/components/Settings/Settings.jsx`

## 4.2 Lectura incorrecta de campos que ahora van en `data`

Casos criticos:

- `Frontend/src/context/auth/auth.provider.jsx`
  - Lee perfil como `data.name`, `data.email`, etc.
  - Debe leer `data.data.user.name`, `data.data.user.email`, etc.
  - Notificaciones: usa `response.notifications`; debe usar `response.data.notifications`.

- `Frontend/src/context/issues/issues.provider.jsx`
  - `GET /issues/active` ahora devuelve objeto con `issues/tasks/taskCenter/filtersMeta`, no array.
  - Hoy se hace `setActiveIssues(response?.data ?? [])` y se asume array.
  - Debe usar `setActiveIssues(response?.data?.issues ?? [])` y exponer `taskCenter`/`filtersMeta`.

- `Frontend/src/features/issueWeightEvaluation/dialogs/manual/ManualWeightsEvaluationDialog.jsx`
  - Usa `response.manualWeights`; debe usar `response.data.manualWeights`.

- `Frontend/src/features/issueWeightEvaluation/dialogs/bwm/BwmWeightsEvaluationDialog.jsx`
  - Usa `response.bwmData`; debe usar `response.data.bwmData`.

- `Frontend/src/features/issueAlternativeEvaluation/dialogs/direct/DirectAlternativesEvaluationDialog.jsx`
  - Usa `response.evaluations` y `response.collectiveEvaluations`; deben salir de `response.data`.

- `Frontend/src/features/issueAlternativeEvaluation/dialogs/pairwise/PairwiseAlternativesEvaluationDialog.jsx`
  - Mismo problema que dialogo direct.

- `Frontend/src/features/activeIssues/hooks/useActiveIssueActions.js`
  - Usa `response.finished`; debe usar `response.data.finished`.

- `Frontend/src/pages/private/admin/sections/ExpertsSection.jsx`
  - Usa `res.users`; debe usar `res.data.users`.

- `Frontend/src/pages/private/admin/sections/IssuesSection.jsx`
  - Usa `res.issues`; debe usar `res.data.issues`.
  - Usa `detailRes.issue`; debe usar `detailRes.data.issue`.
  - Usa `progressRes.experts`; debe usar `progressRes.data.experts`.
  - Usa `res.users` para admins/experts; debe usar `res.data.users`.

## 4.3 Servicios que aun no usan capa normalizada

`auth.service.js` y `admin.service.js` siguen devolviendo payload crudo y/o `false`.

Recomendacion:
- Opcion A: migrarlos a `requestJson` como `issue.service.js`.
- Opcion B: mantenerlos crudos, pero entonces en UI siempre leer `response.message` y `response.data.*`.

## 5) Reglas de migracion recomendadas para ChatGPT

1. No cambiar backend; solo frontend.
2. Reemplazar `msg` por `message` (con fallback temporal `message ?? msg` durante transicion si se desea).
3. Donde la respuesta venga de `issue.service.js`, leer SIEMPRE datos de `response.data`.
4. Donde la respuesta venga de `auth.service.js` o `admin.service.js`, leer SIEMPRE `response.data`.
5. Corregir `auth.provider` para mapear `me` desde `response.data.user`.
6. Corregir `issues.provider` para tratar `/issues/active` como objeto:
   - `activeIssues = data.issues`
   - `taskCenter = data.taskCenter`
   - `filtersMeta = data.filtersMeta`
7. Mantener mensajes de error/success centralizados en `response.message`.

## 6) Snippet base recomendado

```js
const ok = Boolean(response?.success);
const message = response?.message || "Request failed";
const payload = response?.data ?? null;

if (!ok) {
  showSnackbarAlert(message, "error");
  return;
}
```

Para endpoints con flags:

```js
const finished = Boolean(response?.data?.finished);
```

## 7) Checklist de validacion despues de migrar

- Login/logout funciona y no muestra success en respuestas `success: false`.
- Carga de perfil (`/auth/me`) rellena correctamente nombre/email/universidad.
- Navbar muestra notificaciones y acciones de invitacion sin usar `msg`.
- Pagina de active issues renderiza lista y task center.
- Dialogos de evaluaciones y pesos leen/escriben borradores correctamente.
- Panel admin lista expertos e issues con datos reales.
- Sin resultados en:

```bash
rg -n "\.msg\b" Frontend/src
```

## 8) Prompt sugerido para pegar en ChatGPT

```text
Usa este contexto para migrar el frontend al nuevo contrato HTTP del backend.
Objetivo: adaptar SOLO frontend para leer respuestas con shape success/message/data/error.
No toques backend.
Prioriza estos archivos: auth.provider, issues.provider, admin sections, dialogs de evaluaciones/pesos, navbar y settings.
Aplica cambios completos y consistentes (no parciales), y deja todos los mensajes en response.message.
```


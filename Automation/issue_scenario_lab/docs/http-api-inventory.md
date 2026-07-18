# HTTP API inventory for future issue scenarios

Verified base path: `http://localhost:5000/api` in `Backend/.env.example`.
All issue routes require `Authorization: Bearer <access-token>`. Responses use
`{ success, message, data, error }`. Login and refresh return the access token
at `data.token`; refresh uses the `refreshToken` cookie held by the same HTTP
client. The OpenAPI file contains some historical evaluation paths, so the route
and controller files below are the source of truth for this inventory.

| Operation | Method and path | Acting user / auth | Request body | Important response / transition | Verified source |
| --- | --- | --- | --- | --- | --- |
| Health | `GET /health` | Anonymous | None | `data.service`, `data.status`, `data.startedAt`; no state change | `Backend/app.js` |
| Login | `POST /auth/login` | Anonymous | `{ email, password }` | `data.token`, `userId`, `expiresIn`; sets refresh cookie | `routes/auth.route.js`, `controllers/auth.controller.js` |
| Refresh | `GET /auth/refresh` | Refresh-cookie authenticated | None | New `data.token`; no workflow transition | `routes/auth.route.js`, `middlewares/requireRefreshToken.js`, `middlewares/refreshToken.js` |
| Profile | `GET /auth/me` | Authenticated user | None | `data.user` safe profile | `routes/auth.route.js`, `controllers/auth.controller.js` |
| Logout | `POST /auth/logout` | Cookie holder | None | Clears `refreshToken` cookie | `routes/auth.route.js`, `controllers/auth.controller.js` |
| Models | `GET /issues/models` | Authenticated owner | None | Available model catalogue | `routes/issue.route.js`, `controllers/issue.controller.js` |
| Users | `GET /issues/users` | Authenticated owner | None | Users available for issue participation | Same |
| Expression domains | `GET /issues/expression-domains` | Authenticated user | None | Visible expression domains | `routes/issue.route.js`, `controllers/issues/expressionDomains.controller.js` |
| Create issue | `POST /issues` | Authenticated owner | `{ issueInfo: ... }` | Creates active issue; exact `issueInfo` shape will be obtained from the real UI when the first scenario is built | `routes/issue.route.js`, `Frontend/src/services/issue.service.js` |
| Active issues | `GET /issues/active` | Authenticated user | None | Active issues visible to user | `controllers/issues/activeIssue.controller.js` |
| Finished issues | `GET /issues/finished` | Authenticated user | None | Finished issues visible to user | `controllers/issues/finishedIssue.controller.js` |
| Finished detail | `GET /issues/finished/:id` | Authenticated visible user | None | Finished issue payload | Same |
| Invitation response | `POST /issues/:id/invitation-response` | Invited expert | `{ action: "accepted" | "declined" }` | Participation accepted or declined | `routes/issue.route.js`, `Frontend/src/services/issue.service.js` |
| Edit experts | `PATCH /issues/:id/experts` | Active issue owner | `{ expertsToAdd, expertsToRemove, expertWeightsByEmail? }` | Participants updated | `controllers/issues/activeIssue.controller.js` |
| Leave active issue | `POST /issues/:id/leave` | Participating expert | None | Current user leaves issue | Same |
| Get evaluation context | `GET /issues/:id/evaluations/:stage` | Participating user | None | Evaluation context and current stage data | `controllers/issues/evaluations.controller.js` |
| Save evaluation draft | `POST /issues/:id/evaluations/:stage/send` | Participating user | `{ payload: ... }` | Draft saved for stage | Same, `Frontend/src/services/issue.service.js` |
| Submit evaluation | `POST /issues/:id/evaluations/:stage/submit` | Participating user | `{ payload: ... }` | Submission may advance stage | Same |
| Compute evaluation stage | `POST /issues/:id/evaluations/:stage/compute` | Authorized participant/owner per Backend workflow | None | `data.result`, current stage transition | Same |
| Delete active issue | `DELETE /issues/:id` | Active issue owner | None | Deletes active workflow issue | `controllers/issues/activeIssue.controller.js` |
| Hide finished issue | `DELETE /issues/finished/:id` | Each visible user | None | Hides finished issue for that user; future cleanup must call once per visible alias | `controllers/issues/finishedIssue.controller.js` |
| List model scenarios | `GET /issues/:id/scenarios` | Visible finished-issue user | None | Existing **model scenarios**, not Python automation scenarios | `controllers/issues/scenarios.controller.js` |
| Create model scenario | `POST /issues/:id/scenarios` | Visible finished-issue user | `{ targetModelId, scenarioName, scenarioDescription, sourcePhase?, paramOverrides }` | `data.scenarioId` | Same, `Frontend/src/services/issue.service.js` |
| Read model scenario | `GET /issues/scenarios/:scenarioId` | Visible user | None | `data.scenario` | Same |
| Remove model scenario | `DELETE /issues/scenarios/:scenarioId` | Visible user | None | Removes model scenario | Same |

`/issues/:id/scenarios` are model-execution scenarios attached to finished
issues. They are unrelated to future Issue Scenario Lab generation scenario IDs
such as `no-consensus-basic`.

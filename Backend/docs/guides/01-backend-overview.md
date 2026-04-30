# Backend Overview

## Purpose

The Crete Valley DSS backend provides the API for:

- authentication and account/profile flows,
- issue creation, participation, evaluations, weighting, and resolution,
- consensus persistence and finished-issue reporting,
- admin operations for users, issues, and model governance,
- integration with ApiModels for model execution and manifest governance.

## Runtime entrypoints

- `server.js`: environment bootstrap, Mongo connection startup, HTTP server startup.
- `app.js`: Express composition (CORS, JSON, cookies, docs endpoints, routers, static SPA fallback, global error handling).

## Main API areas

- `/api/auth`
- `/api/issues`
- `/api/admin`

## Layer boundaries

- Controllers are thin HTTP adapters.
- Domain logic belongs in modules (`modules/auth`, `modules/issues`, `modules/admin`).
- Infrastructure and external integrations belong in services (`services/modelApi`, email, tokens).
- Shared primitives (`AppError`, response builders, id/string helpers) live in `utils/common`.

## Core domain aggregate

`Issue` is the central aggregate, linked to:

- structure: `Alternative`, `Criterion`,
- participation/progress: `Participation`, `ExitUserIssue`, `Notification`,
- evaluation/weighting: `Evaluation`, `CriteriaWeightEvaluation`,
- consensus artifacts: `Consensus`,
- expression-domain snapshots: `IssueExpressionDomain`,
- simulations: `IssueScenario`.

## Model contract dimensions

The issue-resolution architecture separates model behavior into independent dimensions:

- `evaluationStructure`: evaluation capture/persistence behavior (`direct`, `pairwiseAlternatives`, future structures).
- `inputKind`: ApiModels request payload family (for example `directCrispMatrix`, `directFuzzyMatrix`, `pairwisePreferenceMatrix`).
- `outputKind`: normalized result family interpreted by backend resolution flows (for example `ranking`, `consensusRanking`).
- `isConsensus`: whether the issue enters the consensus-cycle logic.

These dimensions are intentionally decoupled.  
For example, a direct model can be consensus or non-consensus, and pairwise is not automatically synonymous with consensus.

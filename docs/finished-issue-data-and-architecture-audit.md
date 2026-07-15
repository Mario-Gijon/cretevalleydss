# Finished Issue: data and architecture audit

## Scope and method

This began as an evidence-based audit of the current
`ui/finished-issue-dialog` branch. Its original audit phase was documentation
only; the implementation status at the end records the subsequent backend-only
contract migration.

Inspected backend entry points include `GET /issues/finished/:id`,
`getFinishedIssueInfoPayload`, every file in
`Backend/modules/issues/finished/finishedPayload/`, the scenario endpoints and
builders, expression-domain assignment/context builders, model execution, and
the two existing finished-payload tests. Inspected frontend code includes the
dialog provider/hook/shell, Dashboard, Overview, Results Analysis, Ratings,
Consensus, Models, shared logic/primitives, registry Views, fixtures, and
finished-dialog tests.

**Terminology.** “Stored” means a MongoDB field exists. “Immutable” means the
schema or write path enforces immutability. No audited production schema uses
MongoDB immutable fields. `IssueStageResult` and `IssueScenario` are used as
execution evidence in practice, but that is a convention, not an enforcement.
The current `Participation` record is mutable current state; a stage result's
`expertWeights` is the appropriate immutable-in-meaning per-phase evidence.

## Findings at a glance

1. The finished endpoint is a **presentation DTO**, not an auditable record.
   It returns `summary`, rankings, display-normalized alternative evaluations,
   selected contexts, graphs, model parameters, and duplicated consensus
   aliases. It omits most stable IDs, timestamps, participant state, domain
   assignments, raw evaluations, all criteria-weighting metadata, stage-result
   IDs/timestamps/expert-weight snapshots, and scenarios.
2. The database contains most factual evidence needed for a Finished Issue.
   The primary exceptions are execution-time snapshots of the base model's
   registry metadata/description and an enforced immutable base execution
   envelope. Those need an explicit archival contract if historic accuracy
   across later model-registry edits is required.
3. Expression domains are correctly snapshotted per issue and used when
   building evaluation contexts. The finished summary drops the
   criterion-to-domain relationship entirely. The current frontend cannot
   reliably show the full domain inventory or the domain used by each leaf.
4. Alternative evaluation display can reuse the registered frontend View in
   read-only mode today. Criteria weighting can also reuse its registered View
   in read-only mode, but the current finished payload omits the associated
   evaluation IDs, timestamps, raw payloads, context, model/parameters and
   collective-result metadata. Do **not** introduce a duplicate Finished Issue
   renderer.
5. Scenarios retain a strong execution record in `IssueScenario`, but they are
   deliberately excluded from the main finished payload and fetched through
   separate endpoints. A selected scenario is then merged client-side into a
   base-shaped DTO. That merge is lossy and does not yield an equivalent
   factual contract to the base execution.
6. The frontend has begun section isolation for Dashboard, Overview, and
   Results Analysis. Evaluations, Consensus, and Models remain monolithic
   components with context reads, inline normalization, visual styling, and
   cross-section/shared dependencies mixed together.

## 1. Database data audit

### Entity inventory and mutability

| Entity | Stored factual data | Mutable status | Loaded by finished endpoint | Current outcome |
|---|---|---|---|---|
| `Issues` | definition, lifecycle, chosen model/runtime keys, consensus config, structure keys, parameters, dates | Mutable schema; finished lifecycle is stateful | Yes; model, owner and creator partially populated | Select fields enter `summary`, `modelParams`, contexts; many omitted |
| `Alternatives` | issue, name, description, position | Mutable schema; no timestamps | Yes, ordered | id/name/description in summary; position omitted |
| `Criteria` | issue, parent, name, description, type, leaf flag, domain snapshot reference, position | Mutable schema; no timestamps | Yes, all criteria plus ordered leaves | hierarchy/basic fields and final leaf weights only; position/domain omitted |
| `IssueExpressionDomains` | source-domain link, name, type key, full definition, timestamps | Mutable schema | Yes, but only for model compatibility | not returned as a domain collection; no assignment map |
| `Participations` | expert, invitation/status/completion flags, current weight, entry data, join/create/update dates | Mutable current state | Yes; expert populated as email/name | collapsed to participated and declined email arrays |
| `IssueEvaluations` | expert, stage, phase, original payload, completed, submitted/create/update dates | Draft/completion fields mutable | Only completed alternative evaluations for relevant phase(s); latest criteria-weighting phase also queried | alternative payloads are transformed and keyed by email; metadata lost; criteria weighting is partial display data |
| `IssueStageResults` | stage/phase, consensus, ranking, collective values, plots, execution, raw output, expert snapshots, timestamps | Semantically evidence but not schema-immutable | Alternative results loaded; criteria-weighting result queried only to get weights/phase | selected factual parts exposed; IDs/timestamps/expert snapshots and most criteria stage data omitted |
| `IssueScenarios` | complete target/runtime/config/input/output snapshot and timestamps | Semantically evidence but removable and mutable schema | No, main payload sets `scenarios: []` | separate list/detail APIs expose much of it; main DTO has none |
| `IssueModels` | registry/model capability, parameter definitions, descriptions, API metadata, supported domains | Mutable registry | Base model populated; active visible issue models queried | base params plus a reduced available-model catalog; full historic contract not retained |
| `ExpressionDomain` | reusable source definition, ownership/global/lock, created date | Mutable schema | Not directly | source id is stored in issue snapshot but not exposed by finished loader |
| `Users` | name, university, email and account fields | Mutable/profile data | owner/creator/expert populated only as email/name | owner email and expert email summaries; name sometimes only in scenario APIs; university omitted |

### `Issues`: definition, configuration, and lifecycle

Stored fields are `ownerId`, `createdBy`, `model`, `apiModelKey`,
`apiEndpoint`, `name`, `description`, `active`, `currentStage`,
`creationDate`, `closureDate`, `finishedAt`, `createdAt`, `updatedAt`, the
consensus controls (`isConsensus`, `supportsConsensus`, `simulateConsensus`,
`consensusMaxPhases`, `consensusThreshold`, `consensusPhase`), alternative and
criteria-weighting structure keys, criteria-weighting model/runtime/parameters,
and `modelParameters`.

The endpoint populates `model`, `ownerId(email,name)`, and
`createdBy(email,name)`. `summary` keeps name, owner **email**, description,
base model **name**, legacy `creationDate`/`closureDate`, structure keys, and
minimal consensus information. `modelParams.base` keeps base model id/name,
parameter definitions, saved/resolved parameters, and support flag. It does
not expose issue id, createdBy, owner name/id, model API key/endpoint,
`active/currentStage/finishedAt/createdAt/updatedAt`, simulation flag, model
weight/expert-weight/type capabilities, or criteria-weighting model runtime.

User-facing: issue identity/definition, creator/owner identity (subject to
privacy policy), lifecycle dates/status, selected model/configuration, and
consensus configuration. Technical-only: endpoints, API keys, registry sync
and request/response metadata; keep them available under technical metadata
for audit/admin use rather than mixing them into display summaries.

### Alternatives and criteria

Alternative stable id, name, description, and position are stored. The
finished loader selects only `_id name description`; it preserves id in
`summary.alternatives[]`, loses position, and cannot report alternative
timestamps because the schema has none.

Criteria store id, parent id, name, description, type, `isLeaf`, position, and
an `IssueExpressionDomain` id for leaf assignments. All criteria are loaded
for tree construction; ordered leaves are selected with domain ids. The
summary tree preserves `_id`, name, description, type, leaf boolean, parent,
children, and a final weight on leaves. It drops position and every
expression-domain reference/definition. Non-leaf nodes correctly remain
unweighted. Criterion fields are user-facing except internal foreign keys and
technical raw definitions; the IDs still need preservation for audit and
stable UI keys.

Final weights come from the latest criteria-weighting stage result's
`collectiveEvaluations.weightsByCriterion` when present, otherwise from
`issue.modelParameters.weights` (or implicit weight 1 for a sole leaf).
`finalCriteriaWeights.source` identifies only those two sources. It does not
state whether a creator directly set the values, which expert structure/model
was used, or the exact final stage-result id. It cannot clearly state the
requested provenance today.

### Expression domains

`ExpressionDomain` is the reusable source. `IssueExpressionDomain` copies its
`sourceDomain`, name, type key, and definition into an issue snapshot with
timestamps. `assignIssueDomainSnapshots`/`createIssueDomainSnapshots` attach
the snapshot id to each leaf `Criterion`. Evaluation-context builders resolve
the ids and serialize `{ id, _id, name, typeKey, definition }` into each leaf
criterion; this preserves numeric ranges, ordinal labels, fuzzy labels and
membership definitions, and supports different domains by criterion.

The finished loaders fetch all issue snapshots with `_id name typeKey
definition`, but pass them only into available-model compatibility. The
current finished payload has no `expressionDomains` collection, source-domain
id, snapshot dates, or criterion-to-domain assignment. `summary.criteria`
therefore **does lose the criterion-to-domain relationship**. The current
frontend can only receive domain data incidentally inside
`evaluationContext.leafCriteria`, normally for the selected alternative phase;
it cannot reliably display all unique domains or their assignments.

### Participants and profiles

`Participation` stores expert id; invitation status; alternative/weighting
completion flags; current mutable `weight`; entry phase/stage; `joinedAt`; and
Mongoose `createdAt/updatedAt`. User records add name, email, and university.
Finished loaders populate experts with only `email name`; they do load all
participations, including pending/declined/accepted.

`buildParticipationsSummary` reduces this to two email arrays:
`participated` means an expert has a loaded completed **alternative**
evaluation, not invitation acceptance; `notAccepted` actually means declined,
not every non-accepted participant. Pending, accepted-but-incomplete,
participation IDs, names, university, current weights, entry metadata and all
dates disappear. In particular, “participated” and current participation
weight must not be presented as an immutable phase record. Use
`IssueStageResult.expertWeights` (and a copied per-phase snapshot in the target
payload) for that evidence instead.

### Evaluations, results, and scenarios

`IssueEvaluation` has the complete raw individual record, including id,
expert, stage, phase, payload, completed/submitted/create/update dates. The
finished loader restricts alternative records to `completed: true` and the
executed phase(s), so drafts and unrelated phases are absent. It fetches all
criteria-weighting records only at the latest criteria-weight phase, including
drafts, but then indexes them by expert and discards their metadata.

`IssueStageResult` is the canonical persisted per-stage/per-phase execution
result: id, stage, phase, consensus measure, ranking, collective values, plot
data, normalized model execution, raw output, expert-weight snapshots, and
timestamps. The existing base payload exposes alternative result content but
does not preserve result ID/timestamps/expert snapshots. Criteria-weighting
stage results are used only to derive final weights and phase.

`IssueScenario` retains target model/runtime keys, structures, domain family,
status/error, config, normalized parameters, phase and expert order, snapshots
of alternatives/criteria/weights/evaluation payloads/context, standard result,
model execution/raw output, creator and timestamps. The scenario detail API
exposes nearly all of it; the scenario list intentionally exposes a small
subset. The main finished payload always uses `scenarios: []`.

## 2. Finished Issue backend audit

### Route, controller, loader, and validation

`GET /issues/finished/:id` calls `getFinishedIssueInfoPayload`, checks access,
requires `currentStage === "finished"` and `active === false`, and verifies
that the alternative evaluation registry structure has a backend `get` method.
It then selects a consensus or non-consensus builder. There is no separate
controller/service directory; the module function is the service boundary.

`loadFinishedPayloadData` loads ordered alternatives, ordered leaves, complete
criteria, populated participations, completed alternative evaluations and
relevant criteria-weighting evaluations, issue domain snapshots, and a live
catalog of visible non-stale issue models. The base `Issue` query pre-populates
the selected base model and two user relations. Loaders do **not** populate
criterion domains; they retain only the ids until the evaluation-context
builder resolves them.

Validation appropriately rejects missing result/evaluation coverage, invalid
phases, unsupported structures, and missing required final weights. It also
means the finished view fails rather than describes a historically incomplete
finished record. That is reasonable for the current UI, but the target audit
contract should expose evidence and a completeness status rather than discard
all visibility where a record is partial.

### Current payload shape, transformations, omissions and duplication

The endpoint returns approximately:

```text
summary, evaluationContext, alternativesRankings, expertsRatings,
finalCriteriaWeights, analyticalGraphs, consensusDetails, modelExecution,
consensus, consensusHistory, consensusRounds, scenarios: [], modelParams
```

The registered backend structure's `get({ payload, evaluationContext })`
transforms raw individual evaluation payloads into display payloads. They are
then keyed by expert **email**, not expert id. Graph data is enriched with
email labels. Rankings are normalized/validated. Model parameters are merged
with live model defaults. These are useful display transformations but are not
lossless archival representations.

For consensus issues, the same round objects are emitted three times as
`consensus`, `consensusHistory`, and `consensusRounds`; the final round is
also copied into `consensusDetails`, and its execution is copied to
`modelExecution`. For non-consensus issues, a related final-result subset is
in `consensusDetails` while all three round arrays are empty. Thus base and
scenario executions do not have equivalent factual contracts, and consensus
versus non-consensus requires divergent frontend fallback rules.

Raw data survives only in narrow locations: `rawOutput` remains under a round
and/or `modelExecution`, `collectiveEvaluations` remains under a round and
ratings, and scenario raw inputs/outputs live only in the separate scenario
detail API. IDs and timestamps are generally transformed away. `Issue`,
alternatives, criteria, participations, evaluations, stage results, issue
domain snapshots, source-domain ids, and scenarios are not carried as
canonical collections.

## 3. Evaluation registry audit

The backend registry discovers structures from folders and requires a key,
stage, and `get` function. Stages are `criteriaWeighting` and
`alternativeEvaluation`. The frontend registry loads the same-named modules
and requires a key, stage, and React `View`. Current entries are:

| Stage | Structure keys | Read-only View support |
|---|---|---|
| Alternative evaluation | `alternativeCriteriaMatrix`, `alternativePairwiseByCriterion` | Yes: both registered Views accept `readOnly`; `EvaluationStructureRenderer` supplies a no-op setter |
| Criteria weighting | `manualCriteriaWeights`, `bestWorstCriteria` | Yes: registered Views use the same renderer/read-only contract |

`buildEvaluationStructureContext` serializes issue/model/stage/phase,
model and weighting parameters, alternatives, full criteria tree, leaf
criteria with resolved expression-domain snapshot, and current/previous
collective values. It supplies the required domain context for alternative
structures. Criteria weighting contexts currently include leaf criteria but
not a domain collection; that is sufficient for the current weighting Views,
but a target contract should expose domains consistently rather than rely on
the structure's incidental needs.

### What can and cannot currently be reconstructed

| Requested fact | Alternative stage today | Criteria-weighting stage today |
|---|---|---|
| Expert evaluation/display payload | Yes, selected completed phase only, keyed by email | Partial: latest stage only, keyed by email |
| Original raw payload | No; transformed by `structure.get` | No; transformed by `structure.get` |
| Evaluation id/expert stable id | No | No |
| Submitted/created/updated date and completed state | No | Only derived display status (`submitted`/`draft`); no dates |
| Structure key | Summary/global key only | Per-display entry plus summary key |
| Evaluation context/domains | One current context, phase-specific for alternatives | Context is used server-side but omitted |
| Collective evaluation | Yes in ratings and rounds | Only final weights derived; raw collective object omitted |
| Expert-weight snapshot used | No | No |
| Weighting model/parameters | No | No |

Conclusion: both stages can and should use the same registered plugin Views in
read-only mode. The required work is to send a stable evaluation record plus
its context and select it in a section builder; it is **not** a new Finished
Issue evaluation renderer.

## 4. Criteria, stage-result, and consensus audit

### Criteria provenance

The current record can show the complete criterion hierarchy and final leaf
weight, but cannot identify direct creator weighting versus expert weighting
with sufficient precision. It exposes `finalCriteriaWeights.source` only as
`modelParameters` or `criteriaWeightingStageResult`. It omits the selected
criteria-weighting structure, model, configured/effective parameters,
individual submissions, final stage-result id, and per-leaf domain. The target
must make this provenance explicit rather than infer it in JSX.

### Stage results

All `IssueStageResult` fields exist in MongoDB. Existing finished builders use:

| Field | Current exposure | Classification |
|---|---|---|
| `_id`, `createdAt`, `updatedAt` | omitted | immutable execution evidence in target |
| `stage`, `consensusPhase` | rounds/ranking keys; not criteria result | canonical standardized result metadata |
| `consensusMeasure` | alternative rounds/details | canonical standardized result data |
| `rankedAlternatives` | alternative rankings/rounds | canonical standardized result data |
| `collectiveEvaluations` | alternative ratings/rounds | stage-specific canonical collective input/result |
| `plotsGraphic` | enriched graphs/rounds | standardized visualization data; retain raw as technical evidence |
| `modelExecution` | final and/or each alternative round | model-specific execution evidence |
| `rawOutput` | final and/or each alternative round | raw technical output |
| `expertWeights` | omitted | immutable per-phase evidence |

The standardized result must be a separate normalized object
(`rankedAlternatives`, consensus values and plot data) from model-specific
`execution` and raw technical output. Do not treat arbitrary `rawOutput` as a
stable UI schema.

### Consensus

Stored issue controls provide whether consensus is enabled/supported/simulated,
maximum phases, threshold, and current phase. Every alternative stage result
provides a stored phase, measure, ranking, collective evaluations, plots,
execution/raw output, expert snapshot, and timestamps. Current consensus
payload derives `consensusReached`, `maxPhasesReached`, and finalization reason
from `modelExecution.consensusLifecycle` plus threshold; provides a line series
and enriched plot labels; and uses `formatConsensusRoundLabel` for labels.

Without new algorithms, the UI can show all stored rounds, ranking and score
changes, consensus measure/threshold/distance, submitted-evaluation counts,
collective value per phase, phase snapshot weights, final/reached phase and
finalization reason. It cannot claim causal interpretation, robustness,
sensitivity, confidence, or recommendations.

## 5. Model and scenario audit

### Base model

`IssueModel` stores id/name, kind, short/extended descriptions, endpoints/API
key, structure key, criteria-weighting support, consensus support/simulation,
criteria/expert/fuzzy/type flags, supported expression-domain constraints,
parameter definitions, implementation/public status, and request/response
technical metadata. The selected issue stores an API key/endpoint and saved
parameters, but does not snapshot all model registry descriptive/capability
fields at issue finalization.

The finished endpoint exposes only a selected subset in `modelParams.base` and
the reduced `availableModels` catalog. It omits extended description,
`modelKind`, expert-weight flag, criterion type flag in some base paths,
domain support constraints, API metadata, and weighting-model details. Live
registry reads mean defaults and parameter definitions may differ after a
registry edit; target `models.base.definitionSnapshot` should preserve the
effective definition used, while technical live-registry data stays separate.

### Scenario execution

Scenario creation builds an execution context from the final alternative phase,
accepted participations, completed alternative evaluations, ordered
alternatives/leaves, issue domain snapshots, compatibility checks, normalized
parameters, and a current participation-derived expert weight map. It stores
the target model/runtime snapshot, source evaluation structure, domain family,
configured/normalized params, phase, expert order, alternative/criterion
snapshots, weights, evaluation payloads/context, standard result, execution,
raw output, creator, status/error, and dates.

This is sufficient for factual comparison with the base **when the target
payload exposes both records in the same normalized envelope**. Today it is
not: scenario details are separate, its input criterion snapshot lacks
description/parent/position/domain snapshot, and the client-side
`applyScenarioToIssueInfo` mutates a cloned base presentation DTO, clears
consensus arrays, injects scenario outputs, and reuses base summary/evaluation
data. It is not proof that an equivalent base/scenario contract exists.

## 6. Required data table

Status values are deliberately limited to the requested vocabulary.

| Area | Data item | Database source | Current backend payload path | Current frontend path | Status | Recommended destination | Required change |
|---|---|---|---|---|---|---|---|
| Issue | stable issue id | `Issues._id` | no canonical path | fallback `summary.id`/selected list | Stored but not exposed | `issue.id` | serialize id once |
| Issue | definition and lifecycle dates | `Issues` | `summary.*` partly | overview/dashboard | Available but partially exposed | `issue`, `lifecycle` | add ISO created/updated/finished and owner/creator ids |
| Alternatives | id/name/description | `Alternatives` | `summary.alternatives` | overview/results | Available and used | `alternatives[]` | preserve position separately |
| Alternatives | position | `Alternatives.position` | omitted | none | Stored but not exposed | `alternatives[].position` | serialize ordered record |
| Criteria | hierarchy/basic fields | `Criteria` | `summary.criteria` | overview/rating fallback | Available but partially exposed | `criteria.tree/nodes` | retain position and stable `id` naming |
| Criteria | final weights and source | stage result / issue params | `finalCriteriaWeights`, summary leaf weight | ratings/overview | Available but partially exposed | `criteria.finalWeights` | include stage/model/provenance id |
| Domains | snapshots/full definitions | `IssueExpressionDomains` | only inside `evaluationContext`; otherwise omitted | registered alternative View only | Available only in raw payload | `expressionDomains[]` | expose snapshot/source ids/dates/definition |
| Domains | criterion-domain assignment | `Criteria.expressionDomain` | omitted from summary | none reliably | Stored but not exposed | `criteria.nodes[].expressionDomainId` | serialize assignment for each leaf |
| Participants | identity/status/current state | `Participations` + `Users` | `summary.experts` emails only | overview/dashboard | Available but partially exposed | `participants[]` | expose id/profile/status/completion/entry/dates |
| Participants | university | `Users.university` | omitted | none | Stored but not exposed | `participants[].profile.university` | select subject to privacy policy |
| Evaluation | raw individual record metadata | `IssueEvaluations` | omitted | none | Stored but not exposed | `evaluations.individual[]` | preserve id/stage/phase/payload/completed/dates |
| Evaluation | display payload/context | registry + domain snapshots | `expertsRatings`, `evaluationContext` | RatingsSection | Available but partially exposed | section builder derived data | keep raw canonical; derive display once |
| Evaluation | criteria-weighting model/params | `Issues`/`IssueModels` | omitted | none | Stored but not exposed | `configuration.criteriaWeighting` | serialize configuration/snapshot |
| Evaluation | collective values | `IssueStageResults` | rounds/ratings for alternatives | RatingsSection | Available but partially exposed | `evaluations.collective[]` | separate from individual evaluations |
| Evaluation | expert weights used | `IssueStageResults.expertWeights` | omitted | none | Stored but not exposed | `phaseResults[].expertWeightSnapshot` | serialize per result/phase |
| Results | ranking/measure/plots | `IssueStageResults` | rankings/rounds/graphs | results/consensus | Available but partially exposed | `phaseResults[]` | remove aliases, retain result id/dates |
| Results | execution/raw output | `IssueStageResults` | `modelExecution`, `consensusDetails`, rounds | model output | Available but partially exposed | `phaseResults[].execution` | distinguish standard vs technical |
| Consensus | controls/final status | `Issues` + result lifecycle | `summary.consensusInfo` | dashboard/overview/consensus | Available but partially exposed | `consensus` | expose simulate/support/reached/final plus rounds by reference |
| Models | base definition/config/effective params | `Issue` + `IssueModels` | `modelParams.base` | models hook/component | Available but partially exposed | `models.base` | snapshot full user-facing model definition |
| Models | compatible catalog | live `IssueModels` | `modelParams.availableModels` | add-scenario UI | Available and used | separate capability endpoint or `models.available` | do not mix with archival base execution |
| Scenarios | list | `IssueScenarios` | main payload `scenarios: []`; list API | header runs | Available but unused | `scenarios[]` | include normalized list in Finished Issue contract |
| Scenarios | complete execution evidence | `IssueScenarios` | separate detail API | client-side merge | Available but partially exposed | `scenarios[].execution` | normalize alongside base execution |
| Timestamps | alternatives/criteria | schemas have none | none | none | Not currently available | Not applicable | do not invent dates |

## 7. Safe derived factual values

These values require no new decision-analysis algorithm when their source data
is supplied: issue duration; alternative/total criterion/leaf criterion counts;
criteria-tree depth; distinct domain count and criteria grouped by domain;
participant counts by invitation/completion state; evaluation completion counts
by stage/phase; earliest/latest submission dates; consensus round count; winner;
ranking position and score deltas; ranking changes between rounds; and distance
between consensus measure and threshold. Keep each derivation labelled as a
calculation and retain its source ids/phase.

Do not derive or label confidence, robustness, sensitivity, strengths,
weaknesses, recommendations, trade-offs, causality, or natural-language
conclusions in this factual layer.

## 8. Target normalized backend contract

The contract below is JSON-serializable, uses stable string ids and ISO-8601
dates, keeps canonical data once, and isolates user-facing from technical
details. `null` means unavailable, arrays are explicit, and `technical` is not
for default visual display.

```json
{
  "issue": {
    "id": "issue-1",
    "name": "Select a site",
    "description": "Resolved location decision.",
    "owner": { "id": "user-owner", "name": "Owner", "email": "owner@example.test" },
    "creator": { "id": "user-owner", "name": "Owner", "email": "owner@example.test" },
    "createdAt": "2026-01-10T09:00:00.000Z",
    "updatedAt": "2026-01-22T12:00:00.000Z"
  },
  "lifecycle": {
    "active": false,
    "currentStage": "finished",
    "creationDate": "10 of January, 2026",
    "closureDate": "22 of January, 2026",
    "finishedAt": "2026-01-22T12:00:00.000Z"
  },
  "configuration": {
    "alternativeEvaluation": { "structureKey": "alternativeCriteriaMatrix" },
    "criteriaWeighting": {
      "required": true,
      "structureKey": "manualCriteriaWeights",
      "model": { "id": "model-weight", "name": "Manual weights" },
      "configuredParameters": {},
      "effectiveParameters": {}
    }
  },
  "alternatives": [
    { "id": "alt-a", "name": "Alternative A", "description": null, "position": 0 }
  ],
  "criteria": {
    "nodes": [
      { "id": "criterion-root", "name": "Cost", "description": null, "type": "benefit", "isLeaf": false, "parentId": null, "position": 0, "childIds": ["criterion-price"], "expressionDomainId": null },
      { "id": "criterion-price", "name": "Price", "description": "Annual cost", "type": "cost", "isLeaf": true, "parentId": "criterion-root", "position": 0, "childIds": [], "expressionDomainId": "domain-1" }
    ],
    "rootIds": ["criterion-root"],
    "finalWeights": {
      "source": { "kind": "criteriaWeightingStageResult", "phaseResultId": "result-cw-0", "stage": "criteriaWeighting", "phase": 0 },
      "byCriterionId": { "criterion-price": 1 }
    }
  },
  "expressionDomains": [
    { "id": "domain-1", "sourceDomainId": "global-domain-4", "name": "0 to 10", "typeKey": "numericContinuous", "definition": { "min": 0, "max": 10 }, "createdAt": "2026-01-10T09:01:00.000Z", "updatedAt": "2026-01-10T09:01:00.000Z" }
  ],
  "participants": [
    { "id": "participation-1", "expert": { "id": "user-expert", "name": "Expert", "email": "expert@example.test", "university": "Example University" }, "invitationStatus": "accepted", "evaluationCompleted": true, "weightsCompleted": true, "currentWeight": 0.6, "entryStage": "alternativeEvaluation", "entryPhase": 0, "joinedAt": "2026-01-11T09:00:00.000Z", "createdAt": "2026-01-10T10:00:00.000Z", "updatedAt": "2026-01-11T09:00:00.000Z" }
  ],
  "evaluations": {
    "individual": [
      { "id": "evaluation-a-0", "expertId": "user-expert", "stage": "alternativeEvaluation", "phase": 0, "structureKey": "alternativeCriteriaMatrix", "payload": { "alt-a": { "criterion-price": { "value": 8 } } }, "completed": true, "submittedAt": "2026-01-12T10:00:00.000Z", "createdAt": "2026-01-11T10:00:00.000Z", "updatedAt": "2026-01-12T10:00:00.000Z", "contextRef": "alternativeEvaluation:0" }
    ],
    "contexts": [
      { "id": "alternativeEvaluation:0", "stage": "alternativeEvaluation", "phase": 0, "structure": { "key": "alternativeCriteriaMatrix" }, "alternatives": ["alt-a"], "leafCriteria": ["criterion-price"], "expressionDomainIds": ["domain-1"], "previousCollectiveEvaluations": null }
    ],
    "collective": [
      { "phaseResultId": "result-a-0", "stage": "alternativeEvaluation", "phase": 0, "payload": { "alt-a": { "criterion-price": 8 } } }
    ]
  },
  "phaseResults": [
    { "id": "result-a-0", "stage": "alternativeEvaluation", "phase": 0, "consensusMeasure": 0.84, "rankedAlternatives": [{ "alternativeId": "alt-a", "name": "Alternative A", "score": 0.84, "rank": 1 }], "collectiveEvaluationRef": "result-a-0", "plotsGraphic": {}, "expertWeightSnapshot": [{ "expertId": "user-expert", "weight": 0.6 }], "standardResult": { "rankedAlternatives": [{ "alternativeId": "alt-a", "score": 0.84, "rank": 1 }] }, "execution": { "modelExecution": {}, "rawOutput": {} }, "createdAt": "2026-01-12T10:01:00.000Z", "updatedAt": "2026-01-12T10:01:00.000Z" }
  ],
  "consensus": {
    "enabled": true,
    "modelSupportsConsensus": true,
    "simulated": false,
    "maxPhases": 3,
    "threshold": 0.8,
    "currentPhase": 0,
    "reachedPhase": 0,
    "finalizationReason": "consensusReached",
    "rounds": [{ "phase": 0, "phaseResultId": "result-a-0", "labelKey": "initial" }]
  },
  "models": {
    "base": { "id": "model-base", "name": "Base model", "description": { "short": "Short description", "extended": "Extended description" }, "kind": "issue", "evaluationStructureKey": "alternativeCriteriaMatrix", "capabilities": { "criteriaWeighting": true, "usesCriteriaWeights": true, "usesExpertWeights": true, "usesCriterionTypes": false, "usesFuzzyCriteriaWeights": false, "consensus": true, "supportedExpressionDomains": [] }, "parameterDefinitions": [], "configuredParameters": {}, "effectiveParameters": {}, "technical": { "apiModelKey": "base-key", "apiEndpoint": { "method": "POST", "path": "/model" } } }
  },
  "scenarios": [
    { "id": "scenario-1", "name": "Alternative model", "createdBy": { "id": "user-owner", "name": "Owner", "email": "owner@example.test" }, "status": "done", "error": null, "createdAt": "2026-01-23T10:00:00.000Z", "updatedAt": "2026-01-23T10:00:02.000Z", "targetModel": { "id": "model-other", "name": "Other model", "evaluationStructureKey": "alternativeCriteriaMatrix" }, "configuration": { "configuredParameters": {}, "normalizedParameters": {} }, "execution": { "sourcePhase": 0, "expertOrder": ["user-expert"], "alternatives": [{ "id": "alt-a", "name": "Alternative A" }], "criteria": [{ "id": "criterion-price", "name": "Price", "type": "cost", "expressionDomainId": "domain-1" }], "weightsUsed": { "criterion-price": 1 }, "evaluations": [{ "expertId": "user-expert", "payload": {} }], "context": {}, "standardResult": { "rankedAlternatives": [] }, "modelExecution": {}, "rawOutput": {} } }
  ],
  "executionMetadata": { "contractVersion": 1, "generatedAt": "2026-01-23T10:05:00.000Z", "completeness": { "missingEvidence": [] } }
}
```

User-facing sections consume the named top-level entities and normalized
execution facts. Technical output belongs only under `models.*.technical` and
`phaseResults[].execution`; raw payloads still remain serializable evidence,
not JSX-ready presentation data.

## 9. Frontend data and section architecture audit

### Current flow

`useFinishedIssueDialogView` fetches the base finished payload and scenario
list in parallel, then fetches a scenario detail on selection. It owns loading,
navigation, phase, all accordion state, rating state via a nested hook, model
form state, and service calls. It also derives ranking, model parameter views,
header/dashboard/overview/ratings/model-specific output view-models and
scenario compatibility. Its context therefore has broad, coupled responsibilities.

`applyScenarioToIssueInfo` converts a scenario detail into a clone of the base
presentation DTO. This gives current views one object shape, but duplicates
base facts, loses original scenario contract distinctions, and makes scenario
data appear to be base data. It should be removed after target contract
adoption, not before.

| Payload area | Current frontend path/normalizer | Used? | Problem |
|---|---|---|---|
| Summary | `overview` and `dashboard` builders; direct JSX fallbacks | Yes | presentation-shaped, no canonical entity layer |
| Rankings | hook `ranking`, results/dashboard builders | Yes | phase selection assumes phase index equals phase key in several paths |
| Alternative evaluations | `useFinishedIssueRatingsView` + `EvaluationStructureRenderer` | Yes | transformed payload keyed by mutable email; missing metadata/context per record |
| Criteria-weight evaluations | RatingsSection direct rendering | Partly | inline formatting/lookup; metadata absent |
| Graphs | shared graph normalizer, results/consensus JSX | Yes | raw graph variants handled in multiple places |
| Consensus | dashboard builder and monolithic `ConsensusSection` | Partly | no pure contract/builder; historical evidence hidden |
| Models/params | hook + ModelsSection | Partly | parameter context built inside visual component |
| Scenarios | hook list/detail + `applyScenarioToIssueInfo` | Yes | separate API and lossy client merge |
| Raw execution output | `buildFinishedModelOutputView` then JSX | Partly | only selected output, no stage-result metadata |

### Section responsibility table

| Current responsibility | Current file | Problem | Target layer | Proposed target file |
|---|---|---|---|---|
| Dashboard context extraction and preview creation | `sections/dashboard/DashboardSection.jsx` | takes many unrelated context fields; dashboard derives section data itself | section container + preview selectors | `sections/dashboard/DashboardSection.jsx`, `logic/buildDashboardData.js` |
| Dashboard duplication of Results Analysis builder | `sections/dashboard/logic/buildFinishedIssueDashboardData.js` | imports shared result builder and creates alternate partial canonical data | dashboard preview adapter | `sections/dashboard/logic/buildDashboardData.js` |
| Overview normalization | `sections/overview/logic/buildFinishedIssueOverviewData.js` | summary-only and no IDs/domains/participant records | pure section builder | `sections/overview/logic/buildOverviewData.js` |
| Results data shared alias | `sections/resultsAnalysis/logic/buildFinishedIssueResultsAnalysisData.js` | re-export disguises cross-section shared ownership | private builder | `sections/resultsAnalysis/logic/buildResultsAnalysisData.js` |
| Ratings selector/rendering/formatting | `evaluations/RatingsSection.jsx` and hook | one component reads context and contains large UI plus data normalization | section container, selectors, View/components/styles | `sections/evaluations/*` |
| Consensus rendering and data access | `sections/consensus/ConsensusSection.jsx` | direct context/raw payload access and all JSX/style logic together | container/builder/View | `sections/consensus/*` |
| Models parameter context/rendering | `models/ModelsSection.jsx` | visual component creates parameter context and accesses broad context | container/builder/View | `sections/models/*` |
| Model raw-output rendering | `models/ModelSpecificOutputSection.jsx` | private selected-execution behavior is separate but not section-scoped | model section component | `sections/models/components/ModelSpecificOutputView.jsx` |
| Global dialog state/actions/loads | `hooks/useFinishedIssueDialogView.js` | loader, scenario service calls and every section's state combined | dialog provider + focused hooks | `hooks/useFinishedIssueData.js`, `hooks/useFinishedIssueNavigation.js`, `hooks/useScenarioRuns.js` |
| Opinionated card primitives | `shared/components/FinishedIssueDialogPrimitives.jsx` | shared visual language prevents isolated redesign | shell-only neutral primitives or section-local components | retain only minimal shell primitives; move cards/rows/pills local |
| Graph normalization | `shared/logic/buildFinishedIssueGraphs.js` | genuinely shared by dashboard/results/consensus | shared pure utility | keep as `shared/logic/graphs.js` |

### Target section contracts

Each builder accepts the normalized target payload plus explicit UI selection
only where necessary; it returns serializable data and performs no formatting
that depends on JSX, icons, MUI, or layout.

| Builder | Input and owned payload areas | Output / safe derivations | Empty state | Must not duplicate |
|---|---|---|---|---|
| `buildDashboardData(payload, selection)` | previews from all section contracts | issue facts and compact preview references/counts; selected phase/winner | no finished payload / selected execution unavailable | complete ranking, evaluation records, model data |
| `buildOverviewData(payload)` | `issue`, `lifecycle`, `configuration`, `alternatives`, `criteria`, `expressionDomains`, `participants` | complete definition, tree/domain assignment, participant status counts, duration | missing optional description/domain/participants | results, evaluation payloads, execution output |
| `buildResultsAnalysisData(payload, selection)` | selected `phaseResults`, alternatives, criteria | selected ranking, winner, score/rank changes, graph-ready standardized data | no phase result/ranking/plot data | consensus history and raw technical output |
| `buildEvaluationsData(payload, selection)` | `evaluations`, participants, criteria, domains, weighting configuration, phase snapshots | individual/collective records, registry input `{structureKey, context, payload, readOnly}`, submission/completion facts | no records / unsupported registered View | duplicate renderer or independently recomputed weights |
| `buildConsensusData(payload)` | `consensus`, `phaseResults`, participants/evaluations by refs | ordered rounds, measure threshold distance, ranking changes, snapshots | consensus disabled/no rounds | full Results Analysis ranking or evaluation payload copies |
| `buildModelsData(payload, selection)` | `models.base`, scenarios, phase execution | base and selected-scenario model configs and exact execution evidence | no scenarios/technical output | scenario-to-base DTO mutation and duplicated rankings |

Dashboard preview contracts must be adapters over the complete section
contracts: `buildOverviewPreview(buildOverviewData(payload))`,
`buildResultsAnalysisPreview(buildResultsAnalysisData(payload, selection))`,
`buildEvaluationsPreview(buildEvaluationsData(payload, selection))`,
`buildConsensusPreview(buildConsensusData(payload))`, and
`buildModelsPreview(buildModelsData(payload, selection))`. Dashboard owns only
navigation actions and compact facts; it owns no alternate canonical copy.

### Target directory boundary

For each of `dashboard`, `overview`, `resultsAnalysis`, `evaluations`,
`consensus`, and `models`, use:

```text
sections/<section>/
├── <Section>Section.jsx
├── index.js
├── logic/
│   ├── build<Section>Data.js
│   ├── selectors.js              # only if needed
│   └── formatters.js             # only if needed
├── components/
│   ├── <Section>View.jsx
│   └── <section-specific components>
└── <section>.styles.js
```

Containers may read context, call pure builders, own local UI state/callbacks,
and pass explicit props. Logic may normalize/associate/order/derive safe facts;
it must not import React/MUI or return JSX/icons. Views may render MUI and
responsive layout, but must not read context, call services, normalize MongoDB
objects, or import builders/private files from other sections. Keep only truly
shared pure graph helpers and neutral shell/navigation contracts shared. Card,
row, pill, visual grid and section styles should be section-local so a visual
redesign needs edits only in `components/` and `<section>.styles.js`.

## 10. Prioritized implementation plan

### Phase 1 — Backend contract enrichment

Add normalized serializers/loaders for the stored fields that are currently
omitted: ids/ISO dates; full alternatives/criteria/domain assignments;
participants; base model/criteria-weighting config; phase-result IDs,
timestamps and expert snapshots. Keep legacy payload compatibility only if a
consumer migration requires it, then retire aliases.

### Phase 2 — Evaluation completeness

Expose raw individual evaluation records for both stages, their per-phase
registry contexts, structure keys, domain refs, submitted/completed dates,
collective records, final weights, and exact phase weight snapshots. Reuse
`EvaluationStructureRenderer` and the registered Views in read-only mode.

### Phase 3 — Frontend normalized contracts

Load the single target contract (including scenario summaries/details or an
equivalent normalized execution loader); replace `applyScenarioToIssueInfo`
with a selected-execution selector; implement all six pure section builders
and preview adapters.

### Phase 4 — Section isolation

Move Evaluations and Models under `sections/`, split Consensus into
container/builder/View, localize styles/components, and reduce the dialog hook
to data loading, navigation and focused feature hooks.

### Phase 5 — Tests

Add backend payload tests for ids/dates/domain mapping/participants/both
evaluation stages/weight snapshots/base-scenario equivalence; pure builder
tests for all sections; provider-free View tests; and phase/navigation tests
with sparse/non-contiguous phase values, non-consensus issues, multiple
domains, pending/declined/incomplete participants, and raw outputs.

### Phase 6 — Manual visual redesign

Visual design is explicitly not a Codex task. After data and boundaries are
stable, manually redesign in this order: (1) Dashboard shell/grid, (2)
Dashboard previews, (3) Overview, (4) Evaluations, (5) Results Analysis, (6)
Consensus, (7) Models, (8) responsive/shell polish, and (9) natural-language
explainability later.

| Recommended change | Current source | Proposed target | Database source | Proposed payload path | Tests | Migration risk |
|---|---|---|---|---|---|---|
| Canonical factual serializer | `finishedPayload/*` | `finishedPayload/buildNormalizedFinishedIssuePayload.js` | all audited entities | all top-level target fields | backend fixture/contract tests | Medium: legacy consumer migration |
| Domain/criteria audit data | summary/context builders | normalized criteria/domain serializer | `Criteria`, `IssueExpressionDomains` | `criteria`, `expressionDomains` | multiple-domain tests | Low data risk, Medium UI migration |
| Participant/evaluation metadata | summary/expert-rating builders | normalized participant/evaluation serializer | `Participations`, `Users`, `IssueEvaluations` | `participants`, `evaluations` | timestamp/status tests | Medium privacy/size review |
| Stage execution evidence | consensus/non-consensus builders | `phaseResults` serializer | `IssueStageResults` | `phaseResults`, `consensus` | base consensus/non-consensus tests | Medium: replace aliases |
| Base/scenario equivalence | scenario APIs + hook merge | common execution serializer/selector | `Issues`, `IssueScenarios` | `models`, `scenarios` | equivalence tests | Medium API/load size |
| Section builders | current builders/hook | six section `logic/build*Data.js` files | normalized payload only | n/a | pure builder tests | Low |
| Section isolation | Ratings/Consensus/Models/shared primitives | `sections/<section>/components` and styles | n/a | n/a | provider-free view tests | Medium import churn |

## Verification record

Required verification after this documentation-only change: `git diff --check`.
No full test suite is required by repository rules for a Markdown-only audit.

## Implementation status (2026-07-15)

The definitive backend Finished Issue contract is now implemented as contract
version 1. The legacy presentation DTO and its aliases have been removed from
the backend endpoint. Both evaluation stages, raw and display payloads,
registry contexts, criterion-domain assignments, all participant states,
phase-result timestamps and expert-weight snapshots, base-model metadata, and
scenario execution records are included.

Known historical limitations are explicit in `executionMetadata.completeness`:
the base model has no immutable registry-definition snapshot, and stored
scenario criterion snapshots do not retain hierarchy or expression-domain
assignments. Frontend migration is still pending by design; no frontend visual
work was performed. Natural-language explainability remains deferred.

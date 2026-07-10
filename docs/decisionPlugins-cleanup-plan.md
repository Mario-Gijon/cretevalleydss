# Decision Plugins Cleanup Plan

## Scope

This plan covers only:

- `Backend/modules/decisionPlugins/**`
- `Frontend/src/features/decisionPlugins/**`

It does not propose refactors in other folders. A few out-of-scope imports are mentioned only where they affect readability or self-containment inside `decisionPlugins`.

## Cleanup Principles

- Readability is the primary goal. New contributors should be able to follow the main data flow without decoding fallback logic scattered through the file.
- Keep plugins mostly self-contained. Plugin-specific logic should stay inside the relevant evaluation structure, expression-domain type, or parameter field folder.
- Do not over-split. A long file is acceptable when it is one coherent responsibility. Split only when the extracted unit has a clear name and removes a real cognitive burden.
- Centralize compatibility at boundaries. Old shapes, alias keys, and fallback field names should be resolved once in a clearly named function, not repeated in render code.
- Prefer precise names over generic names. Avoid `helpers`, `utils`, `rows`, `cells`, and similarly vague buckets.
- Preserve behavior while improving structure. Most of the recommended work is rename/reorder/extract-local-file cleanup, not architectural change.

## Current Readability Problems

- The two complex evaluation structures mix rendering, payload resolution, validation, compatibility fallbacks, and grid configuration in the same file.
- Pairwise logic mixes reciprocal math and grid interaction details, which makes the component read like a domain algorithm module.
- Some compatibility handling is centralized well on the backend, but the frontend still repeats old/new cell-shape resolution inside views.
- `Frontend/src/features/decisionPlugins/expressionDomains/expressionDomainDraftFields.js` is now clearer than the old `helpers.js` name, but pairwise and model-parameter work still carry most of the remaining readability cost.
- The linguistic fuzzy creation form is long because it contains both draft-state orchestration and UI rendering.
- Backend evaluation payload modules for matrix and pairwise are readable individually, but they duplicate several boundary concepts with near-identical naming.
- Backend model-parameter default resolution mixes generic parameter defaults with criteria-weight-specific legacy behavior.

## Area-by-Area Findings

### Frontend Evaluations

Main responsibilities:

- Render structure-specific evaluation UIs.
- Resolve evaluation context into alternatives and criteria.
- Adapt stored payloads to the view.
- Delegate cell editing to expression-domain inputs.
- Display collective values next to user-entered values.

Clean enough:

- `Frontend/src/features/decisionPlugins/evaluations/shared/ExpressionDomainEvaluationInput.jsx`
- `Frontend/src/features/decisionPlugins/evaluations/shared/formatCollectiveDisplayValue.js`
- `Frontend/src/features/decisionPlugins/evaluations/shared/evaluationMatrixTable.styles.js`
- `Frontend/src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/BestWorstCriteriaView.jsx`
- `Frontend/src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.payload.js`
- `Frontend/src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/ManualCriteriaWeightsView.jsx`

Hard to read or mixed-responsibility files:

- `Frontend/src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/AlternativeCriteriaMatrixView.jsx`
  - Mixes context resolution, payload normalization, old/new cell-shape fallback, validation, local error-map management, DataGrid configuration, and render fallback UI.
  - The main readability problem is not file length alone; it is that the component keeps switching between boundary logic and rendering.
  - Best cleanup class: extract one nearby plugin-local logic file plus small in-file helpers.
  - Best first extraction: `resolveMatrixCell.js` or `resolveAlternativeCriteriaMatrixCell.js`.
  - Secondary cleanup: reorder the component into sections and add light section comments.

- `Frontend/src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/PairwiseAlternativesGrid.jsx`
  - Mixes cell resolution, range lookup, reciprocal/inverse calculation, row building, edit-mode control, and DataGrid rendering.
  - The component currently reads as both view and pairwise math engine.
  - Best cleanup class: needs design discussion before refactor.
  - After the pairwise design is settled, extract one nearby plugin-local file for pairwise cell/range/inverse logic.

- `Frontend/src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/AlternativePairwiseByCriterionView.jsx`
  - Reasonably readable, but it repeats alternative/criterion resolution and plain-object guards already present in other evaluation views.
  - Best cleanup class: leave as-is for now.
  - If pairwise is touched later, move only the duplicated context resolution into a clearly named helper.

Shared-folder risk:

- The evaluation `shared` folder is not currently a dumping ground. The files in it have narrow responsibilities and should stay shared.

### Frontend Expression Domains

Main responsibilities:

- Register domain types.
- Render domain creation forms and evaluation inputs.
- Perform frontend-only validation before save or submit.

Clean enough:

- `Frontend/src/features/decisionPlugins/expressionDomains/expressionDomainTypeRegistry.js`
- `Frontend/src/features/decisionPlugins/expressionDomains/validateExpressionDomainEvaluation.js`
- `Frontend/src/features/decisionPlugins/expressionDomains/types/numericContinuous/evaluation.js`
- `Frontend/src/features/decisionPlugins/expressionDomains/types/numericDiscrete/evaluation.js`
- `Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticOrdinal/LinguisticOrdinalCreationForm.jsx`
- `Frontend/src/features/decisionPlugins/expressionDomains/types/numericContinuous/NumericContinuousCreationForm.jsx`
- `Frontend/src/features/decisionPlugins/expressionDomains/types/numericDiscrete/NumericDiscreteCreationForm.jsx`

Hard to read or mixed-responsibility files:

- `Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticFuzzy/LinguisticFuzzyCreationForm.jsx`
  - Contains draft-state derivation, automatic label generation, manual-mode transitions, payload emission, synchronization effects, and preview rendering.
  - The UI itself is not overly complex; the draft-state orchestration is what makes the file hard to scan.
  - Best cleanup class: extract one nearby plugin-local logic file.
  - Best extraction target: `buildLinguisticFuzzyDraftState.js`, `resolveLinguisticFuzzyDraft.js`, or similarly explicit naming.
  - Secondary cleanup: reorder helpers into sections such as input parsing, label generation, payload building, and component handlers.

Naming issues:

- `Frontend/src/features/decisionPlugins/expressionDomains/expressionDomainDraftFields.js`
  - The earlier vague `helpers.js` name has already been corrected.
  - The current name is specific enough and no longer needs cleanup.

Low-priority duplication:

- `NumericContinuousEvaluationInput.jsx` and `NumericDiscreteEvaluationInput.jsx` duplicate the same raw-text numeric parsing pattern.
- The duplication is understandable and still readable.
- Best cleanup class: leave as-is because splitting would make it worse unless a small, clearly named numeric input helper emerges inside the numeric domain folder.

### Frontend Model Parameters

Main responsibilities:

- Register parameter field renderers.
- Render global and criterion-scoped parameter editors.
- Render read-only parameter displays.

Clean enough:

- `Frontend/src/features/decisionPlugins/modelParameters/modelParameterRegistry.js`
- The global parameter field components
- The read-only field components

Files worth watching, but not immediate cleanup targets:

- `Frontend/src/features/decisionPlugins/modelParameters/fields/numberCriterion/NumberCriterionParameterField.jsx`
- `Frontend/src/features/decisionPlugins/modelParameters/fields/selectCriterion/SelectCriterionParameterField.jsx`
  - These files are readable, but they duplicate layout patterns across criterion-scoped fields.
  - They also depend on logic outside `decisionPlugins`, which slightly weakens plugin self-containment.
  - Best cleanup class: leave as-is because splitting would make it worse.

Shared-folder risk:

- No internal `decisionPlugins` model-parameter shared folder exists on the frontend.
- The more important concern is cross-folder dependency, not an internal dumping ground.

### Backend Evaluations

Main responsibilities:

- Register evaluation structures.
- Build read payloads for frontend editing.
- Validate and normalize submitted payloads.
- Resolve context-derived alternatives and criteria.

Clean enough:

- `Backend/modules/decisionPlugins/evaluations/evaluationStructureRegistry.js`
- `Backend/modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.payload.js`
- `Backend/modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.getPayload.js`
- `Backend/modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.payload.js`
- `Backend/modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.getPayload.js`

Hard to read or mixed-responsibility files:

- `Backend/modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.payload.js`
  - The file is already the correct boundary, but it duplicates concepts also present in pairwise: save-mode resolution, empty-cell building, cell validation, unknown-shape rejection, and normalized payload construction.
  - Best cleanup class: move truly shared logic into a clearly named shared subfolder, but only for the obvious duplicated boundary pieces.

- `Backend/modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.payload.js`
  - Same issue as matrix, plus pairwise-specific row/column validation.
  - Best cleanup class: move truly shared logic into a clearly named shared subfolder, but keep pairwise reciprocity logic local.

- `Backend/modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.getPayload.js`
- `Backend/modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/alternativePairwiseByCriterion.getPayload.js`
  - Both are readable, but they participate in duplicated read-model shaping.
  - Best cleanup class: leave as-is for now.
  - If phase 2 extracts shared logic, keep it narrow and boundary-focused.

Duplicated context resolution:

- `alternativeCriteriaMatrix.context.js` and `alternativePairwiseByCriterion.context.js` are near-duplicates for evaluation-context validation and alternative/criterion extraction.
- This duplication is currently tolerable because both files remain readable.
- Best cleanup class: move truly shared logic into a clearly named shared subfolder only if both structures are refactored in the same pass.
- Candidate names: `resolveEvaluationAlternatives.js`, `resolveEvaluationCriteria.js`, `resolveAlternativesAndLeafCriteria.js`.

### Backend Expression Domains

Main responsibilities:

- Register expression-domain types.
- Validate creation payloads.
- Validate evaluation values.

Clean enough:

- `Backend/modules/decisionPlugins/expressionDomains/expressionDomainTypeRegistry.js`
- `Backend/modules/decisionPlugins/expressionDomains/shared/validation.js`
- The numeric continuous/discrete creation and evaluation modules
- The linguistic ordinal/fuzzy evaluation modules

Readability notes:

- `linguisticFuzzy/creation.js` is longer than the other type validators, but it is still focused and coherent.
- `linguisticOrdinal/creation.js` accepts both string labels and object labels. That is a compatibility concern, not a readability failure.
- Best cleanup class: leave as-is for now.

Shared-folder risk:

- `Backend/modules/decisionPlugins/expressionDomains/shared/validation.js` is not a dumping ground. It contains boundary primitives with a clear responsibility.

### Backend Model Parameters

Main responsibilities:

- Register parameter structures.
- Validate and normalize submitted parameter values.
- Resolve defaults and merged parameter values.
- Validate criteria-weight arrays and criterion-scoped parameter maps.

Clean enough:

- `Backend/modules/decisionPlugins/modelParameters/parameterStructureRegistry.js`
- `Backend/modules/decisionPlugins/modelParameters/parameterValues.js`
- `Backend/modules/decisionPlugins/modelParameters/criteriaMetadata.js`
- `Backend/modules/decisionPlugins/modelParameters/modelParameterErrors.js`
- `Backend/modules/decisionPlugins/modelParameters/criteriaWeightValues.js`
- `Backend/modules/decisionPlugins/modelParameters/shared/validateNumberParameter.js`
- The individual structure validators

Hard to read or mixed-responsibility files:

- `Backend/modules/decisionPlugins/modelParameters/shared/validateCriterionMapParameter.js`
  - Mixes criterion alias indexing, enum normalization, scalar-to-map fallback, per-value validation, and missing-key enforcement.
  - The file name is good, but the internal flow is dense.
  - Best cleanup class: reorder code and add section comments.
  - If touched later, extract one small nearby file only for criterion alias indexing.

- `Backend/modules/decisionPlugins/modelParameters/resolveModelParameterValues.js`
  - Mixes generic default resolution with special criteria-weight behavior, fuzzy-weight handling, interval-length expansion, and legacy model flags such as `usesCriteriaWeights`.
  - Best cleanup class: needs design discussion before refactor.

- `Backend/modules/decisionPlugins/modelParameters/validateAndNormalizeModelParameters.js`
  - This is the central orchestration file. It is a bit long, but its flow is understandable.
  - Best cleanup class: leave as-is for now.
  - If touched later, prefer section reordering over extraction.

Shared-folder risk:

- `Backend/modules/decisionPlugins/modelParameters/shared` is not a dumping ground yet.
- The shared files are specific validators used by multiple parameter structures.

## Fallback and Legacy Compatibility Notes

| Pattern | Where | Recommendation | Notes |
| --- | --- | --- | --- |
| `cell.domain` vs `cell.expressionDomain` | `AlternativeCriteriaMatrixView.jsx`, `PairwiseAlternativesGrid.jsx` | Centralize in one named boundary function | The view should receive a resolved cell shape, not decide which domain field wins. |
| Primitive cell value vs object cell `{ value, expressionDomain }` | `AlternativeCriteriaMatrixView.jsx`, `PairwiseAlternativesGrid.jsx` | Centralize in one named boundary function | This is the main frontend payload compatibility leak. |
| Rejection of old payload container keys such as `cells`, `rows`, `matrix`, `evaluations`, `direct`, `pairwiseAlternatives` | Backend matrix and pairwise payload validators | Keep temporarily | This logic is already centralized at the correct backend boundary. Add tests before removal. |
| `id` / `_id` fallback when resolving alternatives and criteria | Frontend matrix/pairwise views, backend context resolvers | Keep temporarily | If touched later, centralize under clearly named evaluation-context resolvers. |
| Criterion alias fallback `id` / `_id` / `key` / `name` | `validateCriterionMapParameter.js` | Keep temporarily | This is useful compatibility logic, but it should remain visibly centralized in one place. |
| Repeated plain-object guards for `expressionDomain.definition` | Frontend expression-domain forms and inputs | Centralize locally when touched | Low priority. The repetition is minor compared with the evaluation-structure issues. |
| `definition.labels` accepts both strings and objects | `Backend/.../linguisticOrdinal/creation.js` | Needs migration decision | Remove only after confirming whether old payloads still rely on string labels. |
| `domain.range` lookup for pairwise inverse behavior | `PairwiseAlternativesGrid.jsx` | Needs design discussion before refactor | Do not force this into generic expression-domain rendering until pairwise reciprocity rules are settled. |
| Missing or unsupported `typeKey` fallback | `ExpressionDomainEvaluationInput.jsx`, frontend validator, backend registry | Keep temporarily | This is appropriate boundary behavior, not a major readability problem. |

Notes:

- No meaningful in-scope usage of `numericRange` or `linguisticLabels` legacy keys was found.
- The main compatibility pressure is cell shape and field-name fallback, not many competing domain-definition schemas.

## Naming Recommendations

### Context Resolution

- `resolveEvaluationAlternatives`
- `resolveEvaluationCriteria`
- `resolveLeafCriteriaFromContext`
- `resolveAlternativesAndLeafCriteria`

### Payload Resolution

- `resolveMatrixPayload`
- `resolveMatrixCell`
- `buildNextMatrixPayload`
- `buildEmptyEvaluationValue`
- `resolvePairwisePayload`
- `resolvePairwiseCell`
- `buildPairwiseGridRows`
- `buildPairwiseComparisonsPayload`

### Validation

- `validateMatrixValue`
- `validateMatrixPayload`
- `buildValidationErrorMap`
- `validateParameterValue`
- `validateExpressionDomainValue`
- `resolveRequiredValuePolicyFromMode`

### Display and Formatting

- `formatCollectiveDisplayValue`
- `formatEvaluationValue`
- `buildExpressionDomainFallbackMessage`

### Concrete Renames Worth Considering

- `Frontend/src/features/decisionPlugins/expressionDomains/expressionDomainDraftFields.js`
  - This rename is already complete and should stay as-is.

- `normalizeCell` in `AlternativeCriteriaMatrixView.jsx`
  - Prefer `resolveMatrixCell`.

- `buildCell` in `PairwiseAlternativesGrid.jsx`
  - Prefer `buildEmptyPairwiseCell`.

- `normalizeComparisonCell` in `PairwiseAlternativesGrid.jsx`
  - Prefer `resolvePairwiseCell`.

- `buildRowsFromComparisons` in `PairwiseAlternativesGrid.jsx`
  - Prefer `buildPairwiseGridRows`.

- `buildComparisonsFromRows` in `PairwiseAlternativesGrid.jsx`
  - Prefer `buildPairwiseComparisonsPayload`.

- Generic `buildGetPayload` exports in structure folders
  - Acceptable because the file names provide context, but if these functions become shared or imported more broadly, prefer structure-specific names.

## Phase 4 Design Audit: Pairwise Reciprocity

### Current Pairwise Contract

Input context:

- Frontend pairwise rendering reads `evaluationContext.alternatives` and `evaluationContext.leafCriteria`.
- Each criterion is treated as owning one expression domain through `criterion.expressionDomain`.
- Backend pairwise read payload also treats the criterion expression domain as the expected domain for every off-diagonal cell in that criterion.

Payload shape:

```json
{
  "criterionId": {
    "alternativeA": {
      "alternativeB": {
        "value": 0.7,
        "expressionDomain": {
          "typeKey": "numericContinuous",
          "definition": { "min": 0, "max": 1 }
        }
      }
    }
  }
}
```

Actual backend read-model behavior:

- `alternativePairwiseByCriterion.getPayload.js` emits all off-diagonal directed cells.
- The diagonal is not stored in payload.
- Every emitted cell is normalized to `{ value, expressionDomain: expectedCriterionExpressionDomain }`.
- Stored per-cell domain metadata is not trusted on read; the criterion domain is reapplied.

Actual frontend grid behavior:

- `PairwiseAlternativesGrid.jsx` injects the diagonal locally as `{ value: "Neutral", expressionDomain: null }`.
- The diagonal is displayed as non-editable `Neutral`.
- Non-diagonal cells are normalized on read:
  - primitive value -> `{ value: primitive }`
  - empty or missing -> `{ value: "", expressionDomain: null }`
  - object -> kept as-is
- Any edit writes the payload back as plain object cells, so primitive-cell compatibility is read-only legacy handling.

Current edit behavior:

- The edited field is detected by comparing `getCellNumericValue(newRow[field])` against `getCellNumericValue(oldRow[field])`.
- Numeric parsing is always `Number(...)`.
- If the parsed value is `null`, out of range, or step-misaligned, the edited cell and its reciprocal cell are both cleared to `""`.
- If the parsed value is valid, the grid updates both `A -> B` and `B -> A`.
- The grid never calls the expression-domain plugin `EvaluationInput`; editing is a plain DataGrid numeric flow.

Current inverse calculation:

- The grid resolves the source and target ranges from `cell.domain || cell.expressionDomain`.
- It reads only `domain.range.min`, `domain.range.max`, and `domain.range.step`.
- If that lookup does not produce a valid range, it silently falls back to `{ min: 0, max: 1, step: null }`.
- Reciprocity is then computed by range reflection:
  - `normalized = (value - min) / (max - min)`
  - `inverseNormalized = 1 - normalized`
  - `inverse = targetMin + inverseNormalized * (targetMax - targetMin)`
- The inverse is rounded to two decimals and then snapped to the target step if a target step exists.

Current collective-value display:

- Collective cells are rendered as a chip next to the user value.
- The display priority is `localizedLabel`, then `localizedValue`, then `value`.
- The diagonal never shows a collective chip.

Current backend normalization and validation:

- `alternativePairwiseByCriterion.payload.js` rejects old wrapper shapes such as `comparisonsByCriterion`, `evaluations`, `rows`, `matrix`, `direct`, and `pairwiseAlternatives`.
- Unknown criterion keys, row keys, diagonal keys, and unknown column keys are rejected.
- Missing off-diagonal cells are materialized as empty cells with the expected criterion expression domain.
- Submitted cells must be objects.
- Non-empty submitted values are validated against the expected criterion expression domain, not against any per-cell domain metadata.
- There is no reciprocal consistency check between `A -> B` and `B -> A`.
- There is no backend inverse regeneration.

Concrete examples of current behavior:

- Current expression-domain definitions use `expressionDomain.definition`, not `domain.range`.
- For a normal current numeric domain `{ typeKey: "numericContinuous", definition: { min: 0, max: 10 } }`, the frontend grid does not read `min` and `max`.
- Because `domain.range` is absent, the grid falls back to `0..1`.
- Result: entering `2` is treated as invalid and clears both directions instead of generating `8`.
- Result: a stored value `2` still displays as `2`, but editing that cell uses `0..1` validation.
- For a normal current discrete domain `{ min: 0, max: 10, step: 2 }`, the grid also ignores `definition.step`.
- Result: step enforcement does not happen unless legacy `domain.range.step` is present in the cell object.
- If a legacy cell shape does include `domain.range = { min: 0, max: 10 }`, then entering `2` generates inverse `8`.
- If the source legacy range is `0..10 step 2` and the target legacy range is `0..10 step 3`, then entering `2` stores `2` in `A -> B` and `9` in `B -> A` because the target inverse is snapped independently.
- If source and target cells expose different legacy ranges, the reciprocal is computed across those different ranges even though the criterion is supposed to own a single expression domain.

### Hidden Assumptions and Compatibility Leaks

| Issue | What the current code does | Classification | Audit note |
| --- | --- | --- | --- |
| `cell.domain` before `cell.expressionDomain` | The grid prefers the legacy field if both are present. | Legacy compatibility | Current backend read payload emits `expressionDomain`, not `domain`. |
| `domain.range` instead of `expressionDomain.definition` | The grid ignores the current expression-domain schema. | Likely bug | Normal numeric domains use `definition.min`, `definition.max`, and discrete domains use `definition.step`. |
| Primitive cell vs object cell | The grid accepts primitive cells on read, but any edit rewrites them as object cells. | Legacy compatibility | This is a boundary concern, not view logic. |
| Silent `0..1` fallback | Missing or invalid range silently becomes `0..1`. | Likely bug | This masks unsupported domains and misconfigured payloads. |
| `Number(...)` conversion everywhere | Every editable pairwise value is coerced to a number. | Architectural assumption | The current grid is numeric-only regardless of expression-domain type. |
| Numeric-only reciprocity | The grid assumes inverse math exists for every editable pairwise value. | Design decision still required | The expression-domain registry does not currently declare pairwise support. |
| Per-cell source and target ranges | Reciprocity can be computed from different source and target ranges. | Likely bug | The criterion should own one domain for both directions. |
| Criterion domain reapplied on backend read/write | Backend normalization uses the expected criterion expression domain for every cell. | Valid current behavior | This is the correct boundary owner for domain metadata. |
| Stored values vs generated values | The client generates and stores both directions; the backend trusts them. | Architectural assumption | No server-side reciprocity contract exists yet. |
| Frontend-only reciprocity enforcement | Reciprocal updates happen only in the grid. | Likely bug | Direct API writes can bypass reciprocity. |
| Missing backend reciprocity validation | `A -> B` and `B -> A` are validated independently only. | Likely bug | Pairwise consistency is not enforced at the persistence boundary. |
| Invalid edit clears both cells | A bad edit deletes both directions instead of rejecting the edit. | Likely bug | This is destructive and silent. |
| Duplicated empty-cell handling | Frontend and backend each rebuild empty pairwise cells separately. | Valid current behavior | The duplication is acceptable, but the frontend version is mixed into rendering code. |

### Which Domains Should Support Pairwise

Option A: keep pairwise explicitly numeric-only inside the evaluation structure.

- This is the smallest short-term restriction.
- It keeps reciprocity logic out of the expression-domain registry.
- It also hardcodes domain-family knowledge into the pairwise structure and makes new domain opt-in clumsy.
- It does not solve the real problem that discrete numeric support depends on the actual domain definition, not just on being numeric.

Option B: add an optional pairwise capability to expression-domain plugins.

- This is the simplest correct long-term design.
- The pairwise structure can remain generic while still rejecting unsupported domains explicitly.
- Opt-in stays self-contained inside each expression-domain type.
- `validateEvaluation` remains the general value validator for all ordinary evaluation values.
- `pairwiseComparison` owns only pairwise support checks and inverse calculation.
- Numeric continuous and numeric discrete domains are the initial supported pairwise domains.
- Linguistic domains can simply omit the capability and fail explicitly.

Option C: introduce a separate pairwise algebra plugin layer.

- This is unnecessary for the current codebase.
- It duplicates the role already played by expression-domain plugins.
- It adds another registry and another abstraction boundary without reducing complexity in `PairwiseAlternativesGrid`.

Recommendation: choose Option B.

Recommended capability shape:

```js
pairwiseComparison: {
  assertSupported({ expressionDomain }),
  getInverseValue({ value, expressionDomain })
}
```

Why this is the simplest correct design:

- `validateEvaluation` already exists and should remain the only general value validator.
- `pairwiseComparison` adds only the missing pairwise-specific behavior instead of duplicating general validation.
- The diagonal is a UI concept today, so `getNeutralValue` is not required to preserve the current payload shape.
- `assertSupported` gives discrete numeric domains a place to reject definitions that are not closed under reciprocity.
- `getInverseValue` keeps domain-specific algebra inside the owning plugin.
- Unsupported domains fail by capability absence or by `assertSupported` throwing an explicit error.
- No separate pairwise registry is required.

How a new domain type opts in:

- Frontend type entry adds `pairwiseComparison`.
- Backend type entry adds the equivalent `pairwiseComparison`.
- If that capability is absent, the pairwise evaluation structure rejects that criterion expression domain explicitly.

Frontend and backend capability needs:

- Frontend needs it to validate edits, calculate the reciprocal, and decide whether the grid is editable for that criterion.
- Backend needs the equivalent capability to verify reciprocal consistency on save and submit.
- The capability should be implemented separately in frontend and backend registries just like `validateEvaluation` is today.

How this avoids domain branches inside `PairwiseAlternativesGrid`:

- The grid delegates reciprocity math to one local pure-logic module.
- That local module resolves the active expression-domain type entry and calls `pairwiseComparison`.
- The grid remains responsible only for DataGrid behavior and rendering.

### Canonical Reciprocity Contract

- The diagonal should remain a UI-only concept and stay out of the payload.
- Both `A -> B` and `B -> A` should remain stored for now to preserve the current payload shape.
- Changing the payload shape to store only one direction is not justified in this phase.
- The criterion expression domain should be the only canonical domain for both directions.
- Source and inverse cells should never use different expression domains.
- For `numericContinuous`, the entered value should be validated with `validateEvaluation`, the inverse should be calculated as `min + max - value`, and the generated inverse should then be validated with `validateEvaluation`.
- For `numericDiscrete`, the same inverse formula should be used: `min + max - value`.
- `numericDiscrete` pairwise support should be allowed only when `(max - min) / step` is an integer within a reasonable floating-point tolerance, so the discrete domain is closed under reflection.
- Unsupported discrete definitions should be rejected explicitly by `pairwiseComparison.assertSupported`.
- Approximate inverse snapping should not be used for canonical pairwise reciprocity.
- This restriction belongs only to pairwise support; a `numericDiscrete` domain may still be valid for ordinary non-pairwise evaluations.
- Backend save logic should verify reciprocal consistency.
- Backend save logic should not silently regenerate the inverse from the client payload.
- Backend should compute the expected inverse and reject inconsistent pairs with an explicit validation error.
- Unsupported domains should fail explicitly before editing on the frontend and during normalization on the backend.
- Invalid frontend edits should be rejected and the previous pair should be retained.
- Invalid frontend edits should not clear both directions.
- Draft mode should allow both directions empty.
- Draft mode should reject one-sided pairs where one direction is empty and the other is filled.
- Submit mode should continue requiring complete off-diagonal coverage, but reciprocal consistency should be checked pairwise rather than trusting the client.

Implications for discrete numeric domains:

- Reciprocal support should be exact, not snap-based.
- Pairwise support should require exact closure under the `min + max - value` reflection rule.
- If a discrete domain definition cannot produce exact reflected inverses inside its own step system, that definition should be rejected for pairwise use by `pairwiseComparison.assertSupported`, not by the generic creation validator.
- This is another reason Option B is preferable to a structure-owned numeric shortcut.

### Readability-Focused Target Structure

Recommended frontend structure:

```text
alternativePairwiseByCriterion/
  AlternativePairwiseByCriterionView.jsx
  pairwiseReciprocity.js
  components/
    PairwiseAlternativesGrid.jsx
```

Recommended local file name:

- Prefer `pairwiseReciprocity.js`.
- `pairwiseComparisonValues.js` is less precise.
- `alternativePairwisePayload.js` sounds too backend-oriented for the frontend logic that also handles edit-time reciprocity.

What should remain in `PairwiseAlternativesGrid.jsx`:

- DataGrid column configuration.
- Cell rendering, including the collective-value chip.
- Click-to-edit behavior.
- Read-only and diagonal edit guards.

What should move to `pairwiseReciprocity.js`:

- Pairwise cell resolution from payload.
- Diagonal injection for grid rows.
- Pairwise row-to-payload conversion.
- Edited-field resolution.
- Pairwise edit application.
- Reciprocal validation and inverse calculation orchestration through the expression-domain registry.

What should move to the expression-domain plugin contract:

- Domain-level pairwise support checks.
- Domain-specific inverse calculation.

What should be enforced by backend:

- Expected criterion expression-domain ownership.
- General value validation through `validateEvaluation`.
- Reciprocal consistency between both stored directions.
- Explicit rejection of unsupported pairwise domains.

What should remain structure-specific:

- Payload shape keyed by criterion, row alternative, and column alternative.
- Omitted diagonal storage.
- Storing both directed cells.
- Pairwise-specific completeness rules.

### Incremental Phase 4 Roadmap

Phase 4A:

- Extend frontend expression-domain registry entry validation to allow optional `pairwiseComparison`.
- Extend backend expression-domain registry validation to allow optional `pairwiseComparison`.
- Implement `pairwiseComparison` for `numericContinuous`.
- Implement `pairwiseComparison` for `numericDiscrete` with exact closure validation.
- Leave linguistic domains without the capability.
- Add focused pure frontend and backend tests.
- Do not change `PairwiseAlternativesGrid.jsx` yet.
- Do not change backend pairwise payload normalization yet.

Phase 4B:

- Add at most one clearly named local file: `pairwiseReciprocity.js`.
- Centralize primitive/object cell compatibility there.
- Use `cell.expressionDomain` as canonical and `cell.domain` only as legacy fallback.
- Use the criterion expression domain as the canonical domain for both directions.
- Remove `domain.range` access.
- Remove the silent `0..1` fallback.
- Delegate validation and inverse calculation to the expression-domain pairwise capability.
- Retain previous values when an edit is invalid.
- Do not clear both cells on invalid input.
- Simplify `PairwiseAlternativesGrid.jsx` so it focuses on DataGrid rendering and interaction.
- Preserve the current payload shape.

Phase 4C:

- Preserve both directed cells in the payload.
- Keep the diagonal omitted.
- Validate each non-empty value with `validateEvaluation`.
- Use the expected criterion expression domain.
- Compute the expected inverse through the backend pairwise capability.
- Reject inconsistent reciprocal pairs.
- Reject one-sided draft pairs.
- Require complete reciprocal pairs on submit.
- Do not silently rewrite client values.

## Incremental Roadmap

### Phase 1: Frontend Evaluation Structure Readability Cleanup

Status: completed.

- `AlternativeCriteriaMatrixView.jsx` cleanup is no longer the next recommended step.
- Keep this phase as completed background context only.

### Phase 2: Backend Evaluation Payload Readability Cleanup

Focus on:

- `Backend/modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/**`
- `Backend/modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/**`

Status: completed.

- Backend matrix/pairwise shared payload boundary cleanup is no longer pending roadmap work.
- Keep this phase as completed background context only.

### Phase 3: Shared Folder Cleanup Inside `decisionPlugins`

Status: completed.

- The old `expressionDomains/helpers.js` rename is complete as `expressionDomainDraftFields.js`.
- Do not continue treating that rename as pending work.

### Phase 4: Pairwise Structures

Focus on:

- `Frontend/.../alternativePairwiseByCriterion/**`
- `Backend/.../alternativePairwiseByCriterion/**`

Goals:

- Follow the Phase 4 design audit above.
- Separate reciprocal/inverse logic from grid rendering.
- Move pairwise support decisions into expression-domain plugins through an explicit optional capability.
- Add backend reciprocal consistency validation without changing the stored payload shape.

Constraint:

- Do not add generic helper buckets or a second pairwise registry.
- Do not silently fall back to `0..1` or silently regenerate inverse values on the backend.

### Phase 5: Model Parameter Plugin Cleanup

Goals:

- Preserve the current registry/host architecture.
- Improve names and local organization where readability actually suffers.

Priority candidates:

- `Backend/modules/decisionPlugins/modelParameters/shared/validateCriterionMapParameter.js`
- `Backend/modules/decisionPlugins/modelParameters/resolveModelParameterValues.js`

### Phase 6: Expression-Domain Type Cleanup

Goals:

- Keep each type self-contained.
- Extract local validation or draft-state helpers only where the file is clearly too dense.

Priority candidate:

- `Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticFuzzy/LinguisticFuzzyCreationForm.jsx`

## Recommended First Implementation Prompt

```md
Work only in:
- Frontend/src/features/decisionPlugins/expressionDomains/**
- Backend/modules/decisionPlugins/expressionDomains/**

Goal:
- Implement Phase 4A: expression-domain pairwise capability.

Constraints:
- Do not touch `Frontend/src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/**`.
- Do not touch `Backend/modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/**`.
- Do not add a new registry or generic helper bucket.
- Preserve existing registry behavior.

Required work:
- Extend frontend expression-domain registry entry validation to allow optional `pairwiseComparison`.
- Extend backend expression-domain registry validation to allow optional `pairwiseComparison`.
- Implement `pairwiseComparison` for `numericContinuous`.
- Implement `pairwiseComparison` for `numericDiscrete`, including exact closure validation in `assertSupported`.
- Leave linguistic domains without the capability.
- Add focused pure tests on both frontend and backend sides.

Checks:
- Run git diff --check
- Run the focused tests you added
```

## Recommended Order of Work

1. Phase 4A: expression-domain pairwise capability
2. Phase 4B: frontend pairwise cleanup
3. Phase 4C: backend reciprocity enforcement
4. Model-parameter readability cleanup
5. Linguistic fuzzy draft-state cleanup

## Summary

The highest-value near-term cleanup is Phase 4A: add explicit pairwise capability to the expression-domain plugins, then use that capability to simplify the frontend pairwise grid and enforce reciprocity on the backend. Most registries and small validators are already readable enough and should be left alone outside that targeted work.

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
- `Frontend/src/features/decisionPlugins/expressionDomains/helpers.js` is a vague shared file name even though the contents are fairly specific.
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

- `Frontend/src/features/decisionPlugins/expressionDomains/helpers.js`
  - The contents are useful, but the name is too vague.
  - It currently holds draft-name and label-key behavior shared by multiple domain types.
  - Best cleanup class: rename unclear file.
  - Better names: `expressionDomainDraftFields.js`, `expressionDomainLabelDrafts.js`, or `expressionDomainDraftLabels.js`.

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

- `Frontend/src/features/decisionPlugins/expressionDomains/helpers.js`
  - Prefer `expressionDomainDraftLabels.js` or `expressionDomainDraftFields.js`.

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

## Incremental Roadmap

### Phase 1: Frontend Evaluation Structure Readability Cleanup

Start with `Frontend/src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/AlternativeCriteriaMatrixView.jsx`.

Goals:

- Keep behavior unchanged.
- Keep file count low.
- Move cell-shape and domain-field fallback out of the render path.
- Make the component read in this order: context resolution, payload resolution, validation, update handlers, grid columns, render.

Recommended scope:

- Extract only one nearby file if needed, ideally `resolveMatrixCell.js`.
- Keep validation helpers local unless they still clutter the component after cell resolution is extracted.
- Do not touch pairwise in this phase.

Stop condition:

- The component reads as a UI file, not a mixed UI-plus-normalization module.

### Phase 2: Backend Evaluation Payload Readability Cleanup

Focus on:

- `Backend/modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/**`
- `Backend/modules/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/**`

Goals:

- Deduplicate only the obvious boundary logic shared by both structures.
- Keep API behavior unchanged.
- Avoid a generic evaluation helper bucket.

Recommended scope:

- Consider one small shared boundary helper for save-mode policy and one for expression-domain cell validation only if both files become clearer.
- Keep structure-specific loops local to each structure.

### Phase 3: Shared Folder Cleanup Inside `decisionPlugins`

Goals:

- Rename vague shared files.
- Move shared logic only when it is used by multiple plugins.
- Move one-plugin-only logic back into the owning plugin folder.

Priority candidates:

- `Frontend/src/features/decisionPlugins/expressionDomains/helpers.js`

### Phase 4: Pairwise Structures

Focus on:

- `Frontend/.../alternativePairwiseByCriterion/**`
- `Backend/.../alternativePairwiseByCriterion/**`

Goals:

- Separate reciprocal/inverse logic from grid rendering only after the intended pairwise behavior is explicit.
- Keep pairwise-specific domain assumptions local.

Constraint:

- Do not force flexible expression-domain rendering here until inverse behavior is designed.

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
- Frontend/src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/**

Goal:
- Improve readability of AlternativeCriteriaMatrix without changing behavior.

Constraints:
- Do not touch backend code.
- Do not touch pairwise code.
- Do not create many files.
- Keep payload shape unchanged.
- Keep validation behavior unchanged.

Required cleanup:
- Move cell compatibility logic out of the render path into one clearly named plugin-local helper such as resolveMatrixCell.
- Reorder AlternativeCriteriaMatrixView.jsx so it reads in this order:
  1. context resolution
  2. payload resolution
  3. validation
  4. update handlers
  5. grid column definition
  6. render
- Keep validation helpers local unless one tiny extraction is clearly better.
- Add only minimal section comments if they improve scanability.

Checks:
- Run git diff --check
- No tests required unless code behavior changes
```

## Recommended Order of Work

1. Alternative criteria matrix frontend readability
2. Backend matrix/pairwise boundary cleanup
3. Shared naming cleanup
4. Pairwise-specific refactor after inverse behavior review
5. Model-parameter readability cleanup
6. Linguistic fuzzy draft-state cleanup

## Summary

The highest-value near-term cleanup is not a broad architecture change. It is a small boundary cleanup in `AlternativeCriteriaMatrixView.jsx`, followed by a narrow backend pass over matrix and pairwise payload normalization. Most registries and small validators are already readable enough and should be left alone.

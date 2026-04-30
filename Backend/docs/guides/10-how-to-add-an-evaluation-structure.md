# How to Add an Evaluation Structure

## 1. Overview

An `evaluationStructure` defines how expert alternative evaluations are captured and persisted before model execution.

It controls:

- initial evaluation document generation,
- draft payload read/save behavior,
- submit validation and completion behavior,
- persistence shape in `Evaluation` documents.

It does not control:

- consensus-cycle semantics (`isConsensus`),
- model execution payload family (`inputKind`),
- normalized model output family (`outputKind`),
- model-specific research metrics.

## 2. When to add a new evaluation structure

Add a new `evaluationStructure` only when capture/persistence behavior is different.

Do not add a new structure just because:

- a model returns extra research fields,
- a model has consensus enabled,
- a model has a new ranking formula.

For those cases, use `outputKind`, result adapters, and `rawOutput` persistence.

## 3. Current structure architecture (vertical slices)

Alternative evaluation module:

- `Backend/modules/issues/alternativeEvaluations/index.js`
- `alternativeEvaluation.constants.js`
- `alternativeEvaluation.registry.js`
- `alternativeEvaluation.service.js`
- `alternativeEvaluation.shared.js`
- structure slices:
  - `direct/`
  - `pairwiseAlternatives/`

Each structure registers:

- `key`
- `read`
- `saveDraft`
- `submit`
- `buildInitial`
- `buildResolutionInput`

## 4. Current structures

- `direct`
- `pairwiseAlternatives`

`resolveEvaluationStructure(...)` validates and resolves persisted values.

## 5. Checklist before adding a structure

- Is the expert-input capture shape truly new?
- Does the new shape require different `Evaluation` row patterns?
- Does draft/read/submit symmetry require new persistence logic?
- Do submit-time validation rules differ from existing structures?
- Do issue creation and expert-addition initial docs require a new builder?

If any answer is "no", prefer reusing an existing structure.

## 6. Backend implementation steps

1. Add constant key in `alternativeEvaluation.constants.js`.
2. Add structure folder under `alternativeEvaluations/<newStructure>/`.
3. Implement structure operations (`read`, `saveDraft`, `submit`) and validation.
4. Implement initial docs builder (`buildInitial`).
5. Expose structure manifest in `<newStructure>/index.js`.
6. Register manifest in `alternativeEvaluation.registry.js`.
7. Ensure `buildInitialAlternativeEvaluationDocs(...)` can dispatch to the new structure.
8. Update `issue.evaluationStructure.js` supported values.

## 7. Integration touchpoints

Verify these areas:

- issue creation and expert addition initial-evaluation generation,
- alternative evaluation controllers/routes (service contract remains unchanged),
- scenario payload builders (if structure affects matrix construction),
- resolution dispatch/adapters (if structure changes execution input behavior),
- admin/finished issue readers when they depend on structure-specific persistence.

## 8. Frontend implications

Frontend alternative-evaluation registry should map the new `evaluationStructure` to a UI renderer and serializer.

Keep API contract unchanged:

- backend still returns standard envelope (`success`, `message`, `data`, `error`),
- structure-specific payload lives inside `data` fields expected by existing endpoints.

## 9. Relationship to model contracts

`evaluationStructure` is one axis only.

A model still independently declares:

- `inputKind`
- `outputKind`
- `isConsensus`

Extra model-specific fields should be preserved in:

- `Consensus.details.modelExecution.rawOutput`

Do not encode research metrics into structure definitions.

## 10. Common mistakes

- Creating a structure to represent a model algorithm instead of capture behavior.
- Coupling structure selection with consensus assumptions.
- Moving model-output concerns into structure modules.
- Adding structure-specific route contracts instead of reusing service-level dispatch.

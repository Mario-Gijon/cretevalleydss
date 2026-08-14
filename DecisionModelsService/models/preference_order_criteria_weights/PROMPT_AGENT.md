# Implement Preference Order Criteria Weights integration — Agent prompt

You are a repository-aware coding agent working inside CreteValleyDSS.

Implement the non-mathematical DecisionModelsService integration for the generated model:

```text
DecisionModelsService/models/preference_order_criteria_weights/
```

## Critical scope rule

Do NOT implement or invent the mathematical/model algorithm in `run.py`.

`run.py` must remain a hard-stop unless the developer has provided a separately verified model-specific algorithm specification and explicitly requested algorithm implementation in a different task.

This prompt is for integration only.

Do not infer formulas from the model name.

## Read first

Read the complete generated package:

```text
DecisionModelsService/models/preference_order_criteria_weights/
```

Especially:

```text
definition.py
executor.py
run.py
examples.py
IMPLEMENTATION_GUIDE.md
```

Also inspect the Evaluation Structure referenced by:

```text
criteriaPreferenceOrder
```

when its payload contract is relevant.

Inspect Parameter Structure implementations referenced by `definition.py` when model parameters require them.

The current repository state is authoritative.

## Developer requirements

### Model input semantics

Describe what this model needs from context/evaluations/model parameters.

[MODEL INPUT REQUIREMENTS]

### Evaluation payload semantics

Describe how this model interprets the Evaluation Structure payload.

[EVALUATION PAYLOAD SEMANTICS]

### Expected public output

Describe the complete `data` object expected from successful execution.

[EXPECTED PUBLIC OUTPUT]

### Additional integration requirements

[ADDITIONAL REQUIREMENTS]

### Actual runtime input — optional

[ACTUAL RUNTIME INPUT]

If supplied, treat the runtime object shape as authoritative.

## Generated metadata

Preserve the capabilities already declared in `definition.py`.

Do not silently change:

- model kind;
- evaluation structure key;
- consensus flags;
- criteria/expert-weight flags;
- criterion-type flag;
- supported Expression Domains;
- model parameters.

If metadata is genuinely incorrect, report the mismatch instead of compensating for it in runtime code.

## Request contract

The endpoint receives:

```python
GenericModelExecutionRequest
```

with:

```python
request.modelParameters
request.evaluations
request.context
```

Use the existing Evaluation Structure/Parameter Structure contracts to understand model-specific nested values.

Do not invent an evaluation payload shape.

## `executor.py`

Implement model-specific integration here.

Responsibilities may include:

- validating required context/evaluation relationships;
- resolving stable ID order;
- extracting criterion metadata;
- interpreting declared model parameters;
- reusing existing DMS shared normalization helpers when correct;
- preparing normalized algorithm input;
- calling the `run.py` boundary when the algorithm is later available;
- formatting model-specific public output;
- returning `success_response(...)`;
- converting runtime failures to the existing `error_response(...)` convention.

Do not move the core algorithm into `executor.py`.

If integration cannot meaningfully call `run.py` until the algorithm exists, keep the model safely under development rather than faking a result.

## `run.py`

Do not implement it in this task.

Do not replace `NotImplementedError` with placeholder scores, random values, identity rankings, averages or another model's algorithm.

Do not mark the model ready while `run.py` is still unimplemented.

## Expression Domains

Respect `definition.py` supported Expression Domains.

If executor-level normalization must interpret a criterion Expression Domain, use the canonical domain supplied in `request.context.criteria`.

Reuse existing DMS shared helpers only when their semantics match exactly.

Do not lose information through an inappropriate conversion.

## Existing model reference

You may inspect:

```text
DecisionModelsService/models/topsis/definition.py
DecisionModelsService/models/topsis/executor.py
```

for integration conventions.

Do NOT use TOPSIS as the mathematical implementation of this model.

## File organization

Keep the package simple.

Create additional files only when clearly useful for integration.

Pure algorithm helpers belong with the later verified algorithm implementation, not in ad-hoc executor utilities.

Do not create generic frameworks or abstractions for one model.

## Examples

Update `examples.py` only to document request/output shapes that are known.

Do not invent a structure-specific evaluation payload.

If the real payload shape is not yet known, keep a minimal honest example.

## Lifecycle

Keep:

```python
implementation_status="scaffold"
```

because `run.py` remains unimplemented in this integration task.

Do not change it to `"ready"`.

## Tests

Add focused tests for integration behavior that can be verified without inventing the algorithm.

Examples:

- required input extraction;
- invalid/missing context relationships;
- parameter interpretation;
- Expression Domain normalization when specified;
- output mapping helpers when an explicit sample run result is supplied;
- consistent error handling.

Do not add tests that encode guessed mathematical results.

Run focused DecisionModelsService tests and:

```text
git diff --check
```

Do not install dependencies.

## Final report

Modify the repository directly.

Report:

1. Files created.
2. Files modified.
3. Request normalization implemented.
4. Evaluation/model-parameter contracts consumed.
5. Public output mapping implemented.
6. Shared DMS helpers reused.
7. Confirmation that `run.py` algorithm was NOT implemented.
8. Confirmation that `implementation_status` remains `"scaffold"`.
9. Tests executed and results.
10. `git diff --check` result.
11. What verified algorithm specification is still required.

Do not perform unrelated changes.

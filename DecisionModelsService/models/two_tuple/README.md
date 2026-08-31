# 2-Tuple Results Analysis — Delivery 0

Place these files in:

- `run.py` -> `DecisionModelsService/models/two_tuple/run.py`
- `executor.py` -> `DecisionModelsService/models/two_tuple/executor.py`

## What this delivery changes

- Adds `collective_beta_matrix` to the solver result.
- Adds resolved mathematical evidence for both aggregation stages.
- Adds compact deterministic aggregation traces for:
  - arithmetic mean,
  - weighted average,
  - L2TOWA.
- Keeps L2TOWA weights explicitly positional after descending beta ordering.
- Adds stable alternative, criterion and expert metadata to `rawOutput`.
- Exposes expert/criterion weights at top level only when the executed method is
  `weighted_average`.
- Adds the generic expert-collective MDS projection to `plotsGraphic`.
- Handles projection edge states:
  - `insufficient_points_for_projection`,
  - `insufficient_variation_for_projection`,
  - `projection_failed`.
- Does not compute Results Analysis facts, interpretations or visualizations in
  `run.py` / `executor.py`; those remain the responsibility of the forthcoming
  `models/two_tuple/analysis/` package.

## Mathematical basis

The existing aggregation implementations remain the source of truth for the
actual model result. The new traces are derived from the same beta representation
and are checked against the executed aggregate result so a divergence fails
instead of silently producing inconsistent evidence.

The model still uses the existing Chapter 2 semantics already implemented in the
repository:

- 2-tuple arithmetic mean,
- 2-tuple weighted average,
- L2TOWA with positional OWA weights,
- linguistic quantifier based OWA weight generation.

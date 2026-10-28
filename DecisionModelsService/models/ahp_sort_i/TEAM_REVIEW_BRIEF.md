# AHPSort I — review brief for Álvaro

## Purpose

AHPSort I assigns alternatives to ordered, predefined categories by comparing
them with either limiting profiles between adjacent categories or typical
central profiles. It is a sorting method; this DSS result contract does not
produce a global ranking.

## Scientific basis

The implementation follows the eight-step AHPSort I description and weighted
priority equations of Ishizaka, Pearman, and Nemery (2012),
[DOI 10.1080/00207543.2012.657966](https://doi.org/10.1080/00207543.2012.657966).
Each local Saaty matrix is solved with the AHP principal eigenvector. Local
priorities are aggregated by normalized criterion weights. Limiting mode
assigns against ordered boundaries; central mode selects the nearest center
using absolute aggregate-priority distances and exposes the article's
optimistic/pessimistic tie policy.

The paper's Supplier J / Flexibility input and Table 5 local priority disagree:
Appendix 1 specifies 1/9, which yields 0.100; Table 5 prints 0.125. Table 5
also contains documented global-total disagreements. These inputs and
discrepancies remain separate in [REFERENCE_DATA.md](REFERENCE_DATA.md); the
algorithm is not adjusted to force agreement with the printed totals. All 12
published accepted/rejected outcomes remain reproduced.

## Implemented path and evidence

The `ahpSortAlternativeProfiles` evaluation structure stores ID-keyed Saaty
judgments. The DMS model adapter validates a single expert, resolves category,
profile, criterion, and alternative IDs, runs limiting or central AHPSort I,
and returns assignments plus diagnostics through `sorting@1`. Backend
persists the normalized stage result; Finished Issue reads that evidence.
Scenario replay uses the saved evaluation and parameters.

Evidence is provided by the directed DMS mathematical and executor tests, the
Backend–DMS contract integration, and Playwright E2E for limiting and central
execution. The central E2E also replays a persisted central case under the
pessimistic tie policy. E2E is gated to the isolated database and service
configuration only.

## Deliberate limits

- Exactly one expert may provide AHPSort I alternative/profile comparisons;
  the platform rejects multi-expert input rather than inventing an aggregation
  rule. This does not disable the separate AHP/MCC criteria-weighting process.
- CR remains diagnostic and does not automatically block assignment.
- Local matrices are limited by the existing Saaty RI table to 15 entities.
- The central-profile equation is ambiguous as printed; the implementation
  follows the article's prose and Figure 3 using nearest-center absolute
  distances. Strict profile ordering and numerical tie tolerances are explicit
  DSS policies, not claims about author-defined tolerances.
- AHPSort I remains scaffold and unauthorized outside the isolated E2E stack.
  This review is not approval for development or production activation.

## Evidence run for this review

- DMS AHPSort I core, executor, and activation readiness: **131 passed**.
- Backend creation, participant edit, and execution guards: **66 passed**.
- Backend → DMS → `sorting@1` integration: **3 passed**.
- AHPSort I Playwright E2E (limiting and central, including central pessimistic
  scenario replay): **2 passed**.
- AHP → MCC → TOPSIS-Sort Playwright regression: **1 passed**.
- Frontend ESLint, Python `compileall`, and `git diff --check`: passed.

The Python project does not define or provide a Python lint command in its
environment; syntax compilation was checked with `compileall`. No full
Frontend/Backend suite or production stack was run for this documentation and
coverage audit.

## Possible research extensions (not implemented)

- Define and validate a group-judgment aggregation method before adding
  multi-expert alternative/profile evaluations.
- Agree a supported RI policy before raising the local matrix-size limit.
- Specify a separate cross-alternative ranking interpretation if researchers
  need one; it must not be inferred from category assignment output.
- Review AHPSort II as a separate method and Decision Plugin.

## Items for research review

Please verify the reading of the 2012 central-profile Eq. 6, the distinction
between the source's reported ranking use and this product's sorting-only
contract, and whether single-expert-only input is acceptable for the intended
research workflow. The documented source conflicts are highlighted so the
team can review them without relying on rounded execution output.

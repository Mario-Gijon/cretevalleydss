# AHPSort I: scientific and implementation review

## Scope and source

This note records the AHPSort I implementation in Crete Valley DSS for
technical review. It is not a production approval and does not claim that the
platform implements AHPSort II, fuzzy AHPSort, group consensus, or a global
ranking interface.

Primary source: A. Ishizaka, C. Pearman, and P. Nemery, “AHPSort: an AHP based
method for sorting problems,” *International Journal of Production Research*,
2012, DOI [10.1080/00207543.2012.657966](https://doi.org/10.1080/00207543.2012.657966).
The authors’ [preprint PDF](https://pure.port.ac.uk/ws/files/169321/AHPSort_Final.pdf)
is used below with both its PDF page and journal page where useful. The
supplier case transcription and its numerical conflicts are documented in
[REFERENCE_DATA.md](REFERENCE_DATA.md).

## Method described by the authors

The paper frames AHPSort as assignment to pre-defined, ordered classes. Its
eight-step outline (preprint PDF pp. 6–8) defines criteria, alternatives,
ordered classes and profiles; derives criterion weights through AHP pairwise
comparisons; compares each alternative with profiles on each criterion; derives
local priorities; aggregates those priorities with criterion weights; and
assigns each alternative to a class using the resulting profile priorities.

### AHP comparisons and weighted priorities

For each comparison matrix, the paper states the principal-eigenvector problem
`A p = lambda p` (Eq. 2, preprint PDF p. 6). Criterion weights and local
alternative/profile priorities are normalized priorities from that method.
For alternative `k`, criterion `j`, and criterion weight `w_j`, the paper
aggregates local priorities as `P_k = sum_j(w_j p_kj)` (Eq. 3); profile
priorities use the analogous weighted sum (Eq. 4). The implementation uses
the existing AHP criteria-weight and local-matrix solver, and preserves its
unrounded priorities and per-matrix `lambdaMax`, CI, RI, and CR diagnostics.

In the limiting-profile case study, the authors compare each supplier with the
same limiting profile for every criterion (preprint PDF p. 14; journal p.
4776). Appendix 1 records the individual judgments (PDF pp. 24–25; journal
pp. 4783–4784). The two-entity reciprocal matrix has a closed-form principal
vector; the implementation retains this exact calculation for the binary
one-profile path. The general multi-profile path forms a full matrix from the
alternative and the ordered boundaries, using alternative/profile judgments
and profile/profile judgments for each criterion. That generalized profile
contract is a DSS implementation extension of the paper's profile-comparison
steps; it is not presented as a separate formula authored in the paper.

### Limiting profiles

The paper defines a limiting profile as the minimum performance needed to
belong to a class (preprint PDF p. 6) and assigns an alternative to the class
whose lower boundary is just below its aggregate priority (Eq. 5, PDF pp. 7–8).
The case study has two classes, so a score equal to the single boundary is
assigned to the upper class (PDF p. 14; journal p. 4776).

The DSS exposes categories from least to most preferred, while the paper's
diagrams and equations order them most to least preferred. The adapter maps
the DSS ordering to the core by category IDs. For the generalized multiple-
boundary path, exact or numerically indistinguishable equality is assigned to
the more-preferred adjacent class, consistent with the binary rule. The
strictly increasing profile check and its `1e-12` tolerance are DSS execution
integrity policies; they are not attributed to the authors.

### Central profiles and equal-distance rules

The paper defines a central profile as a typical example of a class. It
describes a boundary between adjacent central profiles and assignment to the
nearest central profile; in a tie, the optimistic view selects the more
preferred class and the pessimistic view selects the less preferred class
(preprint PDF pp. 7–8, Fig. 3 and Eq. 6). In the DSS, one central profile is
required per category, and profile priorities are recomputed within each
alternative's criterion-specific matrix before weighted aggregation. The
nearest center is chosen using absolute differences between the alternative's
and centers' aggregate priorities. Ties use an explicit `optimistic` or
`pessimistic` policy and a `1e-12` distance tolerance.

There is a source ambiguity in the printed Eq. 6: as transcribed in the
preprint, its signed-difference inequality in the displayed interval does not
match the prose and Fig. 3's nearest-center rule. The DSS follows the stated
nearest-center prose using absolute distances. This is a documented
interpretation, not a claim that the printed inequality explicitly contains
absolute values. The core also requires center priorities to be strictly
increasing in the configured category order; its error and tolerance are DSS
integrity policies.

### Consistency

The article describes consistency checking as part of AHP and reports a
criterion-weight inconsistency ratio of 0.05 in Table 4 (preprint PDF p. 12;
journal p. 4775). It does not define a new AHPSort-specific CR formula. The DSS
reuses the existing AHP consistency calculation and RI table. CR is preserved
as a diagnostic warning and does not automatically block classification;
this is the platform's review/decision workflow, not an AHPSort assignment
rule. The current RI table supports local matrices up to 15 entities. Larger
matrices are rejected rather than assigned an unsupported RI value.

## Crete Valley DSS contracts and flow

1. **Issue configuration:** the generic Create Issue flow stores ordered
   categories and `ahpSortProfiles` as separate model parameters. Profiles
   reference category IDs; limiting profiles identify adjacent category IDs,
   and central profiles identify one category ID each. Numeric domains remain
   generic Issue metadata and do not convert Saaty judgments.
2. **Criterion weights:** the issue weight service provides normalized
   criterion weights keyed by criterion ID. Neither the adapter nor core
   infers weights from array position.
3. **Expert evaluation:** the public evaluation structure
   `ahpSortAlternativeProfiles` stores alternative/profile and profile/profile
   judgments as Saaty ratios, keyed by alternative, criterion, and profile
   IDs. The reciprocal matrix is constructed in the DMS.
4. **Validation and persistence:** Backend validates profile configuration,
   remaps criterion IDs as required, validates that exactly one expert is
   present for this model, and persists the evaluation using its registered
   evaluation structure. Draft/recovery uses the same structure contract.
5. **Execution:** `buildIssueModelRequestPayload` sends `context.structure`,
   criteria and alternatives by ID, weights by criterion ID, ordered category
   configuration, profile configuration, and the one persisted evaluation.
   The DMS adapter validates those fields before dispatching to one of the
   limiting or central pure-core functions.
6. **Result and presentation:** the adapter returns categories, one
   assignment per alternative, and diagnostics. Backend validates/normalizes
   this with `sorting@1`, authorizes categories and alternative IDs, and
   persists execution evidence. Finished Issue projects assignments and AHP
   evidence from the persisted execution; it does not recalculate the model.
7. **Scenarios:** Scenario Lab snapshots parameters and evaluation payloads;
   replay uses the model-specific request snapshot and the same DMS adapter.
   The E2E covers limiting replay and central replay with an explicitly
   pessimistic tie policy.

The relevant implementation is organized under `models/ahp_sort_i/` in the
DMS, the Backend evaluation structure and model-execution modules, and the
Frontend Decision Plugin parameter/evaluation and Finished Issue presentation
registries. The contract keys are `ahpSortAlternativeProfiles` for evaluation
and `sorting@1` for results. Sorting output contains assignments and
diagnostics, not ranking fields.

## Platform decisions and current limits

- **One expert only:** AHPSort I alternative/profile judgment aggregation is
  not enabled. Creation, participant editing, normal execution, scenario
  execution, and the DMS adapter reject multi-expert AHPSort I rather than
  silently choosing or averaging evaluations. This is a platform limit; it is
  not prescribed by the cited paper.
- **No consensus capabilities:** model metadata keeps consensus and consensus
  simulation disabled. This does not change the separate AHP/MCC criterion
  weighting workflow in the DSS.
- **Sorting contract:** the returned category assignment is the declared
  result. The paper notes that AHPSort scores may also be used in ranking
  contexts (preprint PDF p. 4), but this DSS does not expose a global order of
  alternatives. In multi-profile mode, each alternative's profile priorities
  are derived in its own local matrices, and the product uses them for that
  alternative's category assignment; a global ranking would require a
  separately specified and validated interpretation.
- **Judgments and domains:** comparisons use Saaty values and reciprocals.
  Numeric expression-domain snapshots satisfy shared Issue contracts only;
  they are not transformed into AHPSort judgments.
- **Activation:** the DMS definition is `ready` and individually authorized
  only when all four environment values match the dedicated E2E stack:
  `NODE_ENV=e2e`, `E2E_ISOLATED_STACK=true`, `E2E_MONGO_HOST=mongo-e2e`, and
  `E2E_MONGODB_DB_NAME=cretevalley_e2e`. Elsewhere it remains `scaffold` and
  unauthorized. Consensus stays disabled. No production or normal development
  activation is part of this work.
- **Future activation:** any supervised non-E2E activation needs a separate
  review of readiness metadata, manifest synchronization, authorized database
  and service configuration, owner/admin visibility, single-expert workflow,
  and operational rollback. It must not reuse the E2E environment bypass.

## Reproducible evidence

The original supplier fixture, transcription, rounded Table 5 comparisons,
and 12 accepted/rejected outcomes are in `REFERENCE_DATA.md` and
`tests/models/test_ahp_sort_i.py`. The other reproducible fixtures are in
`models/ahp_sort_i/examples.py`. Directed tests cover:

- local Saaty matrices, eigenvectors, weights, unrounded aggregation,
  assignment boundaries, profile ordering, and both central tie policies;
- DMS request/response adaptation, ID-based mapping, multi-expert rejection,
  and structured errors;
- Backend → persisted evaluation → DMS → `sorting@1` → stage persistence;
- actual isolated-stack limiting and central UI runs, draft recovery for the
  limiting flow, persisted diagnostics, mobile layout, and scenario replay.

The latest Phase 6 validation results are summarized in
[TEAM_REVIEW_BRIEF.md](TEAM_REVIEW_BRIEF.md). Those results are evidence for
this branch only and do not constitute production readiness.

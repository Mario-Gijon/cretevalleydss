# AHPSort I, supplier pre-qualification reference case and mathematics

The Phase 1A implementation reproduces the binary, single-limiting-profile supplier
example in Ishizaka, Pearman and Nemery (2012), *AHPSort: an AHP-based method
for sorting problems*, International Journal of Production Research,
https://doi.org/10.1080/00207543.2012.657966.

The required source is the authors' PDF:
https://pure.port.ac.uk/ws/files/169321/AHPSort_Final.pdf

## Source data and transcription

- The five-criterion order and pairwise judgments are transcribed from Figure
  4 (journal page 4775). The ten upper-triangle judgments, in row-major order
  for Experience, Flexibility, Security, Resilience, Environment, are
  [7, 4, 7, 8, 1/4, 1, 3, 4, 5, 3].
- The unrounded criterion weights are recalculated from those judgments with
  the existing AHP principal-eigenvector implementation. Table 4 (journal
  page 4775) prints them rounded to [0.565, 0.081, 0.234, 0.081, 0.040] and
  reports an inconsistency ratio of 0.05.
- The twelve suppliers' five judgments against the same limiting profile are
  transcribed from the shaded selections in Appendix 1 (journal pages
  4783–4784). In each row, selected values to the left of neutral 1 mean
  supplier/profile equals that Saaty ratio; values selected to the right mean
  its reciprocal. The complete 12 × 5 transcription is
  ISHIZAKA_2012_SUPPLIER_JUDGMENTS in
  DecisionModelsService/tests/models/test_ahp_sort_i.py.
- Table 5 (journal page 4776) prints each local priority and both global
  priorities to three decimal places. The regression compares the local values
  that agree with the source to absolute tolerance 0.0005, half a unit in the
  last printed decimal place. The Supplier J / Flexibility source conflict is
  asserted independently. Global values are calculated from the original
  integer or reciprocal Saaty judgments and unrounded weights, never from
  rounded values printed in Tables 4 or 5.

## Supplier J / Flexibility local-priority discrepancy

The source gives two different values for this cell:

- Appendix 1 (journal page 4783), under **Flexibility**, shades 9 on the
  limiting-profile side of neutral 1 for Supplier J. This is an alternative to
  profile judgment of 1/9.
- Table 5 (journal page 4776), Supplier J's **Flexibility** local priority,
  prints 0.125.

Following the Appendix 1 input, the reciprocal 2 × 2 AHP comparison matrix is
`[[1, 1/9], [9, 1]]`. Its normalized principal eigenvector gives the supplier
local priority `(1/9) / (1 + 1/9) = 0.100` (and profile priority 0.900). The
published 0.125 instead corresponds to a judgment of 1/7, since
`0.125 / (1 - 0.125) = 1/7`. The Appendix selection is retained as algorithm
input; the Table 5 expected value is recorded as printed so the test exposes,
rather than hides, this discrepancy. The other 59 local-priority entries
match Table 5 to its printed precision.

The Appendix 1 selections for all twelve suppliers were visually checked across
all five criterion tables (journal pages 4783–4784). Apart from the separate
Table 5 local-priority conflict above, no other transcription difference was
found.

## Table 5 global-total discrepancy

Apart from Supplier J's Flexibility cell documented above, the local
priorities agree with the reciprocal 2 × 2 eigenvectors to the printed
precision. Separately, the global totals in Table 5 do not, for eight of the
twelve suppliers, equal the weighted sum of those local priorities using the
Table 4 criterion weights. For example:

| Supplier | AHPSort I weighted alternative priority | Table 5 alternative priority |
| --- | ---: | ---: |
| D | 0.811165 | 0.809 |
| E | 0.792669 | 0.791 |
| F | 0.613130 | 0.577 |
| G | 0.748701 | 0.715 |
| H | 0.368999 | 0.386 |
| I | 0.330156 | 0.332 |
| J | 0.241932 | 0.300 |
| K | 0.207839 | 0.252 |

The same discrepancy appears in the profile totals, which are the complements
of the calculated alternative priorities. Suppliers A, B, C, and L agree with
the published global values within rounding. Because Appendix 1 supplies the
original judgments and Tables 4 and 5 supply the local values, the inputs are
sufficient; the conflict is internal to the published global totals and
equations. The implementation follows the stated weighted aggregation
equations and does not invent alternative weights or judgments to force a
match. The category assignments still reproduce all twelve published
accepted/rejected outcomes: A–G are accepted, and H–L are rejected.

## AHPSort I binary calculation

For a supplier-to-profile comparison a on criterion j, the reciprocal 2 × 2
AHP matrix is [[1, a], [1/a, 1]]. Its principal eigenvalue is 2, and its
normalized principal right eigenvector is [a / (1 + a), 1 / (1 + a)]. These
are the supplier and profile local priorities. Each side's global priority is
the sum of its local priorities multiplied by the corresponding criterion
weight, as in the article's weighted-aggregation equations (3) and (4). Since
the weights sum to one and each local pair sums to one, the two global
priorities sum to one. The supplier is assigned to the upper category
when its global priority is greater than or equal to the profile's; otherwise
it is assigned to the lower category, following the limiting-profile rule in
the article.

Phase 1A remains the binary, single-profile implementation. Phase 1B.1 adds
multiple consecutive limiting profiles to the pure AHPSort I core. Neither
phase adds AHPSort II, central profiles, fuzzy judgments, or expert aggregation.

## Phase 1B.1: multiple consecutive limiting profiles

For categories supplied in DSS preference order (least to most preferred),
the core requires one limiting profile for each adjacent category pair. Each
profile is identified by `profileId`, `lowerCategoryId`, and
`upperCategoryId`. The implementation validates that the profiles cover each
adjacent boundary exactly once, then orders them by the category IDs. Request
array order is not used to infer boundary meaning.

For each alternative `k` and criterion `j`, the local matrix has dimension
`n × n`, where `n` is the number of categories and therefore one more than the
number of profiles. Its entities are the alternative followed by all profiles
in boundary order. The diagonal is 1. Alternative/profile judgments are
specific to the alternative. Profile/profile judgments are stored once per
criterion and unordered profile pair, with the record's `firstToSecond` ratio
preserving its stated orientation. The reciprocal entries are generated
automatically. The shared profile judgments are placed into each alternative's
matrix, and that complete matrix is solved anew for each alternative and
criterion; profile priorities are not treated as fixed global thresholds.
This is the classical full pairwise-comparison construction used by AHPSort I;
the later FAHPSort paper's section 2.2 is used only as an explicit description
of that classical construction, without adopting any fuzzy extension. Category
assignment follows the AHPSort limiting-profile rule while translating its
oppositely ordered categories into the DSS's least-to-most preference order.

For matrices with at least three entities, AHPSort I calls the existing AHP
principal-eigenvector and consistency implementation. Its normalized positive
principal right eigenvector supplies the alternative and profile local
priorities. The returned local diagnostics retain `lambdaMax`, CI, the existing
Saaty RI, and CR. A high CR is reported but does not block classification. The
existing AHP RI table currently supports local matrices up to dimension 15;
larger matrices are rejected with a clear validation error rather than using an
invented RI value. With a single profile, the generalized path uses the exact
Phase 1A 2×2 formula, and CR remains not applicable as before.

Each local priority is aggregated with the normalized criterion weight by ID:

`P_k = Σ_j w_j p_{kj0}` and `T_{ki} = Σ_j w_j p_{kji}`.

For every alternative, the conceptually ordered profile priorities must be
strictly increasing from the lower to the higher boundary. The core does not
sort them by calculated priority. If an adjacent pair is inverted or differs
by no more than the explicit absolute `1e-12` profile-order tolerance, the
entire call raises `AHPSortIProfileOrderError`. The error carries a stable code,
the alternative ID, both affected profile IDs, and their unrounded global
priorities. This is an explicit Crete Valley DSS execution-integrity policy,
not a rule attributed to the AHPSort authors and independent of CR.

Classification uses the unrounded binary64 global priorities and the ordered
intervals. It does not apply display rounding. A separate explicit absolute
`1e-12` classification tie tolerance absorbs eigenvector/aggregation noise:
values within that distance of a boundary are treated as equality and assigned
to the more preferred adjacent category. Values distinctly below a boundary
remain below it. Tests cover exact equality and values on either side of this
tolerance.

The generalized internal entry point is
`run_ahp_sort_i_multiple_profiles`. Its inputs are `categories`,
`limiting_profiles`, `comparisons` (alternative/profile),
`profile_comparisons`, and `criterion_weights_by_id`, all linked by IDs. The
original `run_ahp_sort_i` binary entry point and its Phase 1A return structure
remain unchanged. The generalized result retains each full local matrix,
unrounded local/global priorities, per-criterion weighted contributions, and
per-matrix consistency diagnostics for traceability.

## Phase 1B.2: central profiles

AHPSort I also describes central profiles: one representative profile for
each category, rather than one limiting profile between each adjacent pair.
For each alternative `k` and criterion `j`, a full reciprocal AHP matrix
contains the alternative and all category centers. Alternative/center
judgments are specific to that alternative; center/center judgments are
specified once per criterion and reused. The complete matrix is solved anew
for every alternative and criterion, so each center receives a local
priority in that context. Local alternative and center priorities are
aggregated with criterion weights by criterion ID, following the same
weighted-priority calculation used by AHPSort I. The existing AHP solver
provides the principal right eigenvector and retains `lambdaMax`, CI, RI and
CR diagnostics. A high CR is reported and does not itself block assignment.

The paper presents the classes from most to least preferred. Here, categories
and central profiles are ordered from least to most preferred, and
the input must contain exactly one uniquely identified center for each
category. Calculated global center priorities must be strictly increasing in
that configured order for every alternative. The core does not reorder
centers to fit the results: an inversion or a difference no greater than the
explicit absolute `1e-12` order tolerance raises
`AHPSortICentralProfileOrderError`, including the alternative ID, both center
IDs and their unrounded global priorities. This is a Crete Valley DSS
integrity policy, not a rule attributed to the paper.

Assignment selects the center with the smallest absolute global-priority
distance, `abs(P_k - M_i)`. The original article's prose and Figure 3 describe
assignment to the nearest central profile, but Equation (6) as printed
(preprint page 7; PDF page 7) gives the interval `cp2 ≤ pk < cp1` together
with `(cp1 - pk) < (cp2 - pk)`. In that interval the left difference is
positive and the right difference is non-positive, so the printed strict
inequality cannot hold. The implementation therefore follows the stated
nearest-center rule using absolute distances; this is an explicit
interpretation of the paper, not a claim that the printed equation says
`abs`.

When two or more centers are tied for nearest distance within the explicit
absolute `1e-12` distance tolerance, the caller must provide `tie_policy`:
`optimistic` selects the more preferred tied category and `pessimistic`
selects the less preferred one. The policy is required even when a particular
input does not produce a tie. The result records the chosen center, all
center distances, whether a tie was detected, the tied center IDs and the
policy used. Distances and priorities are kept at full calculated precision;
the tolerance is only for grouping numerical ties, not display rounding.

This core path is separate from the Phase 1B.1 limiting-profile path and does
not alter either prior entry point. As with the existing Saaty RI table, the
local matrix may contain at most 15 entities (the alternative plus at most 14
central profiles/categories); larger inputs are rejected rather than being
assigned an unsupported random index. Central profiles are not limiting
profiles, and this phase adds neither AHPSort II nor fuzzy judgments.

## Phase 7B: group assignment by expert classifications

The adapter can receive one complete evaluation for each submitted expert.
It runs the same individual AHPSort I path for every expert, using the shared
criteria weights, ordered categories, and configured limiting or central
profiles. Only the resulting category for each alternative is aggregated.
The adapter does not average or combine pairwise judgments, priorities, or
expert weights, and it does not run a consensus process. `supports_consensus`
and `supports_consensus_simulation` therefore remain false.

This follows the GAHPSort sequence described by López and Ishizaka (2017):
decision makers solve the sorting problem individually before the group class
assignment is derived. Labella, Ishizaka, and Martínez (2021, Section 2.1)
describe unanimity, simple majority, and equal-count ties, with optimistic and
pessimistic views selecting the best or worst tied class. Their paper adds a
consensus process later; this implementation uses the pre-consensus group
assignment only.

The DSS implementation makes one explicit generalization for more than two
ordered categories: it selects a unique modal category even when that
plurality is not an absolute majority (for example, 2–1–1–1 across four
categories). The cited papers' description of simple majority is not treated
as proof that they specify this multi-category plurality case. The unique-mode
rule is an implementation policy for this phase. If multiple categories share
the highest vote count, the required
`modelParameters.ahpSortGroup.tiePolicy` chooses the most preferred tied
category (`optimistic`) or the least preferred tied category (`pessimistic`).
This is distinct from `ahpSortProfiles.tiePolicy`, which only resolves equal
distances to central profiles within each expert's individual AHPSort I
calculation.

The group input keeps `evaluations` as one record per expert, with a stable
`expert.id` and complete `alternativeProfileComparisons` and
`profileComparisons`. Each record is validated and run; duplicate expert IDs,
unknown or duplicate comparison IDs, incomplete matrices, invalid Saaty
values, and invalid profile ordering fail the entire request. Criteria,
alternatives, weights, categories, and profiles remain shared request-level
data. A single expert needs no `ahpSortGroup` policy and retains the existing
`sorting@1` response and diagnostics unchanged.

For multiple experts, `sorting@1` keeps its existing top-level keys. The
collective assignments are selected by unweighted category votes. Diagnostics
include `aggregationMethod: unweighted_plurality_vote`, the group tie policy,
votes and status per alternative, every expert's category per alternative,
and the full individual AHPSort I diagnostics (including priorities and
consistency evidence). No ranks, vote probabilities, or consensus claims are
added. The `ahpSortGroup` request parameter is currently a DMS request
contract only; it is deliberately not declared as a public manifest parameter
until Backend and Frontend can configure it.

Scientific references:

- López, C. & Ishizaka, A. (2017), *GAHPSort: a new group multi-criteria
  decision method for sorting a large number of the cloud-based ERP solutions*,
  Computers in Industry 92–93, 12–25. Author postprint:
  https://researchportal.port.ac.uk/files/7335650/GAHPSort_Computers_in_industry_Final_postprint.pdf
- Labella, A., Ishizaka, A. & Martínez, L. (2021), *Consensual Group-AHPSort:
  Applying consensus to GAHPSort in sustainable development and industrial
  engineering*, Section 2.1, Computers & Industrial Engineering 152, 107013:
  https://ruja.ujaen.es/server/api/core/bitstreams/8e61495c-7d06-4b12-b975-88aaf493a49c/content

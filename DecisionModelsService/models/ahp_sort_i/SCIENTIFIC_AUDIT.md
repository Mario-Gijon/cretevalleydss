# Scientific audit: AHPSort I and GAHPSort

**Scope:** independent comparison of the current branch implementation with
the original AHPSort I (2012) and GAHPSort (2017) publications. This audit
changes documentation and scientific tests only. No production formula,
persisted result, or execution contract was modified.

**Audited revision:** `feature/sorting-models` at `4cd67e8c` plus the audit
test added with this report.

**Sources:**

1. A. Ishizaka, C. Pearman, and P. Nemery, “AHPSort: an AHP-based method for
   sorting problems,” *International Journal of Production Research* (2012),
   DOI [10.1080/00207543.2012.657966](https://doi.org/10.1080/00207543.2012.657966),
   [author preprint](https://pure.port.ac.uk/ws/files/169321/AHPSort_Final.pdf).
2. C. López and A. Ishizaka, “GAHPSort: a new group multi-criteria decision
   method for sorting a large number of the cloud-based ERP solutions,”
   *Computers in Industry* 92 (2017), 12–24,
   DOI [10.1016/j.compind.2017.06.007](https://doi.org/10.1016/j.compind.2017.06.007),
   [author postprint](https://pure.port.ac.uk/ws/files/7335650/GAHPSort_Computers_in_industry_Final_postprint.pdf).
3. T. L. Saaty, “A scaling method for priorities in hierarchical structures,”
   *Journal of Mathematical Psychology* 15(3) (1977), 234–281,
   DOI [10.1016/0022-2496(77)90033-5](https://doi.org/10.1016/0022-2496(77)90033-5).

Page numbers below distinguish the preprint PDF page and the page number printed
inside the postprint where that is available. The papers—not project fixtures—
were used as the scientific source for rules and published case values.

## Executive conclusion

- The **single-expert AHPSort I calculation** follows the published method for
  the original binary limiting-profile case. An independent NumPy eigenvector
  calculation reproduces the 2012 five-criterion weights to the table's three
  decimals, and a separate formula-level calculation reproduces all 12
  supplier category assignments.
- The original supplier paper contains **two source-data inconsistencies**:
  Supplier J / Flexibility has `1/9` in Appendix 1 but `0.125` in Table 5, and
  eight global priorities do not follow the published weighted-sum equation
  when recalculated from Appendix judgments and Table 4 weights. The code keeps
  Appendix inputs and the stated equations; it does not tune output to the
  inconsistent table values. The 12 category outcomes still match.
- The generalized multiple-boundary and central-profile functions are
  **documented DSS extensions/interpretations**. They preserve the AHPSort
  weighted-priority and assignment concepts. Ordering tolerances and full
  matrix construction policies are not claims that the 2012 paper specifies
  those exact implementation details.
- The 0.5 graphic for binary AHPSort I has an exact mathematical basis, but it
  is valid only for a shared single limiting profile, two categories, a common
  normalized criterion-weight vector, and complementary two-item local AHP
  priorities. The Frontend checks those conditions against saved evidence and
  disables the graphic when they are absent or inconsistent.
- **The multi-expert executor is not a literal implementation of GAHPSort's
  group step 9.** It classifies experts individually, but uses one shared
  issue-level weight vector and shared profile configuration, then selects a
  unique modal category or resolves tied modes by ordinal optimistic or
  pessimistic preference. GAHPSort instead specifies expert-specific weights
  and profiles, and uses summed distances for particular group ties. This is a
  material, documented product policy and can change assignments. Do not
  describe the current group behavior as scientifically identical to original
  GAHPSort.
- The GAHPSort 2017 case study itself does not consistently apply its method
  section: for Vendor 9, individual scores imply a 2–1 upper-class majority,
  while the printed overall score is below 0.5. Thus its reported seven
  accepted ERP vendors are not reproduced by the step-9 majority rule on the
  scores printed in Table 5. The published raw questionnaires/matrices are not
  sufficient to resolve the conflict or regenerate the complete case.
- Sustainable Development V3 is a **synthetic DSS scenario**, not a
  transcription or replication of the 2017 case study. The UK 1–1–1 result
  assigned optimistically to Good is not a GAHPSort rule: the 2017 paper does
  not define a three-category, three-expert all-way tie.

## Method and implementation review

The current implementation was inspected in:

- `models/ahp_sort_i/run.py`, `executor.py`, and `group.py`;
- `models/ahp_criteria_weights/run.py` and `executor.py`;
- `services/criteria_weights_consensus/mcc_weights.py`;
- `Frontend/src/features/finishedIssueDialog/resultPresentations/modelFindings/ahp_sort_i.js`;
- `Frontend/src/features/finishedIssueDialog/resultPresentations/presentations/sorting/v1/index.js`;
- `Backend/modules/issues/modelExecution/buildIssueModelRequestPayload.js` and
  `Backend/modules/issues/computation/computeIssueEvaluationStage.js`;
- the `sorting@1` result registry/validator and the AHPSort I tests.

### AHP criteria weights and consistency

The AHPSort I paper says to derive criteria weights by AHP's principal
eigenvalue method and gives `A p = λ p` as Equation 2 (2012 preprint PDF p. 6).
The current AHP weight solver builds a positive reciprocal matrix from one
judgment per unordered criterion pair, creates reciprocal lower-triangle
entries, solves for the principal right eigenvector, changes only its sign if
needed, normalizes it to sum to one, and checks the eigenvector residual. It
selects the largest real eigenvalue as `lambdaMax`.

For `n > 2`, the implementation reports
`CI = max(0, (lambdaMax - n) / (n - 1))` and `CR = CI / RI[n]`. The `max(0, …)`
only clips floating-point negative residue. For one or two criteria, CI, RI,
and CR are `not_applicable`, because there is no meaningful ratio based on a
random-index denominator. The configured RI values are the familiar sequence
for matrix sizes 3–15 (`0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51,
1.48, 1.56, 1.57, 1.59`); matrices beyond size 15 are rejected rather than
assigned an unsupported RI. The two AHPSort papers report the eigenvector
method and example CRs, not this complete RI table or a new AHPSort-specific
consistency equation. Saaty's AHP paper introduces the 1–9 scale, principal
eigenvector priorities, and the consistency condition `lambdaMax = n`.

The CR value above 0.10 is retained as a diagnostic (`review`) and does not
block a valid classification. This is the current AHP/DSS workflow; CR is not
an AHPSort class-assignment rule. The GAHPSort case reports an overall CR of
0.06, but also shows a DM-specific CR of 0.13 alongside 0.05 and 0.09; it
describes the panel as sufficiently consistent based on the aggregate value.
That reporting choice is not a reason to suppress individual diagnostics in
the DSS.

The 2012 Figure 4/Table 4 matrix was independently rebuilt from the ten
published upper-triangle judgments in order
Experience, Flexibility, Security, Resilience, Environment:
`[7, 4, 7, 8, 1/4, 1, 3, 4, 5, 3]`. NumPy's principal vector rounds to the
published weights `[0.565, 0.081, 0.234, 0.081, 0.040]`; its computed CR rounds
to the published `0.05`. A test compares the actual AHP solver to this
independent matrix and eigenpair, including lambda, CI, RI, and CR.

### AHPSort I local evaluations and aggregation

The 2012 method steps 4–7 (preprint PDF pp. 6–7) call for criterion
pairwise-comparison weights, alternative/profile pairwise priorities, and
weighted-sum global priorities. The DSS accepts only the fundamental Saaty
integers 1–9 and their reciprocals. Judgments are keyed to stable criterion,
alternative, and profile IDs; array order does not establish identity. Each
comparison matrix has unit diagonal and reciprocal opposite entries.

In the published binary supplier case, each alternative is compared to one
common limiting profile on each criterion. For a ratio `a` of alternative to
profile, the complete 2×2 matrix is
`[[1, a], [1/a, 1]]`, whose principal vector normalizes to
`[a/(1+a), 1/(1+a)]`. The implementation uses this exact closed form for the
binary one-profile path. Each side is then multiplied by the same criterion
weight and summed. The implementation retains full precision and records
local matrices, priorities, weighted contributions, and AHP diagnostics.

The generalized multi-profile functions build, per alternative and criterion,
a full reciprocal matrix ordered as the alternative followed by the
configured profiles. The upper profile/profile comparison is supplied once
per criterion and reused for each alternative; alternative/profile judgments
are alternative-specific. The local matrix is solved anew, then every local
priority is multiplied by the normalized weight matched by criterion ID. This
is compatible with AHP aggregation and the complete-profile-comparison form
explicit in GAHPSort 2017 Equation 9, but its exact input/storage/reuse
convention is a DSS generalization beyond the one-profile 2012 case study.

### Limiting profiles

The 2012 paper defines a limiting profile as the minimum required performance
for a category, and Equation 5 (preprint PDF pp. 7–8) assigns each alternative
using adjacent ordered profile priorities. Equality to a boundary belongs to
the more-preferred category. The product stores category preference order
least-to-most preferred and maps profile boundaries by adjacent category IDs;
the paper's printed diagrams/equations use the reverse order.

For the binary path, the rule is exactly `P_alternative >= P_profile`. For
multiple boundaries, the core first checks that computed boundary priorities
are strictly increasing in configured order, then assigns against those
intervals. It does not silently reorder invalid profiles. If a boundary is
inverted or coincident within the explicit absolute `1e-12` profile-order
tolerance, the execution fails with a structured integrity error. The
multiple-boundary classifier also treats values within `1e-12` below a
boundary as equality and assigns upward. These are deterministic DSS
numerical/integrity policies, not tolerances specified by Ishizaka et al.

### Central profiles

The 2012 method defines central profiles as representative examples of each
class. It says to assign an alternative to the nearest central profile and to
resolve equal distances optimistically upward or pessimistically downward
(preprint PDF p. 7, Figure 3 and Equation 6). The implementation computes
`abs(P_alternative - P_center)` and requires an explicit tie policy; ties
within `1e-12` are resolved in configured category order.

Equation 6 as printed is internally defective: in the stated interval
`cp2 <= pk < cp1`, it compares `(cp1 - pk) < (cp2 - pk)`, even though the left
side is positive and the right side non-positive. That strict inequality
cannot hold in the interval. The implementation follows the paper's prose and
Figure 3 (nearest profile), which is the mathematically coherent reading, not
a claim that the printed formula explicitly says absolute distance.

The implementation requires exactly one central profile per category and
requires their computed global priorities to increase in least-to-most
category order. This is a practical DSS integrity constraint. The paper
states nearest-center semantics but does not prescribe this particular
validation error or tolerance. Multiple-center pairwise matrices are also a
generalized DSS implementation detail.

## The binary 0.5 threshold and Frontend display

For each criterion `j` in a one-boundary binary case, the 2×2 reciprocal
matrix gives:

```text
p_alternative,j = a_j / (1 + a_j)
p_profile,j     = 1 / (1 + a_j)
p_alternative,j + p_profile,j = 1
```

With the same normalized non-negative weights for the two entities,
`Σ_j w_j = 1`:

```text
P_alternative + P_profile
= Σ_j w_j (p_alternative,j + p_profile,j)
= Σ_j w_j
= 1.
```

Therefore `P_alternative >= P_profile` iff
`P_alternative >= 1 - P_alternative`, iff `P_alternative >= 0.5`. Equality is
included on both sides and selects the upper category, as in Equation 5.
This proof relies on a single common boundary, two categories, complementary
normalized 2-item local priorities, and identical normalized criterion
weights for the alternative and profile. It does not establish a universal
0.5 threshold for multiple profiles, profile-specific weights, group-average
priorities, or central profiles.

The Frontend's `hasComparableBinaryAHPSortEvidence` gate checks two categories,
limiting mode, exactly one profile ID shared across alternatives, complete
saved evidence for every alternative, identical criterion IDs and weights,
unit weight total, reciprocal 2×2 matrices, the analytic local priorities,
weighted contributions, complementarity, and agreement between the saved
assignment and both rules. Group output has vote diagnostics rather than one
shared alternative/profile priority record and does not pass this evidence
gate. Historical or malformed results without this evidence use a value-only
or contextual display.

The display orders alternatives by descending `globalPriority` **only inside
their assigned category**, and only when that same binary evidence gate passes.
This is a contextual score ordering against a common reference, not an added
cross-category ranking. The original AHPSort paper says scores may also be
used for ranking (preprint PDF p. 4), while emphasizing that sorting assigns
predefined categories. Keeping the product contract as sorting and restricting
this visual order to within-category alternatives is a defensible
presentation choice. For generalized profiles, evidence is not assumed
comparable across alternatives and the stored alternative order is preserved.

## GAHPSort and the current group execution

### What the 2017 method specifies

Section 4.2, steps 3–8 (author postprint PDF pp. 9–11), has the group agree on
the problem and classes, but each expert defines that expert's profiles,
derives criterion weights `w_js` from that expert's AHP matrix, compares each
alternative against that expert's profiles, derives individual local and
global priorities, and classifies each alternative individually.

Step 9 (postprint PDF pp. 12–13, Equations 6–7) describes three cases:

1. Unanimous expert category assignments remain unanimous.
2. A majority category is the group assignment.
3. If half the experts assign a category and half the experts assign its
   adjacent category, limiting-profile mode compares the sums of each side's
   distances from its experts' alternative priorities to their limiting
   profiles. The side with the larger total distance is selected; equal totals
   use optimistic/pessimistic policy. Central-profile mode compares summed
   distances of all experts to the two adjacent centers; the smaller sum wins,
   and equal sums use the same preference policy.

Step 9 does not state what to do for every possible multi-category vote
pattern. In particular, the paper gives no rule for a three-way 1–1–1 tie
across three categories, a unique multi-category plurality without a strict
majority, or a top-count tie involving non-adjacent categories.

### What the current DMS does

`executor.py` resolves the evaluation record for each stable expert ID and
runs a complete individual AHPSort I calculation. It retains individual
diagnostics. However, the model parameters `weights`, `orderedCategories`,
and `ahpSortProfiles` are request-level data shared by all expert runs; the
alternative/profile comparison payload is expert-specific. For multiple
experts, Backend omits per-evaluation weight records for AHPSort I, and the
DMS passes the same issue-level `weights` into every expert calculation.

For collective classification, `group.py` receives only the expert's assigned
category ID for each alternative. It counts votes. A unique modal category
wins even if it is not an absolute majority. When multiple categories tie for
the largest count, optimistic mode chooses the most-preferred tied category;
pessimistic mode chooses the least-preferred tied category. It does not receive
individual priorities, profiles, distances, or expert weights, so it cannot
implement the distance comparisons in GAHPSort Step 9. The result reports
`aggregationMethod: unweighted_plurality_vote`; it does not claim to be a
distance-based GAHPSort tie result. `sorting@1` preserves one assignment per
alternative and diagnostics; it does not add an artificial rank.

This is an intentional **product extension/difference in methodology**, not a
demonstrated coding defect. It is outcome-relevant, however. A reproducible
limiting-profile example with boundary `0.5` and two experts at `0.05` (Low)
and `0.51` (High) has a 1–1 vote. GAHPSort Step 9 assigns Low because the Low
side's boundary distance `0.45` is greater than `0.01`; current DSS optimistic
voting assigns High. A central example with centers `0.25` and `0.75`, experts
at `0.24` (Low) and `0.55` (High), has summed center distances `0.31` versus
`0.71`; Step 9 chooses Low, while current optimistic vote tie chooses High.
The independent regression test asserts both differences without changing
production behavior.

### 2, 3, 4, and 5 experts; the V3 three-way tie

The existing group tests cover unanimity, a majority, equal adjacent splits,
unique pluralities, non-adjacent ties, input-order invariance, and expert counts
of 2–5. The new scientific tests explicitly label these current outputs as
current DSS policies, not claims that GAHPSort's text defines all of them.

In the synthetic V3 scenario, United Kingdom has Bad: 1, Moderate: 1, Good: 1.
Current optimistic ordinal tie resolution returns Good. Since the method paper
only specifies a tie where **half** the experts split across **two adjacent**
classes, it does not specify the all-way tie. Good is an extension chosen by
the DSS preference policy. This scenario is synthetic; it is not a reproduction
of the cloud-ERP experiment or a published Sustainable Development dataset.

## AHP, MCC, individual classification, and group decisions

These are distinct stages in the current platform:

1. AHP criteria weighting computes a separate principal-eigenvector vector
   from every expert's pairwise criteria matrix.
2. With more than one criteria-weighting expert, the AHP executor calls the
   existing MCC linear program. It minimizes the sum of absolute adjustments
   from each expert's original weight vector, uses equal expert aggregation
   weights/costs, requires each adjusted vector and collective vector to sum
   to one, and constrains every adjusted coordinate to be within
   `epsilon = 0.05` of the collective weighted mean. The returned `g` is the
   mean of the adjusted vectors, not necessarily the arithmetic mean of the
   original AHP vectors. With one expert, AHP weights pass through directly.
3. Backend persists the operational criteria weights on the Issue.
4. For each AHPSort I alternative-evaluation expert, the DMS classifies that
   expert's alternative/profile comparisons using the same issue-level
   operational weights. It does not use each expert's original criteria vector
   inside that classification.
5. The DMS separately aggregates those individual category IDs by unweighted
   plurality/tie policy. MCC is not invoked at this decision stage and does
   not aggregate the alternative/profile judgments.

GAHPSort's theoretical steps 4 and 7 explicitly use expert-specific weights
`w_js` for each expert's individual priorities. The 2017 case-study discussion
also says the criteria weights provided by experts are averaged (postprint PDF
p. 21), whereas its theoretical method retains `w_js`. The DSS's MCC result is
not the per-expert calculation in the method section and is not plain
arithmetic averaging as described in the case narrative. It is an additional
Crete Valley DSS integration. It can alter an individual expert's weighted
priorities and therefore its category assignment, not just the final group
vote. It is not mandatory for original GAHPSort and should be named explicitly
in any scientific description of DSS results.

The MCC regression test independently verifies the LP's normalization,
equal-weight mean link, epsilon bounds, and L1 objective from the returned
adjusted vectors. It does not assert one LP optimum where multiple optima may
exist.

## Independent reference reproductions

### AHPSort I supplier pre-qualification (2012)

The source case has 12 suppliers, five criteria, and one shared limiting
profile. Figure 4/Table 4 (preprint PDF pp. 12–13; journal p. 4775) provides the
criterion comparison matrix and rounded weights; Appendix 1 (preprint PDF
pp. 24–25; journal pp. 4783–4784) provides the 60 judgments; Table 5 (preprint
PDF p. 14; journal p. 4776) provides rounded local/global priorities and
accepted/rejected results.

The new independent test constructs the criterion matrix itself, solves its
principal eigenpair with NumPy, calculates all 60 two-item local priorities
analytically, calculates 12 weighted priorities, and applies the 0.5
boundary. It calls the production methods only after computing these expected
values. It checks:

- the criterion vector against Table 4 within `0.0005`, half of the last
  printed decimal place;
- all computed local priorities against Table 5 with the same tolerance;
- the Appendix-to-Table-5 mismatch for Supplier J / Flexibility separately;
- all production local/global values against the independent calculation to
  `1e-12`;
- the eight Table 5 global-value disagreements; and
- all 12 binary assignments (A–G Accepted, H–L Rejected).

**Local mismatch:** Appendix 1 shades 9 on the limiting-profile side for
Supplier J / Flexibility, yielding alternative/profile `1/9` and alternative
priority `(1/9)/(1+1/9) = 0.100`. Table 5 prints `0.125`, which would require
`1/7`. The Appendix transcription remains the input; the table value remains
the published expected value in the test so the conflict stays visible.

**Global mismatch:** applying the stated weights to unrounded local values
produces the following priorities versus the printed Table 5 values:

| Supplier | Recomputed alternative priority | Table 5 | Difference |
| --- | ---: | ---: | --- |
| D | 0.811165 | 0.809 | source mismatch |
| E | 0.792669 | 0.791 | source mismatch |
| F | 0.613130 | 0.577 | source mismatch |
| G | 0.748701 | 0.715 | source mismatch |
| H | 0.368999 | 0.386 | source mismatch |
| I | 0.330156 | 0.332 | source mismatch |
| J | 0.241932 | 0.300 | source mismatch |
| K | 0.207839 | 0.252 | source mismatch |

A, B, C, and L match within printed rounding. The profile scores are
complements of the recomputed alternative scores. The test therefore
reproduces the published assignment decisions, not all the rounded global
numbers. No formula was modified to force those eight values.

### GAHPSort cloud ERP (2017)

The paper provides three decision makers, their rounded criterion weights in
Table 2, individual limiting profiles in Table 3, an extract questionnaire in
Appendix A, and individual/overall scores for 11 vendors in Table 5. It does
not provide the complete individual pairwise criteria matrices and complete
vendor/profile questionnaire responses needed to rerun every AHP eigenvector
from raw judgments. A complete end-to-end matrix-level scientific fixture is
therefore **not verifiable** from the publication.

Table 5 is sufficient for a score-level check of Step 9. With two classes and
the stated threshold 0.5, the printed individual scores produce a 2–1 or 3–0
majority for eight vendors. Thresholding the printed overall score produces
the paper's reported seven accepted vendors. Vendor 9 is the sole difference:
DM scores `.247, .507, .528` vote Low, High, High, while its printed overall
score `.424` is below `.5`. The new test independently transcribes all 11
published DM/overall rows, verifies eight versus seven, and identifies Vendor
9 as the only mismatch. This is a source-level difference between the
method-section group vote and the case-study average-score result, not evidence
that the DSS arithmetic should be altered.

The paper says the three experts are equally weighted in the overall priority
average and that Table 5 vendors are sorted descending for the subsequent
selection stage (postprint PDF p. 21). That ranking for the later selection
stage does not turn the group sorting method itself into an arbitrary
plurality. The platform keeps the `sorting@1` result as categories plus
assignments; its diagnostic priority is evidence, not a persisted global rank.

### Sustainable Development V3

The Scenario Lab fixture explicitly marks its evaluations as synthetic. The
existing scenario regression covers its three experts, six criteria, five
alternatives, MCC weight flow, 90 local matrices, individual assignments, and
collective vote counts. It verifies deterministic application behavior; it
does not claim scientific replication of López and Ishizaka's ERP data or an
external Sustainable Development study. The independent tests in this audit
use published 2012 and 2017 score data only where those sources actually
provide them.

## Classification of findings

| Component | Academic reference | Current implementation | Conclusion | Severity |
| --- | --- | --- | --- | --- |
| AHP criterion pairwise matrices and eigenvector | Saaty 1977; AHPSort 2012 Eq. 2, PDF p. 6; Table 4 | Positive reciprocal matrix, principal right eigenvector, normalized vector and residual check | **Conforme**; independent 2012 weights and CR round to Table 4 | Low |
| Saaty scale and reciprocal entries | Saaty 1977; AHPSort 2012 Appendix 1; GAHPSort 2017 Table 4 | 1–9 and reciprocals; stable IDs; reciprocal matrix constructed internally | **Conforme** for original scale | Low |
| CI / CR and random-index limits | Saaty AHP consistency; papers report CR, but do not specify this full RI table | Standard configured RI for sizes 3–15; one/two criteria are N/A; high CR is diagnostic, not blocking | **Extension documented** at solver/workflow boundary; RI source convention should remain explicit | Low |
| Single limiting profile and binary assignment | AHPSort 2012 steps 5–7, Eq. 3–5, PDF pp. 6–8; case Table 5 | Exact 2×2 formula, common normalized weights, `>=` threshold | **Conforme**; all 12 category outcomes match | Low |
| Supplier J / Flexibility value | AHPSort 2012 Appendix 1 vs Table 5 | Uses Appendix ratio `1/9`; Table 5 local expectation remains `0.125` | **Source discrepancy**, not implementation error | Medium (publication data) |
| Supplier case global values | AHPSort 2012 Eqs. 3–4 and Table 5 | Uses original judgments and unrounded AHP weights | **Source discrepancy** for D–K, eight totals; no formula error demonstrated | Medium (publication data) |
| Multiple limiting profiles | AHPSort 2012 steps 3, 5–7 and Eq. 5; GAHPSort 2017 Eq. 9 | Full alternative+profiles matrix, profile comparisons shared by criterion, ID-keyed boundaries, strict order check | **Extension documented**; comparison reuse and tolerance are DSS choices | Medium (scope) |
| Boundary equality / near-boundary tolerance | AHPSort 2012 Eq. 5 assigns equality to upper class | Exact binary equality goes up; generalized path treats `1e-12` below as equality | Exact case **Conforme**; generalized tolerance is **extension documented** | Low |
| Central profile nearest rule | AHPSort 2012 Figure 3 and prose, Eq. 6 | Absolute distance to each global center; optimistic/pessimistic tie | **Interpretation documented** of malformed printed Eq. 6 | Medium (source ambiguity) |
| Central center ordering and tie epsilon | AHPSort 2012 nearest-profile rule/tie description | Rejects non-increasing centers; `1e-12` distance tie policy | **Extension documented** as integrity/numeric policy | Low |
| GAHPSort individual weights/profiles | GAHPSort 2017 steps 3–8, Eqs. 1–5 | One shared Issue weight vector and shared profiles; expert-specific alternative/profile judgments | **Difference in methodology** from expert-specific method steps | High (interpretation/result impact) |
| GAHPSort group tie by distance | GAHPSort 2017 step 9, Eqs. 6–7, PDF pp. 12–13 | Counts categories only; no individual scores/distances reach `group.py` | **Difference in methodology**; limiting and central counterexamples produce different classes | High (result impact) |
| Unique plurality, non-adjacent and all-way ties | GAHPSort 2017 step 9 covers majority or equal split between adjacent classes | Unique mode wins; top-count ties choose ordinal extreme | **Extension documented** where the paper is silent; not a demonstrated algorithm error | Medium (policy/result impact) |
| GAHPSort 2017 Vendor 9 case result | GAHPSort 2017 step 9 and Table 5 | Per-expert scores imply majority High; printed overall score implies Low | **Source method/case discrepancy**; the source reports seven accepted rather than the eight from majority | High (scientific interpretation) |
| MCC criteria-weight integration | MCC linear program; GAHPSort 2017 steps 4 and 7 / case discussion | Individual AHP weights are adjusted to an MCC collective vector; that vector is used for all AHPSort I expert classifications | **Extension documented / difference in methodology**; MCC is not original GAHPSort | High (result impact) |
| Synthetic V3 and group all-way tie | No matching case in the 2012 or 2017 sources | 1–1–1 chooses Good under optimistic DSS policy | **Extension documented**, not a literature reproduction | Medium (communication) |
| Binary 0.5 visualization | AHPSort 2012 Eq. 5 and Table 5 complementary binary scores | Frontend verifies full single-profile/two-category/shared-weight evidence before showing it | **Conforme under guard conditions** | Low |
| Within-category display order | AHPSort 2012 notes scores can be used for ranking (PDF p. 4); sorting contract remains category assignment | Descending priority only within a comparable binary category; no cross-category ranks | **Extension documented** as contextual presentation | Low |
| `sorting@1` result shape | AHPSort is a sorting method; DSS result registry v1 | Categories and one assignment per alternative, with diagnostics; no rank output | **Conforme** with sorting semantics | Low |

No **error demonstrated** was found in the audited AHP eigenvector, weighted
priority, limiting assignment, central nearest-profile interpretation, or
sorting result projection. The high-severity GAHPSort findings are meaningful
method differences, not mislabeled coding defects; they require a product / lab
decision before the multi-expert DSS output is described as the original
GAHPSort result.

## Test evidence and coverage

The new `tests/models/test_ahp_sort_i_scientific_reference.py` contains
standalone NumPy eigenpair calculations, formula-based binary priorities,
published case transcriptions, direct GAHPSort tie-distance calculations, and
independent checks of the MCC LP's returned constraints/objective. It does not
import a DMS solver to generate its expected eigenvectors, scores, or source
cases. Production functions are called only as the system under test.

Existing directed tests additionally cover:

- one criterion, two criteria, neutral matrices, AHP reciprocity, Saaty values,
  inconsistent matrices, ID-keyed criteria, and AHP consistency diagnostics;
- exact and near limiting-boundary cases, multiple boundary intervals,
  invalid/inverted/coincident profiles, weights, and request-order invariance;
- central-profile nearest choices, exact midpoint ties under both policies,
  tie tolerances, profile order, and input-ID/order behavior;
- 2–5 experts, unanimity, strict majority, equal split, unique plurality,
  multiple/non-adjacent ties, deterministic expert ordering, and V3 voting;
- AHP → MCC → individual AHPSort I → category vote behavior using the
  synthetic V3 fixture.

The 2017 published case can only be checked from its printed score table, not
re-executed from raw comparisons. That limitation is stated instead of filling
missing judgments with guesses.

Validation on the audited working tree:

- Directed AHPSort I, group, executor, synthetic V3, AHP weights, registry, and
  MCC analysis tests: **212 passed**.
- `compileall` over AHPSort I, AHP criteria weighting, MCC, and the independent
  reference test: **passed**.
- Ruff on the new independent reference test: **passed**.
- `git diff --cached --check` on the exact four-file commit set: **passed**.

## Documentation currency

`SCIENTIFIC_REVIEW.md` and `TEAM_REVIEW_BRIEF.md` were written for earlier
implementation phases. Their single-expert and activation statements do not
describe the current branch, which supports multiple individual expert runs
and explicit per-environment activation. They are retained as phase records;
this audit is the current scientific account. The group implementation is
still a vote extension, with the differences above.

## Risks and recommendations, in order

1. **Decide and label the multi-expert method.** Either implement and validate
   the original GAHPSort Step 9 semantics in a separate approved change, or
   retain the vote method and describe outputs as “AHPSort I individual
   classifications with DSS plurality aggregation,” not original GAHPSort.
   A future implementation must preserve individual priorities and profile
   distances through group aggregation.
2. **Decide how expert criteria weights and profiles are meant to work.** The
   original method says expert-specific weights/profiles; the current Issue
   contract uses shared Issue-level MCC weights and shared profiles. If exact
   GAHPSort fidelity is required, this is upstream of the vote tie calculation
   and must be designed with backwards compatibility in mind.
3. **Keep the 2017 source conflict visible.** The step-9 majority procedure
   and reported ERP Table 5 acceptance count disagree for Vendor 9. Do not use
   the seven-vendor result as a direct oracle for a future majority
   implementation without resolving the intended paper/case interpretation.
4. **Retain separate 2012 transcription and printed tables.** Appendix 1 is
   the input source for Supplier J; Table 5 is the published value. Keep the
   eight global discrepancies recorded and do not tune formulas to rounded
   totals.
5. **Keep central Equation 6 caveat and numeric tolerances visible.** The
   nearest-center absolute-distance interpretation is supported by the text
   and figure; the strict-order and `1e-12` policies remain software policy.
6. **Preserve guarded binary metrics.** The 0.5 proof is exact under its
   assumptions. Do not show that threshold for multi-profile, central, or
   group-level priorities unless a separate proof establishes comparability.
7. **Avoid calling synthetic fixtures scientific replications.** Keep
   Sustainable Development V3 identified as a deterministic synthetic
   regression fixture.

## Final assessment

Crete Valley DSS has a defensible, tested **AHPSort I individual core** for the
published binary supplier case. Its generalized multiple-profile and central
paths are explicit extensions with documented ordering checks and a justified
interpretation of the central-profile prose. The AHP criteria solver is
consistent with the principal-eigenvector basis; the CR display is a
diagnostic policy. The 2012 source case's assignments reproduce, while its
local J/Flexibility cell and eight global totals remain publication
discrepancies.

The current multi-expert path should be described as **AHPSort I per-expert
classification + shared MCC weights/profiles + DSS unweighted plurality**.
It is not a literal reproduction of GAHPSort 2017's expert-specific weighting,
profile setup, and distance-based step-9 tie handling. The source ERP case
also conflicts with the stated majority method in the printed Vendor 9 row.
No production results or historical Issues were changed by this audit.

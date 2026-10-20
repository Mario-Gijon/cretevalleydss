# TOPSIS-Sort (Sabokbar et al., 2016)

This isolated package implements the original TOPSIS-Sort method in the attached
2016 paper. It is not registered in the DecisionModelsService model catalog and
does not enable Backend execution, consensus, or analysis.

## Equation-to-code map

| Paper equation | Operation | Implementation |
| --- | --- | --- |
| (1) | Classical TOPSIS vector normalization, described in the background section | Not applied a second time in TOPSIS-Sort. The method's Step 4 explicitly substitutes its Eq. (7) normalization; Table 3 verifies max scaling. |
| (2) | Multiply each normalized criterion column by its relative weight | `weighted_normalized_matrix` |
| (3) | Select positive and negative ideal coordinates by benefit/cost preference | `run_topsis_sort_2016`: Eq. (7) reverses cost coordinates, so the ideal is the column maximum and anti-ideal is the minimum in the transformed space |
| (4), (5) | Euclidean distance to the positive ideal and anti-ideal | `calculate_euclidean_distances` |
| (6) | Relative closeness `D- / (D+ + D-)` | `calculate_closeness_coefficients` |
| (7) | Divide by the joint decision/profile column maximum; complement cost criteria | `normalize_eq7` |
| (8) | Strict comparison against adjacent profile closeness values | `_assign_order`; equality raises `ProfileBoundaryTieError` |

The 2016 sorting procedure builds the matrix from alternatives and profiles,
normalizes that combined matrix, then applies weighted TOPSIS and calculates
closeness for both alternatives and profiles. The criteria, alternatives, and
profiles are keyed by stable IDs throughout. Names and category labels never
participate in lookup.

## Benefit and cost coordinates

For benefit criterion `j`, Eq. (7) is `r = x / max(x)`. For cost criterion it
is `r = 1 - x / max(x)`. The cost transform makes higher normalized values
better, so Eq. (3) takes maxima for the positive ideal in all transformed
columns.

Table 3 displays the cost column in the unreflected coordinate `x / max(x)` and
keeps the ordinary TOPSIS minimum-cost ideal. This is an exact affine
reflection of Eq. (7), not a different result: for weight `w`, the transformed
weighted cost is `w - w*x/max(x)`. Reflecting the alternatives, profiles, ideal,
and anti-ideal together preserves every Euclidean distance and closeness value.
For District 1, g5 therefore appears as `0.068441...` in Table 3 and as
`0.131558...` under literal Eq. (7); both coordinate systems yield the same
Table 4 values and Table 5 class.

The Tehran data and profiles are in their original criterion domains. The
paper also discusses setting profiles on the normalized `[0, 1]` scale; this
is a way to express threshold values in the normalized coordinates, not an
additional normalization formula. This core deliberately accepts raw profile
values and performs the paper's single Eq. (7) transformation. The current
Backend `boundaryProfiles` contract has no field distinguishing raw from
already-normalized profile coordinates, so a future integration that accepts
both forms must add an explicit coordinate-space choice. No Backend change is
part of this implementation.

## Category and profile semantics

The paper orders `C1` as best and `Cq` as worst. The application orders
categories from least preferred at order zero to most preferred at the largest
order. The reversible mapping is `article Ck -> application order q-k`.

There are `q - 1` shared boundary profiles, not two independently configured
profiles per class. In article order, `p1` separates `C1` from `C2`, and
`p(q-1)` separates `C(q-1)` from `Cq`; the same profile is reused as the
neighboring classes' common limit. In application order, a boundary's
`category_id` identifies the more-preferred category entered at that boundary.
For Tehran the four profiles map as `p4 -> C4`, `p3 -> C3`, `p2 -> C2`, and
`p1 -> C1` when ordered from least to most preferred.

The lowest and highest categories are open-ended beyond their one finite
boundary. Intermediate categories are open intervals between adjacent profile
closeness values. Eq. (8) uses strict inequalities. It does not define which
class owns an alternative equal to a profile, so the core returns a controlled
error instead of inventing a tie rule. Boundary equality means exact equality
of the computed floating-point closeness coefficients; no tolerance merges
nearby values. When the computed coefficients differ, their strict order is
used directly. Since the calculations use binary floating-point arithmetic,
distinct real-number results can in principle round to the same coefficient;
the implementation treats equality in its computed representation as a tie
and does not claim exact real arithmetic.

Consecutive profiles must have strictly increasing computed closeness values
in least-to-most-preferred order. Equal values leave the intermediate strict
interval empty, so the configuration is rejected with
`AssignmentUndeterminedError`. This also catches profiles that differ only on
zero-weight criteria, because such differences do not change the weighted
TOPSIS coordinates or their closeness.

The existing `boundaryProfiles` structure is structurally compatible with the
raw-value procedure: it stores exactly `q - 1` profiles, values by criterion
ID, and the category entered after each boundary. Its ordering convention is
reversible as above. Its numeric-domain and monotonicity checks fit this input
form. It cannot currently express the paper's normalized-coordinate profile
form without ambiguity. The structure's current reference to TOPSIS-Sort-B
does not alter this 2016 implementation.

## Tehran reproduction and paper precision

`tehran_2016.py` preserves the 22 rows and four profiles from Tables 1 and 2,
the rounded weighted values from Table 3, the rounded distances/closeness from
Table 4, and the classes from Table 5. The implementation reproduces all 22
Table 5 classes exactly.

Using the full input precision, the largest absolute differences from Table 4
are `0.00004923` for `D+`, `0.00004769` for `D-`, and `0.00008649` for
closeness. These are consistent with the publication's rounded Table 3 and
Table 4 intermediate values; the article does not state the internal rounding
precision. The reported Table 4 closeness values themselves agree with the
ratio formed from its displayed distances within `0.00000480`.

The paper's Step 5 says to execute TOPSIS Steps 1--5 after Step 4 has already
normalized with Eq. (7). A literal second Eq. (1) vector normalization would
change the published Table 3 values and fail to reproduce Table 4. The
procedure and Tehran tables together support applying the downstream weighted
ideal/distance/closeness steps once to the Eq. (7) matrix; this implementation
does not perform a second normalization.

## Scope relative to other sorting variants

This package uses the 2016 article's Eq. (7), positive/negative ideal points,
Euclidean distances, relative closeness, and limiting-profile comparisons. It
does not implement TOPSIS-Sort-B's 2020 normalization choices or TOPSIS-Sort-C
characteristic-profile procedure. It does not produce rankings or rank
positions; multiple alternatives can share a category and a category can be
empty.

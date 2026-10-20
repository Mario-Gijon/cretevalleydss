# `orderedCategories` parameter structure

This shared Model Parameters structure stores category identity and display
metadata as an array of `{ categoryId, label, order }` objects. IDs are
non-empty trimmed strings and must be unique. Labels are display text, may
repeat, and are never used to resolve references. Orders are unique consecutive
integers beginning at zero; order zero is the least preferred category. Values
are normalized into ascending order. The common structure does not impose a
category-count threshold; a model may define stricter requirements of its own.

An optional manifest `default` uses the same validation as a submitted value.
The normalized array is stored in the issue's `modelParameters` and is copied
into the creation snapshot alongside the model parameter definition. This lets
sorting result validation recover the permitted categories from persisted
configuration instead of trusting categories returned by an executor or
looking up mutable catalog definitions. The result validator requires an exact
match of IDs, labels, and orders. Historical result projections do not need this
execution context.

## Common and method-specific configuration

The genuinely shared configuration is the ordered category identity list and
its fixed `lower-order-is-less-preferred` semantics. Profile definitions,
comparison judgments, interpolation points, and assignment rules are not common
enough to combine safely into one profile structure.

| Method | Profile and evaluation requirements | Contract implications |
| --- | --- | --- |
| TOPSIS-Sort | The name is ambiguous across variants. The original/boundary approach uses `q - 1` limiting profiles to separate `q` ordered categories. TOPSIS-Sort-B adds criterion-domain and normalization choices. TOPSIS-Sort-C instead uses characteristic profiles associated with categories. | First select the exact variant. Boundary profiles and characteristic profiles have different cardinality and meanings; they cannot share one generic `profiles` array without a variant-specific contract. Criterion values, benefit/cost directions, weights, and normalization settings also need explicit definition. |
| AHPSort | Supports either limiting profiles (`q - 1` per criterion) or central profiles (`q` per criterion). AHP compares criteria for weights and compares alternatives against profiles; central-profile assignment uses nearest global priority and has an optimistic/pessimistic tie rule. | Profile mode, criterion-level profile values, pairwise judgments, and tie policy are method parameters. Limiting and central profiles must remain distinguishable. |
| AHPSort II | Retains limiting or central class profiles, but uses a small, criterion-specific set of representative performance points and pairwise judgments to construct local priority functions by interpolation. Representative points are points on criterion scales, not category profiles. Clustering and joining points may reduce comparison burden; boundary-near alternatives may require exact AHPSort fine tuning. | It needs both the selected class-profile mode and separate, per-criterion representative points, comparisons, and interpolation/cluster data. A profile-only abstraction would omit essential AHPSort II inputs. |

## Contracts intentionally deferred

Before adding profile parameters, the model definition must select one
mathematical variant and specify its profile semantics, cardinality, criterion
value domain, and assignment/tie policy. Candidate follow-up structures are:

- A criterion-keyed profile matrix whose rows have stable profile IDs and whose
  values are validated using the existing expression-domain rules. Criterion
  IDs must be remapped recursively with `remapCriterionIds` when issue creation
  replaces temporary IDs with Mongo IDs.
- Dedicated AHP pairwise-comparison matrices for profile judgments. Existing
  alternative comparison structures cannot be reused until their compared-item
  identity contract can represent profiles without treating them as
  alternatives.
- A separate representative-point structure for AHPSort II, keyed by criterion
  and ordered on that criterion's domain, plus explicit comparison and optional
  cluster/join-point data.
- Method-specific configuration for thresholds, optimistic/pessimistic ties,
  benefit/cost direction, normalization, and any references to actual
  alternatives. References to alternatives should be ID-based and distinct
  from profile IDs.

These structures remain unimplemented until each method's exact variant and
domain semantics are specified. No sorting algorithm is implemented or enabled
by this parameter structure.

## References

- de Lima Silva et al., “Sorting with TOPSIS through boundary and characteristic
  profiles,” *Computers & Industrial Engineering* 141 (2020), 106328.
  https://doi.org/10.1016/j.cie.2020.106328
- Ishizaka, Pearman, and Nemery, “AHPSort: an AHP-based method for sorting
  problems,” *International Journal of Production Research* 50(17) (2012),
  4767–4784. https://doi.org/10.1080/00207543.2012.657966
- Miccoli and Ishizaka, “Sorting municipalities in Umbria according to the risk
  of wolf attacks with AHPSort II,” *Ecological Indicators* 73 (2017), 741–755.
  https://doi.org/10.1016/j.ecolind.2016.10.034

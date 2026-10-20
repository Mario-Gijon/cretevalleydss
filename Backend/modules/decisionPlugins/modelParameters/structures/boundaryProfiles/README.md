# `boundaryProfiles` model parameter structure

This structure records crisp numeric boundary profiles for ordered categories.
Each entry has a stable `profileId`, a `categoryId`, and a map of
`valuesByCriterionId`. Criterion map keys are canonical leaf criterion IDs;
names are never used for lookup. `categoryId` identifies the category entered
at that boundary: for the configured order, it must match each category after
the least-preferred category. Profiles are normalized into that category order,
and criterion values into the issue's leaf-criterion order.

The structure requires exactly `q - 1` profiles for `q >= 2` configured
categories. IDs must be unique and all adjacent boundaries must be represented.
The issue's assigned expression domain for each referenced criterion must be
`numericContinuous` or `numericDiscrete`, and every value must lie within that
domain's minimum and maximum. Profiles must be monotone in criterion preference
direction as categories become more preferred, with strict preference on at
least one criterion between each adjacent pair. Benefit and cost criterion
types are required. Optional parameter `restrictions.min` and `restrictions.max`
further narrow the allowed profile values. Discrete step alignment is not
imposed: the TOPSIS-Sort-B publication defines the fixed domain by its endpoints
and does not specify a step-alignment rule for a boundary profile.

`orderedCategories` is declared as a parameter dependency, resolved by structure
key through the shared model-parameter validator. This keeps the dependency
independent of the configured parameter's key and validates regardless of
manifest order. Criterion IDs are remapped with the shared `remapCriterionIds`
hook during issue creation.

## Scope relative to TOPSIS-Sort-B

The published method defines `q - 1` profiles between adjacent ordered classes,
uses criterion values for each profile, and assumes each better ordered profile
dominates the preceding one with strict preference on at least one criterion.
It also requires a known criterion domain and describes max and interval
normalization options. This structure covers profile configuration and uses
the assigned numeric expression domains for its ranges. The choice between
normalization modes is a separate method parameter and is not encoded here;
the existing criterion-weight configuration remains separate as well.
Closeness calculations and assignment are algorithm concerns and are not
implemented here.

Algorithm 3 assigns categories using strict inequalities between alternative
and profile closeness coefficients. The publication does not specify a
tie-breaking rule when coefficients are equal; a future execution contract
must define that behavior before the algorithm is enabled. No algorithm is
implemented or enabled by this parameter structure.

## Reference

de Lima Silva, D. F., and de Almeida Filho, A. T. (2020), “Sorting with TOPSIS
through boundary and characteristic profiles,” *Computers & Industrial
Engineering*, 141, 106328. [https://doi.org/10.1016/j.cie.2020.106328](https://doi.org/10.1016/j.cie.2020.106328)

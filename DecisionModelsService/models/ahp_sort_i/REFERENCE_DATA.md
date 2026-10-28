# AHPSort I, supplier pre-qualification reference case

This implementation reproduces the binary, single-limiting-profile supplier
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

The implementation does not add AHPSort II, central profiles, multiple
limiting profiles, or expert aggregation.

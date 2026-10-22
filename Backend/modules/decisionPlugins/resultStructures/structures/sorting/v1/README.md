# sorting@1 result contract

`sorting@1` represents a classification into ordered categories. It does not
represent an individual ranking of alternatives.

The normalized result has:

- `categories`: one or more `{ categoryId, label, order }` definitions.
- `categoryOrderSemantics`: the fixed value
  `lower-order-is-less-preferred`.
- `assignments`: exactly one `{ alternativeId, categoryId }` assignment for
  every alternative authorized by the Backend execution context.
- Optional `diagnostics`: an opaque object for model-specific diagnostic data.

Category IDs identify categories; labels are display text and may repeat.
Assignments always reference `categoryId`, so labels never resolve identity.
Orders are unique consecutive integers beginning at zero. Normalized
categories are sorted by `order`; an order of zero is the least preferred
category and larger values are progressively more preferred. A category may
have no assigned alternatives, and multiple alternatives may share one
category.

Alternative IDs must be supplied by the Backend as
`context.authorizedAlternativeIds`. The plugin does not infer identity from
names or trust IDs returned by DecisionModelsService. Each assignment retains
that canonical ID, including in persisted and historical results. Normalized
assignments follow the Backend's authorized alternative order; this ordering
does not express preference.

The Backend also supplies `context.authorizedCategories`, resolved from the
persisted `orderedCategories` model parameter using the model parameter
definition frozen in the issue creation snapshot. The result's category IDs,
labels, and orders must exactly match this configuration. The validator does
not infer authorization from the categories returned by the executor. This
context is only required while validating a new execution result; projections
of already-persisted historical results continue to use their stored data.

Category profiles, thresholds, reference alternatives, and their parameters
are outside this result contract. They belong to model parameters and issue
configuration; profile requirements vary between sorting methods and are
documented with the `orderedCategories` parameter structure.

This result structure supports issue execution and the system's generic Results
Analysis. Consensus remains disabled. Generic analysis uses only the configured
categories and persisted assignments; it does not interpret model diagnostics
or convert categories into ranks or scores.

An optional `plotsGraphic` object may carry finite two-dimensional expert and
collective points for Results Analysis. It is presentation evidence only; the
sorting contract does not require it, and its absence does not affect execution.
The coordinates may be omitted with a `reason` when a meaningful projection
cannot be built. Sorting results without this field remain valid for historical
records and sorting models that do not provide an expert projection.

When available, `plotsGraphic.identical_evaluation_groups` and
`plotsGraphic.collective_identical_expert_ids` identify exact equality in the
numeric matrices used to build the display. These fields are optional,
validated presentation evidence: coincident 2D coordinates alone never imply
equal original evaluations.

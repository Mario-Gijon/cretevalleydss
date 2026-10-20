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

Category profiles, thresholds, reference alternatives, and their parameters
are outside this result contract. Those belong to model parameters and issue
configuration. No profile shape is required until the corresponding generic
parameter contract is implemented.

This result structure is available to validate and project stored results,
but its `issueExecution`, `consensus`, and `resultsAnalysis` capabilities are
disabled. They must be enabled only after model execution and the relevant
consensus or analysis contracts are implemented.

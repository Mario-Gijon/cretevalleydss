# Finished Issue Results Analysis — Visualizations implementation bundle

This bundle defines the approved first implementation of the detailed
**Results Analysis → Visualizations** subview.

Extracted location:

`Frontend/finished_issue_results_visualizations_design/`

Approved reference:

- `REFERENCE_VISUALIZATIONS_SINGLE_EXECUTION.png`

Codex must read this README and `README_COMPONENT_NOTES.md` completely before
changing production code.

The supplied JSX and logic files are reference implementations. Adapt them to
the actual current branch, existing public APIs, current component signatures,
MUI version, Chart.js version and focused tests.

Do not copy them blindly.

## Approved product scope

This first version deliberately contains only:

1. Expert–collective analytical dispersion.
2. Consensus evolution when the Finished Issue uses consensus.
3. A neutral visualizations-development notice.
4. A neutral multiple-execution placeholder.

No other graph is approved in this phase.

Do not implement:

- execution summary
- model parameter summary
- expert weights
- ranking evolution across consensus rounds
- criterion contribution
- score normalization
- score comparisons
- heatmaps
- automatic conclusions
- explainability
- distance metrics
- clustering metrics
- reliability conclusions
- raw-output-derived charts

These may be designed in later iterations.

## Canonical evidence boundary

### Expert–collective dispersion

The graph must read only the canonical controlled field:

`execution.standardizedOutput.plotsGraphic`

Use the current canonical execution resolution and existing
`normalizePlotsGraphic`.

The graph must never read, search or infer the same information from:

- `rawOutput`
- `modelSpecificOutput`
- `modelExecution`
- arbitrary plugin output
- model-specific keys

`rawOutput` exists for unrestricted evidence display in Models. It is not a
trusted Results Analysis visualization contract.

If `standardizedOutput.plotsGraphic` is absent or invalid:

- render a factual unavailable state
- preserve the stored reason when available
- do not inspect Raw output
- do not fabricate coordinates

### Consensus evolution

Use only the canonical Finished Issue consensus contract:

- `payload.consensus.enabled`
- `payload.consensus.rounds`
- linked canonical phase results
- `consensusMeasure`
- `threshold`
- phase identity
- finalization metadata where already available

Prefer reusing the existing pure consensus builder:

`sections/consensus/logic/buildConsensusData.js`

Do not parse Raw output or model lifecycle internals to reconstruct consensus.

## Approved layout

The existing Results Analysis execution-selection toolbar remains above the
subview.

Do not add an Execution summary block.

### One selected execution with consensus

Desktop:

```text
┌──────────── Expert–collective map ────────────┐ ┌──── Consensus evolution ────┐
│                                               │ │                              │
│                                               │ │                              │
└───────────────────────────────────────────────┘ └──────────────────────────────┘

┌──────────────────── Visualizations development notice ────────────────────────┐
└────────────────────────────────────────────────────────────────────────────────┘
```

The two cards should have balanced readable widths. The scatter card may be
slightly wider than the consensus card.

Tablet/mobile:

- stack the cards
- scatter first
- consensus second
- no page-level horizontal overflow

### One selected execution without consensus

The Expert–collective map occupies the complete available content width.

Do not reserve an empty consensus column.

```text
┌──────────────────────────── Expert–collective map ─────────────────────────────┐
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────── Visualizations development notice ────────────────────────┐
└────────────────────────────────────────────────────────────────────────────────┘
```

### Two or three selected executions

Keep a polished neutral placeholder in this phase.

Do not:

- render only the first execution silently
- merge scatter plots
- duplicate one issue-level consensus chart per execution
- invent comparative visualization semantics
- repeat Outcome ranking movement
- repeat Outcome correlations
- compare original model scores

Suggested text:

Title:

`Comparative visualizations`

Body:

`Comparative visualizations are not available yet. Select one execution to view its stored analytical visualizations.`

The execution-selection toolbar remains visible so the user can return to one
selection.

## Expert–collective card

Title:

`Expert–collective map`

Subtitle:

`Dispersion of expert points and the collective position.`

Content:

- existing `AnalyticalScatterChart`
- one point per canonical expert point
- one visually distinct collective point
- existing zoom and pan support
- Reset zoom button when data is available
- expert labels in tooltips
- collective label in tooltip
- factual unavailable state otherwise

Do not label axes as:

- Criterion 1
- Criterion 2
- performance
- quality
- cost
- utility
- preference

unless those exact semantics become part of a future canonical graph contract.

The current coordinates represent a stored analytical projection. Their axes do
not currently carry controlled semantic names.

Do not display claims such as:

- positive values are better
- experts closer to the collective are more reliable
- distance represents disagreement
- a cluster proves consensus

Those interpretations are not part of the current contract.

A neutral optional footer is acceptable:

`Coordinates come from the stored analytical projection for this execution.`

Do not expose Raw output.

## Consensus evolution card

Render this card whenever:

`payload.consensus.enabled === true`

Title:

`Consensus evolution`

Subtitle:

`Consensus level by phase.`

Content:

- existing `AnalyticalConsensusLineChart`
- canonical phase labels in actual phase order
- consensus values on a 0–1 scale
- threshold as a dashed horizontal line when finite
- final stored consensus point
- tooltips with percentage formatting
- factual unavailable state when progression cannot be rendered
- optional threshold chip in the header

Do not call phases array indexes.

Preserve sparse actual phase identities.

A single canonical phase may render as one point if the chart supports it. If
the existing chart requires at least two values, show a factual unavailable
state rather than inventing a second point.

Suggested threshold chip:

`Threshold 70%`

Do not add:

- delta versus previous
- success claims
- consensus-quality labels
- automatic finalization interpretation
- predicted next phase

The standalone Consensus section remains unchanged.

## Existing graph reuse

Reuse:

- `normalizePlotsGraphic`
- `AnalyticalScatterChart`
- `AnalyticalConsensusLineChart`
- existing Chart.js packages
- current reset-zoom behavior

Do not add a chart dependency.

Enhance `AnalyticalConsensusLineChart` backward-compatibly so it can receive an
optional numeric `threshold`.

The existing Consensus section must continue working when threshold is absent or
present.

## Threshold line

When `data.threshold` is a finite number:

- add a second Chart.js line dataset
- repeat the threshold value for every phase
- use a dashed line
- do not fill beneath it
- use zero/small point radius
- label it `Threshold`
- keep it visually secondary
- tooltip must distinguish Consensus level from Threshold

Do not mutate the source data.

When threshold is absent:

- render only the consensus series
- do not fabricate a default threshold

## Suggested production architecture

```text
sections/resultsAnalysis/
├── logic/
│   ├── buildResultsAnalysisWorkspaceData.js
│   └── buildResultsVisualizationsData.js
└── components/
    ├── ResultsAnalysisView.jsx
    ├── VisualizationsPanel.jsx
    ├── ExpertCollectiveVisualizationCard.jsx
    ├── ConsensusEvolutionCard.jsx
    ├── ComparisonVisualizationsPlaceholder.jsx
    └── VisualizationsDevelopmentNotice.jsx
```

Section-local styles may be placed in:

```text
sections/resultsAnalysis/resultsAnalysis.styles.js
```

or a focused:

```text
sections/resultsAnalysis/resultsVisualizations.styles.js
```

Follow current repository conventions and avoid duplicate style systems.

## Pure builder contract

Add a pure builder conceptually equivalent to:

```js
buildResultsVisualizationsData({
  payload,
  execution,
})
```

Return a stable provider-free object:

```js
{
  expertCollective: {
    available,
    unavailableReason,
    data,
    selectedPhase,
  },
  consensus: {
    enabled,
    supported,
    available,
    unavailableReason,
    threshold,
    finalPhase,
    graph: {
      labels,
      data,
      threshold,
    },
  },
}
```

The builder must contain no:

- React
- hooks
- MUI
- Chart.js
- refs
- context reads
- services
- mutable UI state

## Workspace integration

The current Results Analysis workspace builder already resolves each execution.

Integrate the visualization builder into the normalized execution object.

Conceptually:

```js
visualizations: buildResultsVisualizationsData({
  payload,
  execution,
})
```

The single-execution Results Analysis view uses:

`data.primary.visualizations`

Do not build visualization evidence again inside React components.

Do not resolve scenarios inside visual components.

## Consensus builder reuse

Prefer:

```js
const consensus = buildConsensusData(payload);
```

Then derive the Results Analysis visualization view model from its controlled
fields.

Avoid creating a second subtly different consensus-phase resolver.

If direct cross-section import violates an established project boundary, extract
the common pure consensus normalization into shared Finished Issue logic and use
it from both sections.

Do not duplicate consensus business rules.

## Reset zoom

Preserve the existing scatter ref and reset method:

- `scatterPlotRef`
- `onResetZoom`
- current `resetZoom` behavior

The Reset zoom action appears only when the scatter graph is available.

Do not add reset zoom to the consensus chart unless it already supports zoom.

## Card sizing

Use bounded responsive chart frames.

Do not use self-referential ResizeObserver height measurement.

Do not create percentage-height feedback loops.

Suggested scatter frame:

- mobile: 320px
- tablet: 400px
- desktop: 470–520px

Suggested consensus frame:

- mobile: 300–320px
- tablet: 380px
- desktop: same outer-card height as the scatter card where practical

Use fixed/bounded responsive CSS heights on chart frames because both Chart.js
components use `maintainAspectRatio: false`.

When both cards are in one desktop grid row:

- stretch outer cards to equal height
- make each card a column
- let its bounded chart frame occupy the main body
- keep any footer at the bottom
- no infinite vertical growth

When no consensus:

- scatter card spans every grid column
- do not narrow it to the previous left-column width

## Development notice

Render one notice below the graph grid.

Suggested title:

`Visualization coverage is currently limited.`

Suggested body:

`This version includes the expert–collective map and, for consensus issues, consensus evolution. Additional analytical visualizations will be added in future iterations.`

This is informational, not an error or warning.

Use dark navy/cyan styling.

Do not use orange/yellow.

Do not place the notice inside every graph card.

## Responsive behavior

Verify:

- 360px
- 390px
- 600px
- 768px
- 1024px
- 1440px
- ultrawide desktop

At 360px / 390px:

- toolbar wraps
- graph cards stack
- chart labels remain readable
- Reset zoom remains reachable
- no page-level overflow
- cards remain opaque
- notice wraps cleanly

At 768px / 1024px:

- cards stack until both are genuinely readable side by side
- no cramped two-column graph layout

At desktop:

- consensus issue: two balanced cards
- non-consensus issue: scatter full width
- graph frames use most of each card
- cards align cleanly

At ultrawide:

- preserve Finished Issue content frame
- do not stretch chart cards to absurd heights
- chart width may expand
- chart height remains bounded

## Factual unavailable states

Scatter mapping:

- `insufficient_variation_for_projection`
- `insufficient_points_for_projection`
- `projection_failed`
- generic missing analytical projection

Consensus:

- consensus disabled: do not render card
- enabled with no rounds: render factual unavailable state
- no finite measures: render factual unavailable state
- unsupported consensus contract: preserve factual support state
- missing threshold: chart still renders without threshold line

Do not surface raw backend objects directly as React children.

## Tests

Add or update focused semantic tests.

### Builder

1. Reads scatter only from `standardizedOutput.plotsGraphic`.
2. Never reads `rawOutput`.
3. Raw output containing fake plot data is ignored.
4. Missing standardized plot returns unavailable.
5. Existing normalization reason is preserved.
6. Expert labels are preserved.
7. Collective point is preserved.
8. Consensus disabled returns `enabled: false`.
9. Consensus enabled uses canonical rounds/phase results.
10. Sparse phase identities preserve their real labels.
11. Consensus values preserve zero.
12. Missing values do not become zero.
13. Threshold is preserved when finite.
14. Missing threshold remains null.
15. No phase is fabricated.
16. No model-specific key branching is introduced.

### Single-execution view

17. Selection toolbar remains above Visualizations.
18. No Execution summary renders.
19. Scatter card renders when available.
20. Reset zoom renders only for available scatter.
21. Scatter unavailable state is factual.
22. Consensus issue renders the consensus card.
23. Non-consensus issue does not render a consensus card.
24. Non-consensus layout makes scatter span the full width.
25. Consensus layout renders two cards at desktop.
26. Cards stack responsively.
27. Development notice renders once.
28. No Raw output text renders.
29. No invented axis semantic labels render.
30. No positive-values-are-better claim renders.

### Consensus chart

31. Existing consensus series remains.
32. Optional threshold creates a dashed dataset.
33. Missing threshold creates no threshold dataset.
34. Consensus tooltip formats score as percentage.
35. Threshold tooltip is distinguishable.
36. Existing Consensus section remains compatible.
37. Chart frame height is bounded.
38. No ResizeObserver height feedback loop is introduced.

### Multiple selection

39. Two selections render the comparative placeholder.
40. Three selections render the comparative placeholder.
41. Placeholder asks the user to select one execution.
42. No selected execution is silently ignored.
43. Outcome comparison remains unchanged.
44. Interpretation remains unchanged.

### Compatibility

45. Dashboard preview remains unchanged.
46. Models remains unchanged.
47. Evaluations remains unchanged.
48. Consensus standalone section remains unchanged.
49. No Backend file is modified.
50. No API contract is modified.
51. No dependency is added.
52. Finished Issue still uses one canonical request.
53. No object is rendered directly as a React child.

Avoid screenshot snapshot tests.

## Verification

Run:

```bash
cd Frontend
bun run test
bun run lint
bun run build
git diff --check
```

Search production Results Analysis visualization code for:

- `rawOutput`
- `modelSpecificOutput`
- `modelExecution`
- `Criterion 1`
- `Criterion 2`
- `positive values`
- `Execution summary`
- score normalization
- ResizeObserver height measurement
- duplicated consensus parsing

Any occurrence must be inspected and removed when it violates this README.

## Completion boundary

This phase is complete when:

- the first approved reference composition is implemented
- no Execution summary exists
- canonical scatter data is used directly
- Raw output is never consulted
- consensus issues show scatter plus consensus evolution
- non-consensus issues show a full-width scatter
- threshold is displayed when available
- multiple selections remain a truthful placeholder
- the development notice is present
- existing graph behavior and unrelated sections remain compatible

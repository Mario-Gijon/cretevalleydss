# Adaptation notes

The current branch already contains:

- `VisualizationsPanel`
- `AnalyticalScatterChart`
- `AnalyticalConsensusLineChart`
- `normalizePlotsGraphic`
- `buildConsensusData`
- Results Analysis selection state
- a multiple-selection Visualizations placeholder
- scatter reset-zoom wiring

Adapt these existing contracts rather than replacing them blindly.

## Important corrections to the reference image

The approved image is a visual layout reference, not a semantic data contract.

Do not reproduce these potentially misleading visual labels from generated
mockups:

- `Criterion 1`
- `Criterion 2`
- `positive values indicate better performance`
- any invented coordinate meaning

Keep current neutral numeric axes unless a controlled semantic axis contract
exists.

## Current builder

The current workspace builder already normalizes:

`execution.standardizedOutput.plotsGraphic`

Move that responsibility into the focused visualization builder or call the
focused builder from the workspace execution normalization.

Do not retain two scatter normalizers.

## Current VisualizationsPanel

The current panel wraps one scatter chart in a generic `SectionCard`.

The new composition needs graph-specific cards so each graph has:

- its own title
- its own subtitle
- its own action/header metadata
- its own unavailable state
- bounded chart frame

The parent VisualizationsPanel should own only composition.

## Consensus evolution

The standalone Consensus section already derives canonical series through
`buildConsensusData`.

Reuse that builder or extract common pure logic.

Enhance `AnalyticalConsensusLineChart` only backward-compatibly.

The Results Analysis card may pass:

```js
{
  labels,
  data,
  threshold,
}
```

The standalone Consensus section may continue passing the same shape.

## Multiple selections

Do not remove the existing comparison placeholder until a separate comparative
Visualizations design is approved.

This bundle intentionally implements the approved single-execution visual
composition only.

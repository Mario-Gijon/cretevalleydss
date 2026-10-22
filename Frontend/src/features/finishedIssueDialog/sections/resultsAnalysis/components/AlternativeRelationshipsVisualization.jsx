import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useId, useMemo, useState } from "react";

import { HeatmapAnalyticalGraph } from "../../../../../components/analyticalGraphs";
import { finishedIssueScrollbarSx } from "../resultsAnalysis.styles.js";
import { getVisualizationReadingGuide } from "../logic/visualizationReadingGuides.js";
import { buildAlternativeRelationshipsHeatmap } from "../logic/buildAlternativeRelationshipsHeatmap.js";

const cardSx = {
  border: "1px solid rgba(83,198,214,0.16)",
  bgcolor: "rgba(8,18,29,0.88)",
  borderRadius: 3,
  p: { xs: 1.5, sm: 2 },
  minWidth: 0,
};
const readingGuide = getVisualizationReadingGuide({ type: "alternativeRelationships" });
const categoricalReadingGuide = "Each alternative is assigned to one configured category. A cell says whether two alternatives share that category; this does not imply identical underlying evaluations. Category order follows the configured preference order. Phases are shown separately and are compared only when their category configuration and alternative set match.";
const SORTING_ORDER_SEMANTICS = "lower-order-is-less-preferred";
const hasText = (value) => typeof value === "string" && Boolean(value.trim());

const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const executionDescriptor = (execution) =>
  execution?.genericAnalysis?.visualizations?.find(
    (entry) => entry?.type === "alternativeRelationships",
  );
const executionFacts = (execution) =>
  execution?.genericAnalysis?.facts?.alternativeRelationships || {};

const categoricalPhases = (execution) => {
  const descriptor = executionDescriptor(execution);
  const source = descriptor?.mode === "categorical" ? descriptor.phases : execution?.categoricalPhases;
  return Array.isArray(source) ? source : [];
};

const validCategoricalPhase = (phase) => {
  if (
    phase?.categoryOrderSemantics !== SORTING_ORDER_SEMANTICS ||
    !Array.isArray(phase?.categories) ||
    !phase.categories.length ||
    !Array.isArray(phase?.alternatives) ||
    phase.alternatives.length < 2
  ) return false;
  const categoryIds = new Set(phase.categories.map((category) => category?.categoryId ?? category?.id));
  const categoryOrders = new Set(phase.categories.map((category) => category?.order));
  if (
    phase.categories.some((category) =>
      !hasText(category?.categoryId ?? category?.id) ||
      !hasText(category?.label) ||
      !Number.isInteger(category?.order) ||
      category.order < 0
    ) ||
    categoryIds.size !== phase.categories.length ||
    categoryOrders.size !== phase.categories.length ||
    phase.categories.some((_, index) => !categoryOrders.has(index))
  ) return false;
  const alternativeIds = new Set(phase.alternatives.map((alternative) => alternative?.alternativeId ?? alternative?.id));
  return alternativeIds.size === phase.alternatives.length && phase.alternatives.every((alternative) =>
    hasText(alternative?.alternativeId ?? alternative?.id) &&
    hasText(alternative?.name) &&
    categoryIds.has(alternative?.categoryId)
  );
};

export const hasAlternativeRelationshipsVisualization = (executions = []) =>
  executions.some((execution) => {
    if (execution?.resultStructureKey === "sorting" || executionDescriptor(execution)?.mode === "categorical") {
      return categoricalPhases(execution).some(validCategoricalPhase);
    }
    const phases = executionDescriptor(execution)?.phases;
    if (!Array.isArray(phases) || phases.length === 0) return false;
    if (executionFacts(execution).normalization?.degenerate === true) return true;
    return phases.some((phase) => Boolean(buildAlternativeRelationshipsHeatmap(phase)));
  });

const unavailablePhaseMessage = (entry) => {
  const label = phaseLabel(entry.phase);
  if (entry.reason === "insufficient_alternatives") {
    return `${label} is omitted because fewer than two ranked alternatives were available.`;
  }
  if (entry.reason === "duplicate_alternative") {
    return `${label} is omitted because duplicate alternative records were present.`;
  }
  return `${label} is omitted because complete finite scores were not available.`;
};

const CategoricalRelationships = ({ phase }) => {
  const categoriesById = new Map(
    phase.categories.map((category) => [category.categoryId ?? category.id, category]),
  );
  const categoryLabelCounts = new Map();
  phase.categories.forEach((category) => {
    categoryLabelCounts.set(category.label, (categoryLabelCounts.get(category.label) || 0) + 1);
  });
  const displayCategoryLabel = (category) => categoryLabelCounts.get(category.label) > 1
    ? `${category.label} (configured order ${category.order})`
    : category.label;
  const alternativeCategory = new Map(
    phase.alternatives.map((alternative) => [alternative.alternativeId ?? alternative.id, alternative.categoryId]),
  );
  const alternatives = phase.alternatives.slice().sort((left, right) => left.name.localeCompare(right.name));
  const tableSx = {
    borderCollapse: "collapse",
    minWidth: 420,
    width: "100%",
    "& th, & td": {
      border: "1px solid rgba(83,198,214,0.2)",
      px: 1,
      py: 0.8,
      textAlign: "center",
    },
    "& th": {
      color: "text.primary",
      bgcolor: "rgba(83,198,214,0.08)",
      fontWeight: 800,
    },
    "& td": { color: "text.secondary", fontSize: 13 },
  };

  return (
    <Box sx={{ ...finishedIssueScrollbarSx, maxWidth: "100%", overflow: "auto" }} data-testid="categorical-relationships-viewport">
      <Box
        component="table"
        aria-label="Categorical alternative relationships"
        data-testid="categorical-relationship-matrix"
        sx={tableSx}
      >
        <thead>
          <tr>
            <th scope="col">Alternative</th>
            {alternatives.map((alternative) => {
              const id = alternative.alternativeId ?? alternative.id;
              return <th scope="col" key={id} data-alternative-id={id}>{alternative.name}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {alternatives.map((row) => {
            const rowId = row.alternativeId ?? row.id;
            return (
              <tr key={rowId} data-alternative-id={rowId}>
                <th scope="row">{row.name}</th>
                {alternatives.map((column) => {
                  const columnId = column.alternativeId ?? column.id;
                  const sameCategory = alternativeCategory.get(rowId) === alternativeCategory.get(columnId);
                  const category = categoriesById.get(alternativeCategory.get(rowId));
                  const isDiagonal = rowId === columnId;
                  const label = isDiagonal
                    ? "Same alternative"
                    : sameCategory
                      ? `Same category: ${category ? displayCategoryLabel(category) : "—"}`
                      : "Different categories";
                  const title = isDiagonal
                    ? label
                    : sameCategory
                      ? `${label}. This does not imply identical underlying evaluations.`
                      : label;
                  return (
                    <td
                      key={columnId}
                      title={title}
                      data-testid="categorical-relationship-cell"
                      data-row-alternative-id={rowId}
                      data-column-alternative-id={columnId}
                      data-same-category={String(sameCategory)}
                    >
                      {label}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
};

const CategoricalExecutionComparisons = ({ comparisons = [], executions = [] }) => {
  const executionsByKey = new Map(executions.map((execution) => [execution.key, execution]));
  const available = comparisons.filter((comparison) => executionsByKey.has(comparison.leftKey) && executionsByKey.has(comparison.rightKey));
  if (!available.length) return null;
  return (
    <Stack spacing={0.8} data-testid="categorical-execution-comparisons">
      <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>Assignment changes between comparable executions</Typography>
      {available.map((comparison) => {
        const left = executionsByKey.get(comparison.leftKey);
        const right = executionsByKey.get(comparison.rightKey);
        const phaseSuffix = Number.isInteger(comparison.leftPhase) && Number.isInteger(comparison.rightPhase)
          ? ` (${phaseLabel(comparison.leftPhase)} → ${phaseLabel(comparison.rightPhase)})`
          : "";
        return (
          <Box key={`${comparison.leftKey}:${comparison.rightKey}`}>
            <Typography variant="subtitle2" color="text.secondary">
              {left.displayLabel || left.name} → {right.displayLabel || right.name}{phaseSuffix}
            </Typography>
            {comparison.changes.length ? (
              <Box component="ul" sx={{ my: 0.4, pl: 2.5, color: "text.secondary" }}>
                {comparison.changes.map((change) => (
                  <li key={change.alternativeId}>
                    <Typography component="span" variant="body2">
                      <strong>{change.name}</strong>: <strong>{change.fromCategoryLabel === change.toCategoryLabel ? `${change.fromCategoryLabel} (configured order ${change.fromCategoryOrder})` : change.fromCategoryLabel}</strong> → <strong>{change.fromCategoryLabel === change.toCategoryLabel ? `${change.toCategoryLabel} (configured order ${change.toCategoryOrder})` : change.toCategoryLabel}</strong>
                    </Typography>
                  </li>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Assignments are unchanged.</Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );
};

const ExecutionRelationships = ({ execution }) => {
  const descriptor = executionDescriptor(execution);
  const facts = executionFacts(execution);
  const isCategorical = execution?.resultStructureKey === "sorting" || descriptor?.mode === "categorical";
  const sourcePhases = isCategorical ? categoricalPhases(execution) : descriptor?.phases;
  const phases = useMemo(
    () => (Array.isArray(sourcePhases) ? sourcePhases : [])
      .map((phase) => ({ phase, heatmap: isCategorical ? null : buildAlternativeRelationshipsHeatmap(phase) }))
      .filter((entry) => isCategorical ? validCategoricalPhase(entry.phase) : Boolean(entry.heatmap)),
    [sourcePhases, isCategorical],
  );
  const phaseOptions = useMemo(() => phases.map(({ phase }) => phase.phase), [phases]);
  const [selectedPhase, setSelectedPhase] = useState(
    phaseOptions[phaseOptions.length - 1] ?? null,
  );
  const phaseInputId = useId();

  useEffect(() => {
    if (!phaseOptions.some((phase) => phase === selectedPhase)) {
      setSelectedPhase(phaseOptions[phaseOptions.length - 1] ?? null);
    }
  }, [phaseOptions, selectedPhase]);

  const selected = phases.find((entry) => entry.phase.phase === selectedPhase);
  const unavailablePhases = Array.isArray(facts.unavailablePhases)
    ? facts.unavailablePhases
    : [];
  const degenerate = facts.normalization?.degenerate === true;

  if (!phases.length && !degenerate) return null;

  return (
    <Stack spacing={1.1} data-testid="alternative-relationships-execution">
      {phaseOptions.length > 1 && !degenerate ? (
        <FormControl size="small" color="secondary" sx={{ width: { xs: "100%", sm: 220 } }}>
          <InputLabel id={phaseInputId}>Phase</InputLabel>
          <Select
            labelId={phaseInputId}
            label="Phase"
            value={selectedPhase ?? ""}
            onChange={(event) => {
              const phase = phaseOptions.find(
                (candidate) => String(candidate) === String(event.target.value),
              );
              if (phase !== undefined) setSelectedPhase(phase);
            }}
          >
            {phaseOptions.map((phase) => (
              <MenuItem key={phase} value={phase}>
                {phaseLabel(phase)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : phaseOptions.length === 1 ? (
        <Typography variant="subtitle2" color="text.secondary" data-testid="alternative-relationship-phase">
          {phaseLabel(phaseOptions[0])}
        </Typography>
      ) : null}

      {isCategorical && selected ? (
        <>
          <Typography
            variant="caption"
            color="text.secondary"
            data-testid="categorical-category-order"
          >
            Category order (less preferred to more preferred): {selected.phase.categories
              .slice()
              .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
              .map((category) => {
                const duplicateLabels = selected.phase.categories.filter((candidate) => candidate.label === category.label).length > 1;
                return duplicateLabels ? `${category.label} (configured order ${category.order})` : category.label;
              })
              .join(" → ")}
          </Typography>
          <CategoricalRelationships phase={selected.phase} />
        </>
      ) : degenerate ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="alternative-relationships-degenerate"
        >
          All valid recorded scores in this execution are equal, so there is no
          relative score separation to display.
        </Typography>
      ) : selected ? (
        <>
          <Box
            data-testid="alternative-relationships-heatmap-viewport"
            sx={{
              ...finishedIssueScrollbarSx,
              maxHeight: { xs: 420, sm: 520 },
              minWidth: 0,
              overflow: "auto",
              pb: 1,
            }}
          >
            <HeatmapAnalyticalGraph visualization={selected.heatmap} />
          </Box>
          {selected.heatmap.allScoresEqual ? (
            <Typography variant="caption" color="text.secondary" data-testid="alternative-relationships-equal-phase">
              The comparable recorded scores in this phase are equal.
            </Typography>
          ) : null}
          {selected.heatmap.hasMissingPairs ? (
            <Typography variant="caption" color="text.secondary" data-testid="alternative-relationships-missing-pairs">
              Some pair values are unavailable and are not treated as zero.
            </Typography>
          ) : null}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" data-testid="alternative-relationships-unavailable">
          No phase has enough valid score comparisons to display a heatmap.
        </Typography>
      )}

      {unavailablePhases.length ? (
        <Typography variant="caption" color="text.secondary" data-testid="alternative-relationships-unavailable-phases">
          {unavailablePhases.map(unavailablePhaseMessage).join(" ")}
        </Typography>
      ) : null}
    </Stack>
  );
};

const AlternativeRelationshipsVisualization = ({ executions = [], categoricalComparisons = [] }) => {
  const visibleExecutions = executions.filter((execution) =>
    hasAlternativeRelationshipsVisualization([execution]),
  );
  if (!visibleExecutions.length) return null;

  return (
    <Box sx={cardSx} data-testid="alternative-relationships-section">
      <Typography variant="h6" component="h2" sx={{ fontWeight: 900, mb: 0.3 }}>
        {readingGuide.title}
      </Typography>
      <Stack
        spacing={1.4}
        divider={visibleExecutions.length > 1 ? <Box sx={{ borderTop: "1px solid rgba(83,198,214,0.16)" }} /> : null}
      >
        {visibleExecutions.map((execution) => (
          <Box key={execution.key} sx={{ minWidth: 0 }}>
            <Typography
              component="p"
              data-testid="visualization-reading-guide"
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.2 }}
            >
              {execution.resultStructureKey === "sorting" || executionDescriptor(execution)?.mode === "categorical" ? categoricalReadingGuide : readingGuide.text}
            </Typography>
            {visibleExecutions.length > 1 ? (
              <Typography
                variant="subtitle1"
                title={execution.fullLabel || execution.displayLabel}
                noWrap
                sx={{ fontWeight: 900, mb: 0.8, color: execution.color || "text.primary" }}
              >
                {execution.displayLabel || execution.name || "Execution"}
              </Typography>
            ) : null}
            <ExecutionRelationships execution={execution} />
          </Box>
        ))}
      </Stack>
      <CategoricalExecutionComparisons comparisons={categoricalComparisons} executions={visibleExecutions} />
    </Box>
  );
};

export default AlternativeRelationshipsVisualization;

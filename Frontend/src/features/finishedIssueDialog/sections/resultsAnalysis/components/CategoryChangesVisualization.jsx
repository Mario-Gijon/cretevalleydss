import { Box, Chip, Stack, Typography } from "@mui/material";

const cardSx = {
  border: "1px solid rgba(83,198,214,0.16)",
  bgcolor: "rgba(8,18,29,0.88)",
  borderRadius: 3,
  p: { xs: 1.5, sm: 2 },
  minWidth: 0,
};

const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const hasText = (value) => typeof value === "string" && Boolean(value.trim());

const categoryDisplayLabel = ({ label, categoryId, order, categories = [] }) => {
  const categoryIds = new Set(categories
    .filter((category) => category.label === label)
    .map((category) => category.id));
  return categoryIds.size > 1 || (categoryIds.size === 1 && !categoryIds.has(categoryId))
    ? `${label} (order ${order})`
    : label;
};

const validChange = (change) =>
  hasText(change?.alternativeId) &&
  hasText(change?.name) &&
  hasText(change?.fromCategoryId) &&
  hasText(change?.toCategoryId) &&
  change.fromCategoryId !== change.toCategoryId &&
  hasText(change?.fromCategoryLabel) &&
  hasText(change?.toCategoryLabel) &&
  Number.isInteger(change?.fromCategoryOrder) &&
  Number.isInteger(change?.toCategoryOrder) &&
  change.fromCategoryOrder !== change.toCategoryOrder;

const ChangeRow = ({ change, categories = [] }) => {
  const direction = change.toCategoryOrder > change.fromCategoryOrder
    ? "More preferred by configured order"
    : "Less preferred by configured order";
  const fromLabel = categoryDisplayLabel({ label: change.fromCategoryLabel, categoryId: change.fromCategoryId, order: change.fromCategoryOrder, categories });
  const toLabel = categoryDisplayLabel({ label: change.toCategoryLabel, categoryId: change.toCategoryId, order: change.toCategoryOrder, categories });
  return (
    <Box
      component="li"
      data-alternative-id={change.alternativeId}
      aria-label={`${change.name}: ${fromLabel} to ${toLabel}. ${direction}`}
      sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.7, py: 0.3 }}
    >
      <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
        {change.name}:
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary">
        {fromLabel}
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary" aria-hidden="true">
        →
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary">
        {toLabel}
      </Typography>
      <Chip size="small" variant="outlined" color="secondary" label={direction} />
    </Box>
  );
};

const buildTransitionEntries = (executions) => executions.flatMap((execution) => {
  if (execution?.resultStructureKey !== "sorting") return [];
  return (Array.isArray(execution.categoricalTransitions) ? execution.categoricalTransitions : [])
    .map((transition) => ({
      key: `${execution.key}:phase:${transition.fromPhase}:${transition.toPhase}`,
      label: executions.length > 1
        ? `${execution.displayLabel || execution.name}: ${phaseLabel(transition.fromPhase)} → ${phaseLabel(transition.toPhase)}`
        : `${phaseLabel(transition.fromPhase)} → ${phaseLabel(transition.toPhase)}`,
      categories: transition.categories,
      changes: (Array.isArray(transition.changes) ? transition.changes : []).filter(validChange),
    }))
    .filter((entry) => entry.changes.length > 0);
});

const buildExecutionComparisonEntries = (comparisons, executions) => {
  const executionsByKey = new Map(executions.map((execution) => [execution.key, execution]));
  return (Array.isArray(comparisons) ? comparisons : []).flatMap((comparison) => {
    const left = executionsByKey.get(comparison?.leftKey);
    const right = executionsByKey.get(comparison?.rightKey);
    const changes = (Array.isArray(comparison?.changes) ? comparison.changes : []).filter(validChange);
    if (!left || !right || !changes.length) return [];
    const phaseSuffix = Number.isInteger(comparison.leftPhase) && Number.isInteger(comparison.rightPhase)
      ? ` (${phaseLabel(comparison.leftPhase)} → ${phaseLabel(comparison.rightPhase)})`
      : "";
    return [{
      key: `${comparison.leftKey}:${comparison.rightKey}`,
      label: `${left.displayLabel || left.name} → ${right.displayLabel || right.name}${phaseSuffix}`,
      categories: [...(left.sorting?.categories || []), ...(right.sorting?.categories || [])],
      changes,
    }];
  });
};

const CategoryChangesVisualization = ({ executions = [], categoricalComparisons = [] }) => {
  const transitions = buildTransitionEntries(executions);
  const comparisons = buildExecutionComparisonEntries(categoricalComparisons, executions);
  const entries = [...transitions, ...comparisons];
  if (!entries.length) return null;

  return (
    <Box sx={cardSx} data-testid="category-changes-section">
      <Typography variant="h6" component="h2" sx={{ fontWeight: 900, mb: 0.3 }}>
        Category changes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
        Changes are shown only for matching category configurations and alternative IDs. Direction follows the configured preference order; categories are not numeric scores or utility gains.
      </Typography>
      <Stack spacing={1.2} divider={entries.length > 1 ? <Box sx={{ borderTop: "1px solid rgba(83,198,214,0.16)" }} /> : null}>
        {entries.map((entry) => (
          <Box key={entry.key} data-testid={transitions.includes(entry) ? "categorical-phase-transitions" : "categorical-execution-comparisons"}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.45 }}>
              {entry.label}
            </Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {entry.changes.map((change) => (
                <ChangeRow key={change.alternativeId} change={change} categories={entry.categories} />
              ))}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default CategoryChangesVisualization;

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

const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const executionDescriptor = (execution) =>
  execution?.genericAnalysis?.visualizations?.find(
    (entry) => entry?.type === "alternativeRelationships",
  );
const executionFacts = (execution) =>
  execution?.genericAnalysis?.facts?.alternativeRelationships || {};

export const hasAlternativeRelationshipsVisualization = (executions = []) =>
  executions.some((execution) => {
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

const ExecutionRelationships = ({ execution }) => {
  const descriptor = executionDescriptor(execution);
  const facts = executionFacts(execution);
  const sourcePhases = descriptor?.phases;
  const phases = useMemo(
    () => (Array.isArray(sourcePhases) ? sourcePhases : [])
      .map((phase) => ({ phase, heatmap: buildAlternativeRelationshipsHeatmap(phase) }))
      .filter((entry) => entry.heatmap),
    [sourcePhases],
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

      {degenerate ? (
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

const AlternativeRelationshipsVisualization = ({ executions = [] }) => {
  const visibleExecutions = executions.filter((execution) =>
    hasAlternativeRelationshipsVisualization([execution]),
  );
  if (!visibleExecutions.length) return null;

  return (
    <Box sx={cardSx} data-testid="alternative-relationships-section">
      <Typography variant="h6" component="h2" sx={{ fontWeight: 900, mb: 0.3 }}>
        {readingGuide.title}
      </Typography>
      <Typography
        component="p"
        data-testid="visualization-reading-guide"
        variant="body2"
        color="text.secondary"
        sx={{ mb: 1.2 }}
      >
        {readingGuide.text}
      </Typography>
      <Stack
        spacing={1.4}
        divider={visibleExecutions.length > 1 ? <Box sx={{ borderTop: "1px solid rgba(83,198,214,0.16)" }} /> : null}
      >
        {visibleExecutions.map((execution) => (
          <Box key={execution.key} sx={{ minWidth: 0 }}>
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
    </Box>
  );
};

export default AlternativeRelationshipsVisualization;

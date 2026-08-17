import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";

import { AnalyticalGraph } from "../../../../../components/analyticalGraphs";
import { AnalyticalScatterChart } from "../../../graphs/components/AnalyticalScatterChart";
import { ComparativeAnalyticalScatterChart } from "../../../graphs/components/ComparativeAnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../../../graphs/components/AnalyticalConsensusLineChart";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "../logic/resultsAnalysisColors.js";
import RankingMovementChart from "./RankingMovementChart.jsx";
import { buildGenericRankingMovement } from "../logic/buildGenericRankingMovement.js";
import { RANKING_ALTERNATIVE_COLORS } from "../logic/rankingAlternativeColors.js";
import ProjectedExpertDistances from "./ProjectedExpertDistances.jsx";

const cardSx = {
  border: "1px solid rgba(83,198,214,0.16)",
  bgcolor: "rgba(8,18,29,0.88)",
  borderRadius: 3,
  p: { xs: 1.5, sm: 2 },
  minWidth: 0,
};
const chartFrameSx = {
  width: "100%",
  height: { xs: 360, sm: 430, md: 500, xl: 540 },
  maxHeight: 540,
  minHeight: 0,
};
const expertChartFrameSx = {
  width: "100%",
  height: { xs: 320, sm: 360, md: 420, xl: 430 },
  maxHeight: 430,
  minHeight: 0,
};
const compactChartFrameSx = {
  width: "100%",
  height: { xs: 320, md: 380 },
  maxHeight: 400,
  minHeight: 0,
};

const unavailableMessage = (reason) => {
  if (reason === "insufficient_variation_for_projection")
    return "The analytical projection is unavailable because all expert inputs are equivalent.";
  if (reason === "insufficient_points_for_projection")
    return "The analytical projection is unavailable because there are not enough expert points.";
  if (reason === "projection_failed")
    return "The stored analytical projection could not be generated.";
  return "No stored expert–collective analytical projection is available for this execution.";
};

const Header = ({ title, subtitle, resettable, onResetZoom, extraAction }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    spacing={1}
    alignItems="flex-start"
    sx={{ mb: 1.25 }}
  >
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <AnalyticsIcon fontSize="small" color="secondary" />
      <Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
      </Box>
    </Stack>
    <Stack direction="row" spacing={0.8} alignItems="center">
      {resettable ? <Button variant="outlined" color="secondary" size="small" startIcon={<CenterFocusStrongRoundedIcon />} onClick={onResetZoom}>Reset zoom</Button> : null}
      {extraAction}
    </Stack>
  </Stack>
);

const GroupChips = ({ group }) => (
  <Stack
    direction="row"
    spacing={0.6}
    useFlexGap
    flexWrap="wrap"
    sx={{ mb: 0.9 }}
  >
    {group.representedExecutions.map((execution) => (
      <Chip
        key={execution.key}
        label={execution.label}
        title={execution.fullLabel}
        size="small"
        sx={{ borderColor: execution.color, color: execution.color }}
        variant="outlined"
      />
    ))}
    {group.id === group.referenceGroupId ? (
      <Chip label="Reference projection" size="small" variant="outlined" />
    ) : null}
  </Stack>
);

const ConsensusCard = ({ consensus }) => (
  <Box sx={cardSx}>
    <Header title="Consensus evolution" subtitle="Consensus level by phase." />
    {consensus.available ? (
      <Box sx={chartFrameSx}>
        <AnalyticalConsensusLineChart data={consensus.graph} />
      </Box>
    ) : (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minHeight: 100, display: "grid", placeItems: "center" }}
      >
        No finite consensus progression data is available.
      </Typography>
    )}
  </Box>
);

const SingleVisualization = ({
  visualizations,
  scatterPlotRef,
}) => {
  const scatter = visualizations.singleScatter;
  return (
    <Stack spacing={1.4}>
      <Box>
        <Box>
          {scatter?.available ? (
            <Box sx={expertChartFrameSx}>
              <AnalyticalScatterChart
                data={scatter.data}
                phase={scatter.sourcePhase}
                scatterPlotRef={scatterPlotRef}
                color={RESULTS_ANALYSIS_SLOT_COLORS[0]}
              />
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minHeight: 180, display: "grid", placeItems: "center" }}
            >
              {unavailableMessage(scatter?.unavailableReason)}
            </Typography>
          )}
        </Box>
      </Box>
    </Stack>
  );
};

const ComparisonVisualization = ({
  comparison,
  scatterPlotRef,
}) => {
  if (comparison.presentation === "unavailable")
    return (
      <Box sx={{ minWidth: 0 }}>
        <Typography
          color="text.secondary"
          sx={{
            minHeight: 180,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          {comparison.footerMessage}
        </Typography>
      </Box>
    );
  if (comparison.presentation === "separate")
    return (
      <Stack spacing={1.1}>
        {comparison.unavailableExecutions.filter(
          (execution) => !execution.displayAvailable,
        ).length ? (
          <Typography variant="body2" color="text.secondary">
            Unavailable stored projection:{" "}
            {comparison.unavailableExecutions
              .filter((execution) => !execution.displayAvailable)
              .map((execution) => execution.executionName)
              .join(", ")}
            .
          </Typography>
        ) : null}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.4,
          }}
        >
          {comparison.separateExecutions.map((group) => (
            <Box key={group.id} sx={{ minWidth: 0 }}>
              <GroupChips
                group={{
                  ...group,
                  referenceGroupId: comparison.referenceGroupId,
                }}
              />
              {group.equalityMessage ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.8 }}
                >
                  {group.equalityMessage}
                </Typography>
              ) : null}
              <Box sx={compactChartFrameSx}>
                <ComparativeAnalyticalScatterChart groups={[group]} compact />
              </Box>
            </Box>
          ))}
        </Box>
      </Stack>
    );
  const groups =
    comparison.presentation === "shared"
      ? [comparison.sharedProjection]
      : comparison.alignedExecutions;
  return (
    <Box>
      <Box sx={expertChartFrameSx}>
        <ComparativeAnalyticalScatterChart
          groups={groups}
          scatterPlotRef={scatterPlotRef}
        />
      </Box>
    </Box>
  );
};

const ExecutionComparisonLayout = ({
  executions,
  testId,
  dividerTestId,
  children,
}) => (
  <Box
    data-testid={testId}
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "minmax(0, 1fr)",
        md:
          executions.length > 1
            ? `${"minmax(0, 1fr) 1px ".repeat(Math.min(executions.length, 3) - 1)}minmax(0, 1fr)`
            : "minmax(0, 1fr)",
      },
      gap: 1.4,
      minWidth: 0,
      overflowX: "hidden",
      overflowY: "hidden",
    }}
  >
    {executions.flatMap((execution, index) => {
      const panel = (
        <Box
          key={execution.key}
          data-testid={`${testId}-execution`}
          sx={{ minWidth: 0 }}
        >
          {children(execution)}
        </Box>
      );
      return index < executions.length - 1
        ? [
            panel,
            <Box
              key={`${execution.key}-divider`}
              data-testid={dividerTestId || `${testId}-divider`}
              aria-hidden="true"
              sx={{
                bgcolor: "rgba(83,198,214,0.22)",
                width: "100%",
                height: { xs: "1px", md: "100%" },
              }}
            />,
          ]
        : [panel];
    })}
  </Box>
);

const ExecutionLabel = ({ execution, visible = true }) => visible ? (
  <Typography
    variant="subtitle1"
    sx={{ fontWeight: 900, mb: 0.8, color: execution.color || "text.primary" }}
  >
    {execution.displayLabel}
  </Typography>
) : null;

const RankingEvolution = ({ executions }) => (
  <Box sx={cardSx}>
    <Header
      title="Ranking evolution"
      subtitle="Position changes across consensus phases."
    />
    <ExecutionComparisonLayout
      executions={executions}
      testId="ranking-evolution-comparison"
      dividerTestId="ranking-evolution-divider"
    >
      {(execution) => {
        const visualization = execution.genericAnalysis?.visualizations?.find(
          (entry) => entry?.type === "rankingEvolution",
        );
        return (
          <>
            <ExecutionLabel execution={execution} visible={executions.length > 1} />
            {visualization ? (
              <RankingMovementChart
                movement={buildGenericRankingMovement(visualization)}
                embedded
              />
            ) : (
              <Alert severity="info">
                Ranking evolution is not available for this execution.
              </Alert>
            )}
          </>
        );
      }}
    </ExecutionComparisonLayout>
  </Box>
);

const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const ordinal = (rank) => {
  const suffix =
    rank % 100 >= 11 && rank % 100 <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[rank % 10] || "th";
  return `${rank}${suffix}`;
};

const visualizationFor = (execution, type) =>
  execution.genericAnalysis?.visualizations?.find(
    (entry) => entry?.type === type,
  );
const executionWithVisualization = (executions, type) =>
  executions.some((execution) => visualizationFor(execution, type));

const RankingStabilityChart = ({ visualization }) => {
  const alternatives = Array.isArray(visualization?.alternatives)
    ? visualization.alternatives
    : [];
  return (
    <Box
      role="img"
      aria-label="Ranking stability chart"
      sx={{ display: "grid", gap: 0.8, width: "100%" }}
    >
      <Typography variant="caption" color="text.secondary">
        Rank · 1 = best
      </Typography>
      {alternatives.map((alternative, index) => {
        const color =
          RANKING_ALTERNATIVE_COLORS[index % RANKING_ALTERNATIVE_COLORS.length];
        return (
          <Box
            key={alternative.alternativeId}
            aria-label={`${alternative.name}: initial rank ${alternative.initialRank}, final rank ${alternative.finalRank}, best rank ${alternative.bestRank}, worst rank ${alternative.worstRank}, total movement ${alternative.totalMovement}`}
            sx={{
              p: 0.9,
              borderRadius: 2,
              border: "1px solid",
              borderColor: `${color}45`,
              bgcolor: `${color}0c`,
            }}
          >
            <Typography
              noWrap
              title={alternative.name}
              sx={{ color, fontWeight: 850, fontSize: 12 }}
            >
              {alternative.name}
            </Typography>
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="center"
              sx={{ mt: 0.35 }}
            >
              <Typography sx={{ fontWeight: 950, fontSize: 18 }}>
                {ordinal(alternative.initialRank)}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 18 }}>
                →
              </Typography>
              <Typography sx={{ fontWeight: 950, fontSize: 18 }}>
                {ordinal(alternative.finalRank)}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={0.7}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 0.35 }}
            >
              <Typography variant="caption" color="text.secondary">
                Best {ordinal(alternative.bestRank)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Worst {ordinal(alternative.worstRank)}
              </Typography>
              <Typography variant="caption" sx={{ color }}>
                Total movement {alternative.totalMovement}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
};

const RankingStabilityContent = ({ execution, executions }) => {
  const visualization = visualizationFor(execution, "rankingStability");
  return <Box data-testid="ranking-stability" sx={{ minWidth: 0 }}>
    <ExecutionLabel execution={execution} visible={executions.length > 1} />
    {visualization ? <RankingStabilityChart visualization={visualization} /> : <Typography variant="body2" color="text.secondary">Ranking stability is not available for this execution.</Typography>}
  </Box>;
};

const RankingAgreementChart = ({ visualization, color }) => {
  const transitions = Array.isArray(visualization?.transitions)
    ? visualization.transitions.filter(
        (entry) =>
          typeof entry?.coefficient === "number" &&
          Number.isFinite(entry.coefficient),
      )
    : [];
  return (
    <Box
      role="group"
      aria-label="Phase-to-phase ranking agreement"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
        gap: 0.7,
        maxWidth: 560,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ gridColumn: "1 / -1" }}
      >
        1 = same ranking order · 0 = no monotonic similarity · −1 = reversed
        ranking order
      </Typography>
      {transitions.map((entry) => {
        const offset = `${((entry.coefficient + 1) / 2) * 100}%`;
        return (
          <Box
            key={`${entry.fromPhase}-${entry.toPhase}`}
            aria-label={`${phaseLabel(entry.fromPhase)} to ${phaseLabel(entry.toPhase)}: ${entry.coefficient.toFixed(2)}`}
            sx={{
              minWidth: 0,
              p: 0.75,
              borderRadius: 1.5,
              bgcolor: "rgba(3,10,17,0.3)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
            >{`${phaseLabel(entry.fromPhase)} → ${phaseLabel(entry.toPhase)}`}</Typography>
            <Typography sx={{ fontWeight: 950, color }}>
              {entry.coefficient.toFixed(2)}
            </Typography>
            <Box
              sx={{
                mt: 0.55,
                height: 6,
                borderRadius: 99,
                bgcolor: "rgba(255,255,255,0.12)",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  top: -2,
                  width: "1px",
                  height: 10,
                  bgcolor: "rgba(255,255,255,0.4)",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: offset,
                  top: -2,
                  width: 10,
                  height: 10,
                  transform: "translateX(-50%)",
                  borderRadius: "50%",
                  bgcolor: color,
                }}
              />
            </Box>
          </Box>
        );
      })}
      {visualization.stabilizationPhase != null ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ gridColumn: "1 / -1" }}
        >
          Ranking stable from {phaseLabel(visualization.stabilizationPhase)}
        </Typography>
      ) : null}
    </Box>
  );
};

const RankingAgreementContent = ({ execution, executions, showHeading = false }) => {
  const visualization = visualizationFor(execution, "rankingAgreement");
  return <Box data-testid="ranking-agreement" sx={{ minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
    {showHeading ? <Box sx={{ mb: 1 }}><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Ranking similarity between rounds</Typography><Typography variant="caption" color="text.secondary">How similar the ranking order is from one round to the next.</Typography></Box> : null}
    <ExecutionLabel execution={execution} visible={executions.length > 1} />
    {visualization ? <RankingAgreementChart visualization={visualization} color={execution.color || "#27d5e4"} /> : <Typography variant="body2" color="text.secondary">Ranking similarity is not available for this execution.</Typography>}
  </Box>;
};

const RankingTemporalSection = ({ executions }) => {
  const hasStability = executionWithVisualization(executions, "rankingStability");
  const hasAgreement = executionWithVisualization(executions, "rankingAgreement");
  if (!hasStability && !hasAgreement) return null;
  const both = hasStability && hasAgreement;
  const groups = executions;
  return <Box sx={cardSx} data-testid={executions.length === 1 ? "secondary-visualizations-single-layout" : "ranking-temporal-card"}>
    <Header title={hasStability ? "Ranking stability" : "Ranking similarity between rounds"} subtitle={hasStability ? "Observed positional range and movement across recorded phases." : "How similar the ranking order is from one round to the next."} />
    <Stack spacing={1.4} divider={groups.length > 1 ? <Box sx={{ borderTop: "1px solid rgba(83,198,214,0.16)" }} /> : null}>
      {groups.map((execution) => <Box key={execution.key} sx={{ minWidth: 0 }}>
        {executions.length > 1 ? <ExecutionLabel execution={execution} /> : null}
        {both ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.8fr) 1px minmax(240px, 1fr)" }, columnGap: { xs: 0, md: 1.4 }, rowGap: { xs: 1.2, md: 0 }, alignItems: "start" }}>
          <RankingStabilityContent execution={execution} executions={[]} />
          <Box aria-hidden="true" sx={{ display: { xs: "block", md: "none" }, gridColumn: "1 / -1", borderTop: "1px solid rgba(83,198,214,0.18)" }} />
          <Box aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, width: 1, alignSelf: "stretch", bgcolor: "rgba(83,198,214,0.18)" }} />
          <RankingAgreementContent execution={execution} executions={[]} showHeading />
        </Box> : hasStability ? <RankingStabilityContent execution={execution} executions={[]} /> : <RankingAgreementContent execution={execution} executions={[]} />}
      </Box>)}
    </Stack>
  </Box>;
};

const ExpertCollectiveRelationship = ({
  visualizations,
  scatterPlotRef,
  onResetZoom,
}) => {
  const [representation, setRepresentation] = useState("map");
  const toggleMode = Boolean(visualizations.consensus?.available);
  const showMap = !toggleMode || representation === "map";
  const scatterAvailable = visualizations.mode === "comparison"
    ? visualizations.expertCollectiveComparison?.presentation !== "unavailable"
    : visualizations.singleScatter?.available;
  const map =
    visualizations.mode === "comparison" ? (
      <ComparisonVisualization
        comparison={visualizations.expertCollectiveComparison}
        scatterPlotRef={scatterPlotRef}
      />
    ) : (
      <SingleVisualization
        visualizations={visualizations}
        scatterPlotRef={scatterPlotRef}
      />
    );
  return (
    <Box sx={cardSx}>
      <Header
        title="Expert–collective relationship"
        subtitle="Compare expert positions with the collective result."
        resettable={scatterAvailable && showMap}
        onResetZoom={onResetZoom}
        extraAction={toggleMode ? <ToggleButtonGroup color="secondary" exclusive size="small" value={representation} onChange={(_, value) => value && setRepresentation(value)} aria-label="Expert collective representation"><ToggleButton value="map">Map</ToggleButton><ToggleButton value="distances">Distances</ToggleButton></ToggleButtonGroup> : null}
      />
      {toggleMode ? (
        showMap ? map : <Box sx={expertChartFrameSx}><ProjectedExpertDistances projections={visualizations.canonicalProjections || []} phase={visualizations.phase} matchScatterHeight /></Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 1px minmax(0, 1fr)" }, columnGap: { xs: 0, md: 1.4 }, rowGap: { xs: 1.2, md: 0 }, alignItems: "start" }}>
          <Box sx={{ minWidth: 0 }}>{map}</Box>
          <Box aria-hidden="true" sx={{ display: { xs: "block", md: "none" }, borderTop: "1px solid rgba(83,198,214,0.18)" }} />
          <Box aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, width: 1, alignSelf: "stretch", bgcolor: "rgba(83,198,214,0.18)" }} />
          <Box sx={{ minWidth: 0 }}><ProjectedExpertDistances projections={visualizations.canonicalProjections || []} phase={visualizations.phase} matchScatterHeight /></Box>
        </Box>
      )}
    </Box>
  );
};

const modelVisualizationsFor = (execution) => {
  const visualizations = execution.alternativeEvaluationAnalysis?.analysis?.visualizations;
  return Array.isArray(visualizations) ? visualizations : [];
};

const AlternativeEvaluationVisualizations = ({ executions }) => {
  if (!executions.some((execution) => modelVisualizationsFor(execution).length)) return null;
  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 0.4, fontWeight: 900 }}>
        Alternative evaluation visualizations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
        Model-specific analytical views of the alternative-evaluation result.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(auto-fit, minmax(360px, 1fr))" },
          gap: 1.4,
        }}
      >
        {executions.map((execution) => {
          const visualizations = modelVisualizationsFor(execution);
          return (
            <Box key={execution.key} data-testid="alternative-evaluation-visualization-group" sx={cardSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: execution.color || "text.primary" }}>
                {execution.displayLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
                {execution.modelName || "Model unavailable"}
              </Typography>
              {visualizations.length ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                    gap: 1.4,
                    minWidth: 0,
                  }}
                >
                  {visualizations.map((descriptor, index) => (
                    <Box key={typeof descriptor?.key === "string" && descriptor.key ? descriptor.key : `${execution.key}-visualization-${index}`} sx={{ minWidth: 0 }}>
                      <AnalyticalGraph visualization={descriptor} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">
                  Alternative-evaluation visualizations are not available for this execution.
                </Alert>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const VisualizationsPanel = ({
  visualizations = {},
  executions = [],
  scatterPlotRef,
  onResetZoom,
}) => {
  const hasRankingEvolution = executionWithVisualization(
    executions,
    "rankingEvolution",
  );
  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 0.4, fontWeight: 900 }}
        >
          General visualizations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
          General analytical views of the completed decision process.
        </Typography>
        {hasRankingEvolution ? (
          <Stack spacing={1.4}>
            <RankingEvolution executions={executions} />
          </Stack>
        ) : null}
        <Box
          sx={{
            mt: 1.4,
            display: "grid",
            gridTemplateColumns: visualizations.consensus?.available
              ? { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(300px, 0.85fr)" }
              : "1fr",
            gap: 1.4,
          }}
        >
          <ExpertCollectiveRelationship
            visualizations={visualizations}
            scatterPlotRef={scatterPlotRef}
            onResetZoom={onResetZoom}
          />
          {visualizations.consensus?.enabled ? (
            <ConsensusCard consensus={visualizations.consensus} />
          ) : null}
        </Box>
        <Box sx={{ mt: 1.4 }}>
          <RankingTemporalSection executions={executions} />
        </Box>
      </Box>
      <AlternativeEvaluationVisualizations executions={executions} />
    </Stack>
  );
};

export default VisualizationsPanel;

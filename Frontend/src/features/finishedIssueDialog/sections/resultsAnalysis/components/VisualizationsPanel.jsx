import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { AnalyticalGraph } from "../../../../../components/analyticalGraphs";
import AlternativeRelationshipsVisualization, { hasAlternativeRelationshipsVisualization } from "./AlternativeRelationshipsVisualization.jsx";
import { AnalyticalScatterChart } from "../../../graphs/components/AnalyticalScatterChart";
import { ComparativeAnalyticalScatterChart } from "../../../graphs/components/ComparativeAnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../../../graphs/components/AnalyticalConsensusLineChart";
import { RESULTS_ANALYSIS_SLOT_COLORS } from "../logic/resultsAnalysisColors.js";
import RankingMovementChart from "./RankingMovementChart.jsx";
import { buildGenericRankingMovement } from "../logic/buildGenericRankingMovement.js";
import { RANKING_ALTERNATIVE_COLORS } from "../logic/rankingAlternativeColors.js";
import { buildVisualizationLayout } from "../logic/modelVisualizationLayout.js";
import { buildModelAnalysisSections, scopedEntities, visualizationsForScope } from "../logic/modelAnalysisSections.js";
import { getVisualizationReadingGuide } from "../logic/visualizationReadingGuides.js";
import { buildGeneralVisualizationsLayout } from "../logic/buildGeneralVisualizationsLayout.js";
import { buildProjectedExpertDistances } from "../logic/buildProjectedExpertDistances.js";
import { finishedIssueScrollbarSx } from "../resultsAnalysis.styles.js";
import ProjectedExpertDistances from "./ProjectedExpertDistances.jsx";
import VisualizationUnavailableState from "./VisualizationUnavailableState.jsx";
import VisualizationReadingGuide from "./VisualizationReadingGuide.jsx";

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
  maxWidth: 1100,
  mx: "auto",
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
  if (reason === "duplicate_expert_identity")
    return "The frozen execution does not contain unique expert identities for this projection.";
  if (reason === "missing_frozen_numeric_evidence")
    return "The stored execution does not contain the frozen numeric evaluations needed to rebuild this projection.";
  if (reason === "invalid_frozen_numeric_evidence")
    return "The frozen execution evaluations are incomplete or invalid, so no projection was generated.";
  if (reason === "incompatible_matrix_dimensions")
    return "The expert evaluation matrices have incompatible dimensions, so no projection was generated.";
  if (reason === "invalid_normalization_domains")
    return "The criteria do not contain valid numeric domains for a comparable projection.";
  if (reason === "values_outside_normalization_domain")
    return "An expert evaluation is outside its frozen numeric domain, so no projection was generated.";
  if (reason === "non_finite_input" || reason === "invalid_matrix_values")
    return "The expert evaluation matrices contain invalid numeric values, so no projection was generated.";
  return "No stored expert–collective analytical projection is available for this execution.";
};

const EXPERT_COLLECTIVE_MAP_GUIDE = "Each marker shows an expert or the collective result in a simplified 2D projection. Overlapping markers are grouped for identification; a shared projected position alone does not establish identical original evaluations.";
const EXPERT_COLLECTIVE_DISTANCES_GUIDE = "Each bar measures the distance from one expert's point to the collective point in the stored 2D projection. These projected distances describe positions in the display, not direct measures of agreement between experts.";
const RANKING_STABILITY_GUIDE = getVisualizationReadingGuide({ type: "rankingStability" });
const RANKING_AGREEMENT_GUIDE = getVisualizationReadingGuide({ type: "rankingAgreement" });
const finitePoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);

const renderableDistanceProjections = (projections) =>
  (Array.isArray(projections) ? projections : []).filter(
    (projection) => buildProjectedExpertDistances(projection).length > 0,
  );

const hasRenderableExpertCollectiveMap = (visualizations) => {
  if (visualizations?.mode !== "comparison")
    return visualizations?.singleScatter?.available === true;
  const comparison = visualizations.expertCollectiveComparison;
  if (comparison?.available !== true) return false;
  if (comparison.presentation === "shared")
    return Boolean(comparison.sharedProjection);
  if (comparison.presentation === "aligned-overlay")
    return Array.isArray(comparison.alignedExecutions) && comparison.alignedExecutions.length > 0;
  return comparison.presentation === "separate" &&
    Array.isArray(comparison.separateExecutions) && comparison.separateExecutions.length > 0;
};

const representedExpertCount = (visualizations) => {
  const projections = visualizations?.mode === "single"
    ? [visualizations.singleScatter?.data?.[visualizations.singleScatter?.sourcePhase]]
    : (Array.isArray(visualizations?.canonicalProjections)
      ? visualizations.canonicalProjections.filter((projection) => projection?.available === true)
      : []);
  const identities = new Set();
  let largestProjection = 0;
  projections.forEach((projection, projectionIndex) => {
    const points = (Array.isArray(projection?.expertPoints) ? projection.expertPoints : []).filter(finitePoint);
    largestProjection = Math.max(largestProjection, points.length);
    points.forEach((point, pointIndex) => {
      identities.add(point.identity || point.email || point.label || `${projectionIndex}:${pointIndex}`);
    });
  });
  return Math.max(identities.size, largestProjection);
};

const Header = ({ title, subtitle, extraAction }) => (
  <Stack
    direction={extraAction ? { xs: "column", md: "row" } : "row"}
    justifyContent="space-between"
    spacing={1}
    alignItems={extraAction ? { xs: "stretch", md: "flex-start" } : "flex-start"}
    sx={{ mb: 1.25 }}
  >
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <AnalyticsIcon fontSize="small" color="secondary" />
      <Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {subtitle ? <Typography component="p" data-testid="visualization-reading-guide" variant="body2" color="text.secondary">{subtitle}</Typography> : null}
      </Box>
    </Stack>
    <Stack direction="row" spacing={0.8} alignItems="center" sx={extraAction ? { alignSelf: { xs: "flex-end", md: "auto" } } : undefined}>
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
  <Box sx={cardSx} data-testid="consensus-level-visualization">
    <Header title="Consensus evolution" subtitle="Each line follows consensus across phases from left to right. The vertical scale runs from 0% to 100%: higher values mean more agreement, while a rise or fall shows agreement increasing or decreasing." />
    {consensus.available ? (
      <Box sx={chartFrameSx}>
        <AnalyticalConsensusLineChart data={consensus.graph} />
      </Box>
    ) : (
      <VisualizationUnavailableState
        minHeight={140}
        description="This execution does not expose the phase data required for a meaningful consensus chart."
      />
    )}
  </Box>
);

const SingleVisualization = ({ visualizations }) => {
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
                color={RESULTS_ANALYSIS_SLOT_COLORS[0]}
              />
            </Box>
          ) : (
            <VisualizationUnavailableState
              description={unavailableMessage(scatter?.unavailableReason)}
            />
          )}
        </Box>
      </Box>
    </Stack>
  );
};

const ComparisonVisualization = ({ comparison }) => {
  if (comparison.presentation === "unavailable") {
    const unavailableReason = comparison.unavailableExecutions?.find(
      (execution) => execution.unavailableReason,
    )?.unavailableReason;
    return (
      <Box sx={{ minWidth: 0 }}>
        <VisualizationUnavailableState
          description={unavailableReason ? unavailableMessage(unavailableReason) : comparison.footerMessage}
        />
      </Box>
    );
  }
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
      subtitle="Each colored line follows one alternative across phases from left to right. The vertical position is its rank: 1 is best, so moving toward a smaller number means it rose in the ranking and a larger number means it fell."
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
              <VisualizationUnavailableState minHeight={150} />
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

const RankingStabilityContent = ({ execution, executions, showHeading = false }) => {
  const visualization = visualizationFor(execution, "rankingStability");
  return <Box data-testid="ranking-stability" sx={{ minWidth: 0 }}>
    {showHeading ? <Box sx={{ mb: 1 }}><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{RANKING_STABILITY_GUIDE.title}</Typography><VisualizationReadingGuide>{RANKING_STABILITY_GUIDE.text}</VisualizationReadingGuide></Box> : null}
    <ExecutionLabel execution={execution} visible={executions.length > 1} />
    {visualization ? <RankingStabilityChart visualization={visualization} /> : <VisualizationUnavailableState minHeight={130} />}
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
    {showHeading ? <Box sx={{ mb: 1 }}><Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{RANKING_AGREEMENT_GUIDE.title}</Typography><VisualizationReadingGuide>{RANKING_AGREEMENT_GUIDE.text}</VisualizationReadingGuide></Box> : null}
    <ExecutionLabel execution={execution} visible={executions.length > 1} />
    {visualization ? <RankingAgreementChart visualization={visualization} color={execution.color || "#27d5e4"} /> : <VisualizationUnavailableState minHeight={130} />}
  </Box>;
};

const RankingTemporalSection = ({ executions }) => {
  const hasStability = executionWithVisualization(executions, "rankingStability");
  const hasAgreement = executionWithVisualization(executions, "rankingAgreement");
  if (!hasStability && !hasAgreement) return null;
  const both = hasStability && hasAgreement;
  const groups = executions;
  const onlyGuide = hasStability ? RANKING_STABILITY_GUIDE : RANKING_AGREEMENT_GUIDE;
  return <Box sx={cardSx} data-testid={executions.length === 1 ? "secondary-visualizations-single-layout" : "ranking-temporal-card"}>
    <Header title={both ? "Ranking history" : onlyGuide.title} subtitle={both ? null : onlyGuide.text} />
    <Stack spacing={1.4} divider={groups.length > 1 ? <Box sx={{ borderTop: "1px solid rgba(83,198,214,0.16)" }} /> : null}>
      {groups.map((execution) => <Box key={execution.key} sx={{ minWidth: 0 }}>
        {executions.length > 1 ? <ExecutionLabel execution={execution} /> : null}
        {both ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.8fr) 1px minmax(240px, 1fr)" }, columnGap: { xs: 0, md: 1.4 }, rowGap: { xs: 1.2, md: 0 }, alignItems: "start" }}>
          <RankingStabilityContent execution={execution} executions={[]} showHeading />
          <Box aria-hidden="true" sx={{ display: { xs: "block", md: "none" }, gridColumn: "1 / -1", borderTop: "1px solid rgba(83,198,214,0.18)" }} />
          <Box aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, width: 1, alignSelf: "stretch", bgcolor: "rgba(83,198,214,0.18)" }} />
          <RankingAgreementContent execution={execution} executions={[]} showHeading />
        </Box> : hasStability ? <RankingStabilityContent execution={execution} executions={[]} /> : <RankingAgreementContent execution={execution} executions={[]} />}
      </Box>)}
    </Stack>
  </Box>;
};

const ExpertCollectiveRelationship = ({ visualizations }) => {
  const [representation, setRepresentation] = useState("map");
  const mapAvailable = hasRenderableExpertCollectiveMap(visualizations);
  const distanceProjections = renderableDistanceProjections(visualizations.canonicalProjections);
  const distancesAvailable = distanceProjections.length > 0;
  const hasMultipleExperts = representedExpertCount(visualizations) > 1;
  const toggleMode = hasMultipleExperts && mapAvailable && distancesAvailable;
  const selectedRepresentation = toggleMode
    ? representation
    : mapAvailable
      ? "map"
      : distancesAvailable
        ? "distances"
        : "map";
  const showMap = selectedRepresentation === "map";
  const relationshipGuide = showMap ? EXPERT_COLLECTIVE_MAP_GUIDE : EXPERT_COLLECTIVE_DISTANCES_GUIDE;
  const map =
    visualizations.mode === "comparison" ? (
      <ComparisonVisualization
        comparison={visualizations.expertCollectiveComparison}
      />
    ) : (
      <SingleVisualization
        visualizations={visualizations}
      />
    );
  return (
    <Box sx={cardSx} data-testid="expert-collective-relationship">
      <Header
        title="Expert–collective relationship"
        subtitle={relationshipGuide}
        extraAction={toggleMode ? <ToggleButtonGroup color="secondary" exclusive size="small" value={representation} onChange={(_, value) => value && setRepresentation(value)} aria-label="Expert collective representation"><ToggleButton value="map">MAP</ToggleButton><ToggleButton value="distances">DISTANCES</ToggleButton></ToggleButtonGroup> : null}
      />
      <Box data-testid="expert-collective-selected-view" data-view={selectedRepresentation} sx={{ width: "100%", minWidth: 0 }}>
        {showMap
          ? map
          : <Box sx={expertChartFrameSx}><ProjectedExpertDistances projections={distanceProjections} phase={visualizations.phase} matchScatterHeight /></Box>}
      </Box>
    </Box>
  );
};

const VisualizationPane = ({ descriptor, execution, index, compactTitle }) => {
  const { chartHeight, chartMinWidth } = buildVisualizationLayout([descriptor])[0];
  return <Box key={typeof descriptor?.key === "string" && descriptor.key ? descriptor.key : `${execution.key}-visualization-${index}`} data-testid="alternative-evaluation-visualization-pane" sx={{ minWidth: 0, width: "100%" }}>
    <AnalyticalGraph visualization={descriptor} chartHeight={chartHeight} chartMinWidth={chartMinWidth} titleVariant={compactTitle ? "subtitle1" : "h6"} />
  </Box>;
};

const SectionPanes = ({ visualizations, execution, stacked = false, leadFullWidth = false, compactTitles = false, forceFullWidth = false }) => {
  const layouts = buildVisualizationLayout(visualizations);
  const rows = [];
  for (let index = 0; index < layouts.length; index += 1) {
    const current = layouts[index];
    const next = layouts[index + 1];
    if (leadFullWidth && index === 0) rows.push([current]);
    else if (leadFullWidth && !forceFullWidth && !stacked && next) {
      rows.push([current, next]);
      index += 1;
    } else if (!forceFullWidth && !stacked && current.span === 1 && next?.span === 1) {
      rows.push([current, next]);
      index += 1;
    } else rows.push([current]);
  }
  return <Stack spacing={1.4}>{rows.map((row, rowIndex) => row.length === 2 ? <Box key={rowIndex} data-testid="semantic-section-pane-row" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 1px minmax(0, 1fr)" }, columnGap: { xs: 0, md: 1.4 }, rowGap: 1.2, minWidth: 0 }}>
    <VisualizationPane descriptor={row[0].visualization} execution={execution} index={rowIndex * 2} compactTitle={compactTitles} />
    <Box data-testid="semantic-section-pane-divider" aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, width: 1, alignSelf: "stretch", bgcolor: "rgba(83,198,214,0.18)" }} />
    <VisualizationPane descriptor={row[1].visualization} execution={execution} index={rowIndex * 2 + 1} compactTitle={compactTitles} />
  </Box> : <Box key={rowIndex} data-testid="semantic-section-pane-row" sx={{ minWidth: 0, width: "100%" }}><VisualizationPane descriptor={row[0].visualization} execution={execution} index={rowIndex} compactTitle={compactTitles} /></Box>)}</Stack>;
};

const SemanticSection = ({ section }) => {
  const entities = scopedEntities(section);
  const selectable = entities.length > 3;
  const [selectedScopeKey, setSelectedScopeKey] = useState(selectable ? `${entities[0].dimension}:${entities[0].id}` : null);
  const selectedEntity = entities.find((entity) => `${entity.dimension}:${entity.id}` === selectedScopeKey) || null;
  const visibleEntries = section.executions.map((entry) => ({ ...entry, visualizations: visualizationsForScope(entry.visualizations, selectedEntity) }));
  const isSingleton = visibleEntries.length === 1 && visibleEntries[0].visualizations.length === 1;
  const stacked = section.presentation?.layout === "stacked";
  const leadFullWidth = section.presentation?.layout === "lead-full-width";
  const scenarioColumns = visibleEntries.map(() => "minmax(360px, 1fr)").join(" 1px ");
  return <Box data-testid="model-analysis-semantic-section" sx={cardSx}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: isSingleton ? 0 : 1.4 }}>
      {!isSingleton ? <Box><Typography variant="h6" component="h3" sx={{ fontWeight: 900 }}>{section.title}</Typography></Box> : null}
      {selectable ? <FormControl size="small" color="secondary" sx={{ minWidth: 190 }}><InputLabel id={`${section.id}-scope-label`}>{selectedEntity?.dimension || "Entity"}</InputLabel><Select labelId={`${section.id}-scope-label`} label={selectedEntity?.dimension || "Entity"} value={selectedScopeKey || ""} onChange={(event) => setSelectedScopeKey(event.target.value)}>{entities.map((entity) => <MenuItem key={`${entity.dimension}:${entity.id}`} value={`${entity.dimension}:${entity.id}`}>{entity.label}</MenuItem>)}</Select></FormControl> : null}
    </Stack>
    <Box sx={{ ...finishedIssueScrollbarSx, overflowX: visibleEntries.length > 2 ? "auto" : "visible", overflowY: "hidden" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: visibleEntries.length > 1 ? scenarioColumns : "minmax(0, 1fr)" }, columnGap: { xs: 0, md: 1.4 }, rowGap: 1.4, minWidth: visibleEntries.length > 2 ? `${visibleEntries.length * 360}px` : 0 }}>
        {visibleEntries.flatMap((entry, index) => [
          <Box key={entry.execution.key} data-testid="semantic-section-scenario" sx={{ minWidth: 0 }}>{visibleEntries.length > 1 ? <Typography variant="subtitle1" sx={{ mb: 1, color: entry.execution.color, fontWeight: 900 }}>{entry.execution.displayLabel}</Typography> : null}{entry.visualizations.length ? <SectionPanes visualizations={entry.visualizations} execution={entry.execution} stacked={stacked} leadFullWidth={leadFullWidth} compactTitles={!isSingleton} forceFullWidth={visibleEntries.length > 1} /> : <VisualizationUnavailableState minHeight={150} />}</Box>,
          ...(index < visibleEntries.length - 1 ? [<Box key={`${entry.execution.key}-divider`} data-testid="semantic-section-scenario-divider" aria-hidden="true" sx={{ display: { xs: "none", md: "block" }, width: 1, bgcolor: "rgba(83,198,214,0.22)" }} />] : []),
        ])}
      </Box>
    </Box>
  </Box>;
};

const MODEL_ANALYSIS_STAGES = [
  { key: "criteriaWeighting", title: "Criterion weighting visualizations", description: "Model-specific analytical views of the criterion-weighting result." },
  { key: "alternativeEvaluation", title: "Alternative evaluation visualizations", description: "Model-specific analytical views of the alternative-evaluation result." },
];

const StageVisualizations = ({ executions, stage }) => {
  const sections = buildModelAnalysisSections(executions, stage.key);
  if (!sections.length) return null;
  return <Box><Typography variant="h5" component="h2" sx={{ mb: 0.4, fontWeight: 900 }}>{stage.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>{stage.description}</Typography><Stack spacing={1.4}>{sections.map((section) => <SemanticSection key={section.id} section={section} />)}</Stack></Box>;
};

const VisualizationsPanel = ({ visualizations = {}, executions = [], categoricalComparisons = [] }) => {
  const hasRankingEvolution = executionWithVisualization(
    executions,
    "rankingEvolution",
  );
  const sortingProjectionUnavailable = executions.some(
    (execution) => execution?.resultStructureKey === "sorting" &&
      execution?.genericAnalysis?.facts?.expertCollectiveRelationship?.unavailableReason,
  );
  const expertCollectiveAvailable = hasRenderableExpertCollectiveMap(visualizations) ||
    renderableDistanceProjections(visualizations.canonicalProjections).length > 0 ||
    sortingProjectionUnavailable;
  const consensusIssueEnabled = visualizations.consensus?.issueEnabled === true;
  const consensusAvailable = consensusIssueEnabled && visualizations.consensus?.available === true;
  const alternativeRelationshipsAvailable =
    hasAlternativeRelationshipsVisualization(executions);
  const generalLayout = buildGeneralVisualizationsLayout({
    expertCollectiveAvailable,
    issueConsensusEnabled: consensusIssueEnabled,
    consensusAvailable,
    alternativeRelationshipsAvailable,
  });

  const renderGeneralVisualization = (type) => {
    if (type === "expertCollective") {
      return <ExpertCollectiveRelationship key={type} visualizations={visualizations} />;
    }
    if (type === "consensus") {
      return <ConsensusCard key={type} consensus={visualizations.consensus} />;
    }
    if (type === "alternativeRelationships") {
      return <AlternativeRelationshipsVisualization key={type} executions={executions} categoricalComparisons={categoricalComparisons} />;
    }
    return null;
  };

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
        {generalLayout.primaryRow.length ? (
          <Box
            data-testid="general-visualization-primary-row"
            data-consensus-layout={generalLayout.issueConsensusEnabled ? "enabled" : "disabled"}
            sx={{
              mt: 1.4,
              display: "grid",
              gridTemplateColumns: generalLayout.primaryGridTemplateColumns,
              gap: 1.4,
              minWidth: 0,
              alignItems: "start",
            }}
          >
            {generalLayout.primaryRow.map(renderGeneralVisualization)}
          </Box>
        ) : null}
        {generalLayout.alternativeRelationshipsBelow ? (
          <Box data-testid="alternative-relationships-secondary-row" sx={{ mt: 1.4, minWidth: 0 }}>
            {renderGeneralVisualization("alternativeRelationships")}
          </Box>
        ) : null}
        <Box sx={{ mt: 1.4 }}>
          <RankingTemporalSection executions={executions} />
        </Box>
      </Box>
      {MODEL_ANALYSIS_STAGES.map((stage) => <StageVisualizations key={stage.key} executions={executions} stage={stage} />)}
    </Stack>
  );
};

export default VisualizationsPanel;

import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import ScienceIcon from "@mui/icons-material/Science";

import { SectionCard } from "../components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { buildFinishedIssueOverviewData } from "../logic/buildFinishedIssueOverviewData";
import { FINISHED_ISSUE_VIEWS } from "../logic/finishedIssueNavigation";
import { AnalyticalScatterChart } from "../graphs/components/AnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../graphs/components/AnalyticalConsensusLineChart";

const OverviewAction = ({ label, view }) => {
  const { navigation } = useFinishedIssueDialogContext();

  return (
    <Button
      variant="outlined"
      color="secondary"
      size="small"
      onClick={() => navigation.setActiveView(view)}
      sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
    >
      {label}
    </Button>
  );
};

const OverviewCard = ({ title, icon, actionLabel, actionView, children }) => (
  <SectionCard title={title} icon={icon} sx={{ height: "100%" }}>
    <Stack
      spacing={1}
      sx={{ minHeight: { xs: 0, md: 240 }, height: "100%" }}
    >
      <Box>{children}</Box>
      <Box sx={{ mt: "auto", pt: 1 }}>
        <OverviewAction label={actionLabel} view={actionView} />
      </Box>
    </Stack>
  </SectionCard>
);

const MetaText = ({ children }) => (
  <Typography variant="caption" color="text.secondary">
    {children}
  </Typography>
);

const FinishedIssueOverview = () => {
  const { dialog, rankingSection, ratingsSection, header } =
    useFinishedIssueDialogContext();
  const viewIssue = dialog.viewIssue;
  const data = buildFinishedIssueOverviewData({
    viewIssue, ranking: rankingSection.ranking, formatScore: rankingSection.formatScore,
    currentPhaseLabel: header.currentPhaseLabel, currentPhaseIndex: header.currentPhaseIndex,
    expertList: ratingsSection.expertList, evaluationStructure: ratingsSection.evaluationStructure,
    canShowCollective: ratingsSection.canShowCollective,
    criteriaWeightsPayload: ratingsSection.criteriaWeightsEvaluation,
    selectedModelName: header.selectedModelNameView, selectedRunKey: header.selectedRunKey,
    selectedRunLabel: header.selectedRunLabel, runs: header.runs, roundsCount: header.roundsCount,
  });
  const { issue, results, evaluations, graphs, models, consensus } = data;
  const alternatives = Array.from({ length: issue.alternativesCount });
  const criteria = Array.from({ length: issue.criteriaCount });
  const ranking = results.items;
  const consensusInfo = consensus;
  const graphAvailability = graphs;
  const compactScatterData = graphs.performanceMapData;
  const evaluationCount = evaluations.expertsCount;
  const participatingExperts = issue.participatingExpertsCount;
  const summary = {
    description: issue.description,
    creationDate: issue.creationDate,
    closureDate: issue.closureDate,
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "none" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <OverviewCard
          title="Issue overview"
          icon={<AssignmentTurnedInIcon fontSize="small" />}
          actionLabel="View more"
          actionView={FINISHED_ISSUE_VIEWS.ISSUE_DETAILS}
        >
          <Stack spacing={0.8}>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-line",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {summary.description || "—"}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <MetaText>Created: {summary.creationDate || "—"}</MetaText>
              {summary.closureDate ? <MetaText>Closed: {summary.closureDate}</MetaText> : null}
            </Stack>
            <MetaText>
              {alternatives.length} alternatives · {criteria.length} criteria · {participatingExperts} participating experts
            </MetaText>
          </Stack>
        </OverviewCard>

        <OverviewCard
          title="Models & runs"
          icon={<ScienceIcon fontSize="small" />}
          actionLabel="View models"
          actionView={FINISHED_ISSUE_VIEWS.MODELS}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2">Base model: {models.baseModelName}</Typography>
            <MetaText>Selected execution: {models.selectedExecutionLabel}</MetaText>
            <MetaText>Additional runs: {models.additionalRunsCount}</MetaText>
          </Stack>
        </OverviewCard>

        <OverviewCard
          title="Results summary"
          icon={<AssessmentIcon fontSize="small" />}
          actionLabel="View full ranking"
          actionView={FINISHED_ISSUE_VIEWS.RESULTS}
        >
          {ranking.length ? (
            <Stack spacing={0.6}>
              {ranking.slice(0, 3).map((item, index) => (
                <Stack
                  key={item?.id || item?.name || index}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography variant="body2" noWrap sx={{ fontWeight: 850, minWidth: 0 }}>
                    {index + 1}. {item?.name || "—"}
                  </Typography>
                  {item?.score !== undefined ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={index === 0 ? "success" : "secondary"}
                      label={rankingSection.formatScore(item.score)}
                    />
                  ) : null}
                </Stack>
              ))}
              <MetaText>{header.currentPhaseLabel}</MetaText>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No ranking output is available for this execution.
            </Typography>
          )}
        </OverviewCard>

        <OverviewCard
          title="Results analysis"
          icon={<InsightsIcon fontSize="small" />}
          actionLabel="View analysis"
          actionView={FINISHED_ISSUE_VIEWS.ANALYSIS}
        >
          <Stack spacing={0.5}>
            {graphAvailability.hasPerformanceMap && compactScatterData ? (
              <Box sx={{ height: 165, mb: 0.5 }}>
                <AnalyticalScatterChart
                  data={compactScatterData}
                  phase={compactScatterData.length === 1 ? 0 : header.currentPhaseIndex}
                  compact
                />
              </Box>
            ) : null}
            {!graphAvailability.hasPerformanceMap && graphAvailability.hasConsensusEvolution ? (
              <Box sx={{ height: 165, mb: 0.5 }}>
                <AnalyticalConsensusLineChart
                  data={viewIssue?.analyticalGraphs?.consensusLevelLineChart}
                  compact
                />
              </Box>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Results analysis is not available yet.
            </Typography>
            <MetaText>
              Natural-language interpretation will appear here when analysis generation is enabled.
            </MetaText>
          </Stack>
        </OverviewCard>

        <OverviewCard
          title="Evaluations"
          icon={<PeopleAltIcon fontSize="small" />}
          actionLabel="View evaluations"
          actionView={FINISHED_ISSUE_VIEWS.EVALUATIONS}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2">Experts with evaluations: {evaluationCount}</Typography>
            <MetaText>Selected phase: {header.currentPhaseLabel}</MetaText>
            {ratingsSection.evaluationStructure ? (
              <MetaText>Structure: {ratingsSection.evaluationStructure}</MetaText>
            ) : null}
            {ratingsSection.canShowCollective ? <MetaText>Collective evaluation available</MetaText> : null}
          </Stack>
        </OverviewCard>

        {consensusInfo ? (
          <OverviewCard
            title="Consensus"
            icon={<GroupsIcon fontSize="small" />}
            actionLabel="View all rounds"
            actionView={FINISHED_ISSUE_VIEWS.CONSENSUS}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2">{header.roundsCount} phases · {header.currentPhaseLabel}</Typography>
              {consensusInfo.threshold !== undefined ? <MetaText>Threshold: {consensusInfo.threshold}</MetaText> : null}
              {consensusInfo.finalConsensusMeasure !== undefined ? <MetaText>Final measure: {consensusInfo.finalConsensusMeasure}</MetaText> : null}
              {consensusInfo.finalizationReason ? <MetaText>Reason: {consensusInfo.finalizationReason}</MetaText> : null}
            </Stack>
          </OverviewCard>
        ) : null}

        <OverviewCard
          title="Analytical graphs"
          icon={<QueryStatsIcon fontSize="small" />}
          actionLabel="View all graphs"
          actionView={FINISHED_ISSUE_VIEWS.GRAPHS}
        >
          <Stack spacing={0.5}>
            {graphAvailability.hasPerformanceMap ? <Typography variant="body2">Performance map available</Typography> : null}
            {graphAvailability.hasConsensusEvolution ? <Typography variant="body2">Consensus evolution available</Typography> : null}
            {!graphAvailability.hasPerformanceMap && !graphAvailability.hasConsensusEvolution ? (
              <Typography variant="body2" color="text.secondary">No analytical graph data available.</Typography>
            ) : null}
          </Stack>
        </OverviewCard>
      </Box>
    </Box>
  );
};

export default FinishedIssueOverview;

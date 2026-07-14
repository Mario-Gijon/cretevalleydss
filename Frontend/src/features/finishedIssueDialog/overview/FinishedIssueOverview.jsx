import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";

import { SectionCard } from "../components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { getFinishedIssueGraphAvailability } from "../logic/buildFinishedIssueGraphs";
import { FINISHED_ISSUE_VIEWS } from "../logic/finishedIssueNavigation";

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
      sx={{ minHeight: { xs: 0, md: 188 }, height: "100%" }}
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
  const summary = viewIssue?.summary || {};
  const alternatives = Array.isArray(summary.alternatives) ? summary.alternatives : [];
  const criteria = Array.isArray(summary.criteria) ? summary.criteria : [];
  const ranking = Array.isArray(rankingSection.ranking) ? rankingSection.ranking : [];
  const consensusInfo = summary.consensusInfo || null;
  const graphAvailability = getFinishedIssueGraphAvailability(viewIssue);
  const evaluationCount = Array.isArray(ratingsSection.expertList)
    ? ratingsSection.expertList.length
    : 0;
  const participatingExperts = Array.isArray(summary.experts?.participated)
    ? summary.experts.participated.length
    : 0;

  return (
    <Box sx={{ width: "100%", maxWidth: 1600, mx: "auto" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          "@media (min-width: 2300px)": {
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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

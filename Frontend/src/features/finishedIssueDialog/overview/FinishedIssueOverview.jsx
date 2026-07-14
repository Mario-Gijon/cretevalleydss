import { Box, Button, Stack, Typography } from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import InsightsIcon from "@mui/icons-material/Insights";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import GroupsIcon from "@mui/icons-material/Groups";

import { SectionCard } from "../components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../logic/finishedIssueNavigation";

const OverviewAction = ({ label, view }) => {
  const { navigation } = useFinishedIssueDialogContext();
  return <Button size="small" color="secondary" onClick={() => navigation.setActiveView(view)}>{label}</Button>;
};

const FinishedIssueOverview = () => {
  const { dialog, rankingSection, ratingsSection, graphsSection, header } =
    useFinishedIssueDialogContext();
  const summary = dialog.viewIssue?.summary || {};
  const alternatives = Array.isArray(summary.alternatives) ? summary.alternatives : [];
  const criteria = Array.isArray(summary.criteria) ? summary.criteria : [];
  const ranking = Array.isArray(rankingSection.ranking) ? rankingSection.ranking : [];
  const consensusInfo = summary.consensusInfo || null;
  const hasGraphs = Boolean(
    graphsSection.viewIssue?.analyticalGraphs?.scatterPlot ||
    graphsSection.viewIssue?.analyticalGraphs?.consensusLevelLineChart?.data?.length > 1
  );
  const evaluationCount = Array.isArray(ratingsSection.expertList)
    ? ratingsSection.expertList.length
    : 0;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
      <SectionCard title="Issue overview" icon={<AssignmentTurnedInIcon fontSize="small" />} right={<OverviewAction label="View more" view={FINISHED_ISSUE_VIEWS.ISSUE_DETAILS} />}>
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{summary.description || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">Created: {summary.creationDate || "—"}</Typography>
          {summary.closureDate ? <Typography variant="caption" color="text.secondary">Closed: {summary.closureDate}</Typography> : null}
          <Typography variant="caption" color="text.secondary">{alternatives.length} alternatives · {criteria.length} criteria · {(summary.experts?.participated || []).length} participating experts</Typography>
        </Stack>
      </SectionCard>

      <SectionCard title="Results summary" icon={<AssessmentIcon fontSize="small" />} right={<OverviewAction label="View full ranking" view={FINISHED_ISSUE_VIEWS.RESULTS} />}>
        {ranking.length ? <Stack spacing={0.65}>{ranking.slice(0, 3).map((item, index) => <Typography key={item?.id || item?.name || index} variant="body2"><strong>{index + 1}. {item?.name || "—"}</strong>{item?.score !== undefined ? ` — ${rankingSection.formatScore(item.score)}` : ""}</Typography>)}<Typography variant="caption" color="text.secondary">{header.currentPhaseLabel}</Typography></Stack> : <Typography variant="body2" color="text.secondary">No ranking output is available for this execution.</Typography>}
      </SectionCard>

      <SectionCard title="Results analysis" icon={<InsightsIcon fontSize="small" />} right={<OverviewAction label="View analysis" view={FINISHED_ISSUE_VIEWS.ANALYSIS} />}>
        <Typography variant="body2" color="text.secondary">Results analysis is not available yet.</Typography>
        <Typography variant="caption" color="text.secondary">Natural-language interpretation will appear here when analysis generation is enabled.</Typography>
      </SectionCard>

      <SectionCard title="Evaluations" icon={<PeopleAltIcon fontSize="small" />} right={<OverviewAction label="View evaluations" view={FINISHED_ISSUE_VIEWS.EVALUATIONS} />}>
        <Stack spacing={0.5}><Typography variant="body2">Experts with evaluations: {evaluationCount}</Typography><Typography variant="caption" color="text.secondary">Selected phase: {header.currentPhaseLabel}</Typography>{ratingsSection.evaluationStructure ? <Typography variant="caption" color="text.secondary">Structure: {ratingsSection.evaluationStructure}</Typography> : null}</Stack>
      </SectionCard>

      {consensusInfo ? <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />} right={<OverviewAction label="View all rounds" view={FINISHED_ISSUE_VIEWS.CONSENSUS} />}>
        <Stack spacing={0.5}><Typography variant="body2">{header.roundsCount} phases · {header.currentPhaseLabel}</Typography>{consensusInfo.threshold !== undefined ? <Typography variant="caption" color="text.secondary">Threshold: {consensusInfo.threshold}</Typography> : null}{consensusInfo.finalConsensusMeasure !== undefined ? <Typography variant="caption" color="text.secondary">Final measure: {consensusInfo.finalConsensusMeasure}</Typography> : null}</Stack>
      </SectionCard> : null}

      <SectionCard title="Analytical graphs" icon={<QueryStatsIcon fontSize="small" />} right={<OverviewAction label="View all graphs" view={FINISHED_ISSUE_VIEWS.GRAPHS} />}>
        <Typography variant="body2" color="text.secondary">{hasGraphs ? "Analytical graph data available." : "No analytical graph data available."}</Typography>
      </SectionCard>
    </Box>
  );
};

export default FinishedIssueOverview;

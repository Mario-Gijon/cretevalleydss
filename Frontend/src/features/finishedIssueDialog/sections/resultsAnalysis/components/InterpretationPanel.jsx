import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import { getFinishedIssueGlobalAnalysis } from "../../../../../services/issue.service.js";
import { useFinishedIssueDialogContext } from "../../../context/finishedIssueDialog.context";
import { formatFinishedIssuePhaseLabel } from "../../../logic/formatFinishedIssuePhaseLabel.js";
import RankingMovementChart from "./RankingMovementChart.jsx";
import { comparisonDetailPanelSx } from "../resultsAnalysis.styles.js";

const unwrap = (response) => response && typeof response === "object" && "data" in response ? response.data : response;

const Markdown = ({ value }) => <Stack spacing={1}>{String(value || "").split("\n\n").filter(Boolean).map((block, index) => {
  const lines = block.split("\n");
  if (lines[0].startsWith("### ")) return <Box key={index}><Typography component="h3" sx={{ fontSize: 16, fontWeight: 900 }}>{lines[0].slice(4)}</Typography>{lines.slice(1).map((line, lineIndex) => <Typography key={lineIndex} variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>{line.replaceAll("**", "")}</Typography>)}</Box>;
  return <Typography key={index} variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>{block.replaceAll("**", "")}</Typography>;
})}</Stack>;

const buildMovement = (visualization) => {
  const data = visualization?.data;
  const phases = Array.isArray(data?.phases) ? data.phases : [];
  const series = Array.isArray(data?.series) ? data.series : [];
  const executions = phases.map((phase) => ({ key: String(phase), label: formatFinishedIssuePhaseLabel({ phase, orderedPhases: phases }) }));
  const alternatives = series.map((entry) => ({ id: entry.alternativeId, name: entry.label || entry.alternativeId, positions: (entry.values || []).map((position) => ({ position })) }));
  const maxPosition = Math.max(1, ...alternatives.flatMap((entry) => entry.positions.map((position) => position.position || 0)));
  return { available: executions.length > 0 && alternatives.length > 0, reason: "Ranking evolution is not available.", executions, alternatives, maxPosition };
};

const InterpretationPanel = () => {
  const { selectedIssue } = useFinishedIssueDialogContext();
  const issueId = selectedIssue?.id || selectedIssue?._id;
  const [state, setState] = useState({ loading: false, data: null, error: null });
  useEffect(() => {
    if (!issueId) return undefined;
    let active = true;
    setState({ loading: true, data: null, error: null });
    getFinishedIssueGlobalAnalysis(issueId).then((response) => active && setState({ loading: false, data: unwrap(response), error: null })).catch((error) => active && setState({ loading: false, data: null, error }));
    return () => { active = false; };
  }, [issueId]);
  const rankingEvolution = useMemo(() => state.data?.visualizations?.find((entry) => entry.type === "rankingEvolution"), [state.data]);
  if (state.loading) return <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (state.error) return <Alert severity="error">Generic interpretation could not be loaded. Please try again later.</Alert>;
  if (!state.data) return <Alert severity="info">Generic interpretation is not available for this finished issue.</Alert>;
  return <Stack spacing={1.4}>
    {rankingEvolution ? <RankingMovementChart movement={buildMovement(rankingEvolution)} title="Ranking evolution" subtitle="Position changes across consensus phases." /> : null}
    {state.data.interpretation ? <Box sx={comparisonDetailPanelSx}><Markdown value={state.data.interpretation} /></Box> : <Alert severity="info">No generic interpretation was returned.</Alert>}
  </Stack>;
};

export default InterpretationPanel;

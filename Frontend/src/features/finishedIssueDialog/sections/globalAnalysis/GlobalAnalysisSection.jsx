import { useEffect, useRef, useState } from "react";
import { Alert, Box, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { Chart } from "chart.js/auto";

import { getFinishedIssueGlobalAnalysis } from "../../../../services/issue.service.js";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { SectionCard } from "../../shared/components/FinishedIssueDialogPrimitives";

const unwrap = (response) => response && typeof response === "object" && "data" in response ? response.data : response;

const Markdown = ({ value }) => <Stack spacing={0.7}>{String(value || "").split("\n\n").filter(Boolean).map((block, index) => {
  const lines = block.split("\n");
  if (lines[0].startsWith("### ")) return <Box key={index}><Typography variant="h6">{lines[0].slice(4)}</Typography>{lines.slice(1).map((line, lineIndex) => <Typography key={lineIndex} variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{line.replaceAll("**", "")}</Typography>)}</Box>;
  return <Typography key={index} variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{block.replaceAll("**", "")}</Typography>;
})}</Stack>;

const ChartCanvas = ({ visualization }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const { type, data } = visualization;
    const chart = type === "rankingEvolution"
      ? new Chart(canvasRef.current, { type: "line", data: { labels: data.phases.map((phase) => `Phase ${phase}`), datasets: data.series.map((series, index) => ({ label: series.label, data: series.values, borderColor: `hsl(${(index * 67) % 360} 72% 62%)`, tension: 0.2 })) }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { reverse: data.lowerIsBetter === true, ticks: { precision: 0, stepSize: 1 }, title: { display: true, text: "Rank" } } } } })
      : new Chart(canvasRef.current, { type: "line", data: { labels: data.points.map((point) => `Phase ${point.phase}`), datasets: [{ label: "Consensus", data: data.points.map((point) => point.value), borderColor: "#58d6c7", tension: 0.2 }, ...(typeof data.threshold === "number" ? [{ label: "Threshold", data: data.points.map(() => data.threshold), borderColor: "#f3b34c", borderDash: [6, 4], pointRadius: 0 }] : [])] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 1 } } } });
    return () => chart.destroy();
  }, [visualization]);
  return <Box sx={{ height: 330 }}><canvas ref={canvasRef} /></Box>;
};

const GlobalAnalysisSection = () => {
  const { selectedIssue } = useFinishedIssueDialogContext();
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const issueId = selectedIssue?.id || selectedIssue?._id;
  useEffect(() => {
    if (!issueId) return undefined;
    let active = true;
    setState({ loading: true, data: null, error: null });
    getFinishedIssueGlobalAnalysis(issueId).then((response) => active && setState({ loading: false, data: unwrap(response), error: null })).catch((error) => active && setState({ loading: false, data: null, error }));
    return () => { active = false; };
  }, [issueId]);
  if (state.loading) return <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (state.error) return <Alert severity="error">Global analysis could not be loaded. Please try again later.</Alert>;
  const analysis = state.data;
  if (!analysis) return <Alert severity="info">Global analysis is not available for this finished issue.</Alert>;
  const ranking = analysis.facts?.finalRanking || [];
  const visualizations = analysis.visualizations || [];
  return <Stack spacing={1.5}>
    <SectionCard title="Global analysis"><Typography variant="body2" color="text.secondary">Model-independent evidence from the completed issue.</Typography></SectionCard>
    <SectionCard title="Final ranking">{ranking.length ? <Stack spacing={0.7}>{ranking.map((entry) => <Stack key={entry.alternativeId} direction="row" spacing={1}><Typography color="secondary">#{entry.rank}</Typography><Typography>{entry.name || entry.alternativeId}</Typography></Stack>)}</Stack> : <Typography variant="body2" color="text.secondary">No final ranking is available.</Typography>}</SectionCard>
    {analysis.interpretation ? <SectionCard title="Interpretation"><Markdown value={analysis.interpretation} /></SectionCard> : null}
    {visualizations.map((visualization) => <SectionCard key={visualization.type} title={visualization.title}>{(visualization.type === "rankingEvolution" || visualization.type === "consensusEvolution") ? <ChartCanvas visualization={visualization} /> : null}</SectionCard>)}
  </Stack>;
};

export default GlobalAnalysisSection;

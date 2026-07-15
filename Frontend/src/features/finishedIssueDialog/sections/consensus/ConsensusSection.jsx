import { Box, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";

import { SectionCard } from "../../shared/components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { AnalyticalConsensusLineChart } from "../../graphs/components/AnalyticalConsensusLineChart";
import { buildConsensusData } from "./logic/buildConsensusData.js";

const ConsensusSection = () => {
  const { dialog } = useFinishedIssueDialogContext();
  const data = buildConsensusData(dialog.payload);
  if (!data.enabled) return <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />}><Typography color="text.secondary">Consensus is not enabled for this issue.</Typography></SectionCard>;
  const graph = { labels: data.series.map((entry) => `Phase ${entry.phase}`), data: data.series.map((entry) => entry.measure) };
  return <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />}><Stack spacing={0.8}><Typography variant="body2">Available phases: {data.rounds.map((round) => round.phase).join(", ") || "—"}</Typography>{data.threshold !== null ? <Typography variant="body2">Threshold: {data.threshold}</Typography> : null}{data.reachedPhase !== null ? <Typography variant="body2">Reached phase: {data.reachedPhase}</Typography> : null}{data.finalizationReason ? <Typography variant="body2">Finalization reason: {data.finalizationReason}</Typography> : null}{graph.data.filter(Number.isFinite).length > 1 ? <Box sx={{ height: { xs: 250, md: 360 } }}><AnalyticalConsensusLineChart data={graph} /></Box> : null}</Stack></SectionCard>;
};

export default ConsensusSection;

import { Box, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";

import { SectionCard } from "../../shared/components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { AnalyticalConsensusLineChart } from "../../graphs/components/AnalyticalConsensusLineChart";
import { getFinishedIssueGraphAvailability } from "../../shared/logic/buildFinishedIssueGraphs";

const ConsensusSection = () => {
  const { dialog, header } = useFinishedIssueDialogContext();
  const consensusInfo = dialog.viewIssue?.summary?.consensusInfo;
  if (!consensusInfo) return <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />}><Typography color="text.secondary">No consensus information is available for this execution.</Typography></SectionCard>;
  const consensusEvolution = dialog.viewIssue?.analyticalGraphs?.consensusLevelLineChart;
  const { hasConsensusEvolution } = getFinishedIssueGraphAvailability(dialog.viewIssue);
  return <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />}><Stack spacing={0.8}><Typography variant="body2">Selected phase: {header.currentPhaseLabel}</Typography><Typography variant="body2">Available phases: {header.roundsCount}</Typography>{consensusInfo.threshold !== undefined ? <Typography variant="body2">Threshold: {consensusInfo.threshold}</Typography> : null}{consensusInfo.finalConsensusMeasure !== undefined ? <Typography variant="body2">Final consensus measure: {consensusInfo.finalConsensusMeasure}</Typography> : null}{consensusInfo.consensusReachedPhase !== undefined ? <Typography variant="body2">Reached phase: {consensusInfo.consensusReachedPhase}</Typography> : null}{consensusInfo.finalizationReason ? <Typography variant="body2">Finalization reason: {consensusInfo.finalizationReason}</Typography> : null}{hasConsensusEvolution ? <Box sx={{ height: { xs: 250, md: 360 } }}><AnalyticalConsensusLineChart data={consensusEvolution} /></Box> : null}{header.roundsCount === 1 ? <Typography variant="body2" color="text.secondary">The issue finished in the initial phase, so no multi-round evolution chart is available.</Typography> : null}</Stack></SectionCard>;
};

export default ConsensusSection;

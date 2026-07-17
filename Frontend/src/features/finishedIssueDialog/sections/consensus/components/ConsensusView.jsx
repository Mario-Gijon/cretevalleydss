import { Box, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { AnalyticalConsensusLineChart } from "../../../graphs/components/AnalyticalConsensusLineChart";
import { consensusChartSx } from "../consensus.styles.js";

const ConsensusView = ({ data }) => {
  if (!data.enabled) {
    return (
      <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />}>
        <Typography color="text.secondary">
          Consensus is not enabled for this issue.
        </Typography>
      </SectionCard>
    );
  }

  const hasGraphData = data.graph.data.filter(Number.isFinite).length > 1;

  return (
    <SectionCard title="Consensus" icon={<GroupsIcon fontSize="small" />}>
      <Stack spacing={0.8}>
        <Typography variant="body2">
          Available phases: {data.rounds.map((round) => round.phase).join(", ") || "—"}
        </Typography>
        {data.threshold !== null ? (
          <Typography variant="body2">Threshold: {data.threshold}</Typography>
        ) : null}
        {data.reachedPhase !== null ? (
          <Typography variant="body2">
            Reached phase: {data.reachedPhase}
          </Typography>
        ) : null}
        {data.finalizationReason ? (
          <Typography variant="body2">
            Finalization reason: {data.finalizationReason}
          </Typography>
        ) : null}
        {hasGraphData ? (
          <Box sx={consensusChartSx}>
            <AnalyticalConsensusLineChart data={data.graph} />
          </Box>
        ) : null}
      </Stack>
    </SectionCard>
  );
};

export default ConsensusView;

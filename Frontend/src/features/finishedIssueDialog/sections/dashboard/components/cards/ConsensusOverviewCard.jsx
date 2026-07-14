import { Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";

const ConsensusOverviewCard = ({ consensus, onViewConsensus }) => (
  <DashboardCardShell title="Consensus" icon={<GroupsIcon fontSize="small" />} actionLabel="View all rounds" onAction={onViewConsensus}>
    <Stack spacing={0.5}>
      <Typography variant="body2">{consensus.phasesCount} phases · {consensus.phaseLabel}</Typography>
      {consensus.threshold !== null ? <MetaText>Threshold: {consensus.threshold}</MetaText> : null}
      {consensus.finalMeasure !== null ? <MetaText>Final measure: {consensus.finalMeasure}</MetaText> : null}
      {consensus.finalizationReason ? <MetaText>Reason: {consensus.finalizationReason}</MetaText> : null}
    </Stack>
  </DashboardCardShell>
);

export default ConsensusOverviewCard;

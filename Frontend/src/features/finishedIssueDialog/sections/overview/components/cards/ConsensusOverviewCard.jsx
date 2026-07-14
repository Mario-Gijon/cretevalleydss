import { Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";

import OverviewCardShell, { MetaText } from "../OverviewCardShell";

const ConsensusOverviewCard = ({ consensus, onViewConsensus }) => (
  <OverviewCardShell title="Consensus" icon={<GroupsIcon fontSize="small" />} actionLabel="View all rounds" onAction={onViewConsensus}>
    <Stack spacing={0.5}>
      <Typography variant="body2">{consensus.phasesCount} phases · {consensus.phaseLabel}</Typography>
      {consensus.threshold !== null ? <MetaText>Threshold: {consensus.threshold}</MetaText> : null}
      {consensus.finalMeasure !== null ? <MetaText>Final measure: {consensus.finalMeasure}</MetaText> : null}
      {consensus.finalizationReason ? <MetaText>Reason: {consensus.finalizationReason}</MetaText> : null}
    </Stack>
  </OverviewCardShell>
);

export default ConsensusOverviewCard;

import { Stack, Typography } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import OverviewCardShell, { MetaText } from "../OverviewCardShell";

const EvaluationsOverviewCard = ({ evaluations, onViewEvaluations }) => (
  <OverviewCardShell title="Evaluations" icon={<PeopleAltIcon fontSize="small" />} actionLabel="View evaluations" onAction={onViewEvaluations}>
    <Stack spacing={0.5}>
      <Typography variant="body2">Experts with evaluations: {evaluations.expertsCount}</Typography>
      <MetaText>Selected phase: {evaluations.phaseLabel}</MetaText>
      {evaluations.structure ? <MetaText>Structure: {evaluations.structure}</MetaText> : null}
      {evaluations.hasCollective ? <MetaText>Collective evaluation available</MetaText> : null}
    </Stack>
  </OverviewCardShell>
);

export default EvaluationsOverviewCard;

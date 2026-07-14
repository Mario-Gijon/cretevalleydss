import { Stack, Typography } from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";

import OverviewCardShell, { MetaText } from "../OverviewCardShell";

const ModelsOverviewCard = ({ models, onViewModels }) => (
  <OverviewCardShell title="Models & runs" icon={<ScienceIcon fontSize="small" />} actionLabel="View models" onAction={onViewModels}>
    <Stack spacing={0.5}>
      <Typography variant="body2">Base model: {models.baseModelName}</Typography>
      <MetaText>Selected execution: {models.selectedExecutionLabel}</MetaText>
      <MetaText>Additional runs: {models.additionalRunsCount}</MetaText>
    </Stack>
  </OverviewCardShell>
);

export default ModelsOverviewCard;

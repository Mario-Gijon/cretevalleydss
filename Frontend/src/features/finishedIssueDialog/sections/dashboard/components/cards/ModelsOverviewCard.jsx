import { Stack, Typography } from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";

const ModelsOverviewCard = ({ models, onViewModels }) => (
  <DashboardCardShell title="Models" icon={<ScienceIcon fontSize="small" />} actionLabel="View models" onAction={onViewModels}>
    <Stack spacing={0.5}>
      <Typography variant="body2">Base model: {models.baseModelName}</Typography>
      <MetaText>Selected execution: {models.selectedExecutionLabel}</MetaText>
      <MetaText>Additional runs: {models.additionalRunsCount}</MetaText>
    </Stack>
  </DashboardCardShell>
);

export default ModelsOverviewCard;

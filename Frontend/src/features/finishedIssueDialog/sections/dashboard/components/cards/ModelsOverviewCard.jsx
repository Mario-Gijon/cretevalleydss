import { Box, Chip, Stack, Typography } from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";

const parameterLabel = (value) => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} values`;
  if (value && typeof value === "object") return `${Object.keys(value).length} values`;
  return "—";
};

const ModelsOverviewCard = ({ models, onViewModels }) => (
  <DashboardCardShell number="4" title="Models" subtitle="Execution configuration" icon={<ScienceIcon fontSize="small" />} actionLabel="View models" onAction={onViewModels}>
    <Stack spacing={0.72}>
      <Typography variant="body2" sx={{ fontWeight: 900 }}>Base model · {models.baseModelName}</Typography>
      <MetaText>Selected execution · {models.selectedExecutionLabel}</MetaText>
      <MetaText>Additional runs · {models.additionalRunsCount}</MetaText>
      {models.selectedModelDescription ? <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>{models.selectedModelDescription}</Typography> : null}
      {models.status === "error" ? <Box sx={{ p: 0.75, borderRadius: 1.25, border: "1px solid rgba(244, 93, 93, 0.30)", bgcolor: "rgba(244, 93, 93, 0.08)" }}><Typography variant="caption" sx={{ color: "error.light", fontWeight: 900 }}>Execution failed</Typography>{models.error ? <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>{models.error}</Typography> : null}</Box> : null}
      <Stack direction="row" gap={0.5} useFlexGap flexWrap="wrap">{Object.entries(models.parameters || {}).slice(0, 4).map(([key, value]) => <Chip key={key} size="small" variant="outlined" label={`${key}: ${parameterLabel(value)}`} />)}</Stack>
    </Stack>
  </DashboardCardShell>
);

export default ModelsOverviewCard;

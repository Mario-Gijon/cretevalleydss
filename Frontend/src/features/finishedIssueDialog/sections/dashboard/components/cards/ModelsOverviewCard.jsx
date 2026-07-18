import { Box, Typography } from "@mui/material";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";

import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const ModelInfoRow = ({ label, value, tone = "default", multiline = false }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(118px, 0.42fr) minmax(0, 1fr)" }, gap: { xs: 0.2, sm: 0.8 }, px: 0.95, py: 0.62, borderBottom: "1px solid rgba(255,255,255,0.075)", minWidth: 0 }}>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
    <Typography variant="body2" title={typeof value === "string" ? value : undefined} sx={multiline ? { minWidth: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", color: tone === "cyan" ? "secondary.light" : "text.primary", lineHeight: 1.45 } : { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: tone === "cyan" ? "secondary.light" : "text.primary", fontWeight: "fontWeightBold" }}>{value}</Typography>
  </Box>
);

const ModelsOverviewCard = ({ models, onViewModels }) => {
  const hasDescription = typeof models.selectedModelDescription === "string" && models.selectedModelDescription.trim();
  return <DashboardPreviewCard icon={<ScienceRoundedIcon fontSize="small" />} title="Models" actionLabel="View models" onAction={onViewModels}>
    <DashboardInnerPanel sx={{ p: 0 }}>
      <ModelInfoRow label="Selected execution" value={models.selectedExecutionLabel || "Base"} tone="cyan" />
      <ModelInfoRow label="Model" value={models.selectedModelName || models.baseModelName || "—"} tone="cyan" />
      <ModelInfoRow label="Description" value={hasDescription ? models.selectedModelDescription : "—"} multiline />
      <Box sx={{ "& > *": { borderBottom: 0 } }}><ModelInfoRow label="Runs generated" value={models.runsGenerated ?? models.additionalRunsCount ?? 0} tone="cyan" /></Box>
    </DashboardInnerPanel>
  </DashboardPreviewCard>;
};

export default ModelsOverviewCard;

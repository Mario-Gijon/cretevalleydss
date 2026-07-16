import { Box, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import { dashboardParameterCodeSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const parameterLabel = (value) => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} values`;
  if (value && typeof value === "object") return `${Object.keys(value).length} values`;
  return "—";
};

const readableKey = (value) => String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const ModelsOverviewCard = ({ models, onViewModels }) => {
  const parameterEntries = Object.entries(models.parameters || {}).slice(0, 4);
  const hasDescription = typeof models.selectedModelDescription === "string" && models.selectedModelDescription.trim();
  const codePreview = parameterEntries.length ? `{\n${parameterEntries.map(([key, value]) => `  "${key}": "${parameterLabel(value)}"`).join(",\n")}\n}` : "No configured parameters.";
  return <DashboardPreviewCard number="4" title="Models" subtitle="Execution configuration" actionLabel="View models" onAction={onViewModels}>
    <Stack spacing={1}>
      <DashboardInnerPanel><Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}><Box sx={{ minWidth: 0 }}><Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>Base model</Typography><Typography noWrap title={models.baseModelName} sx={{ mt: 0.2, color: "secondary.light", fontSize: 14, fontWeight: 950 }}>{models.baseModelName || "—"}</Typography></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>Additional runs</Typography><Typography sx={{ mt: 0.2, fontSize: 14, fontWeight: 950 }}>{models.additionalRunsCount || 0}</Typography></Box></Box></DashboardInnerPanel>
      <Box><Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>Selected execution</Typography><Stack direction="row" spacing={0.55} alignItems="center">{models.status === "error" ? <ErrorOutlineRoundedIcon sx={{ color: "error.main", fontSize: 17 }} /> : <CheckCircleRoundedIcon sx={{ color: "success.main", fontSize: 17 }} />}<Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>{models.selectedExecutionLabel || "Base"}</Typography></Stack></Box>
      {hasDescription ? <Typography title={models.selectedModelDescription} sx={{ color: "text.secondary", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12.5, lineHeight: 1.5, fontWeight: 600 }}>{models.selectedModelDescription}</Typography> : null}
      {models.status === "error" ? <DashboardInnerPanel sx={{ borderColor: "rgba(244, 93, 93, 0.30)", bgcolor: "rgba(244, 93, 93, 0.07)" }}><Typography sx={{ color: "error.light", fontSize: 13, fontWeight: 900 }}>Execution failed</Typography>{typeof models.error === "string" && models.error.trim() ? <Typography sx={{ mt: 0.35, color: "text.secondary", fontSize: 12 }}>{models.error}</Typography> : null}</DashboardInnerPanel> : null}
      <DashboardInnerPanel><Typography sx={{ fontSize: 12.5, fontWeight: 900, mb: 0.7 }}>Model parameters</Typography><Box component="pre" sx={dashboardParameterCodeSx}>{codePreview}</Box></DashboardInnerPanel>
      {parameterEntries.length ? <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.65 }}>{parameterEntries.map(([key, value]) => <Box key={key} sx={{ minWidth: 0, px: 0.85, py: 0.7, borderRadius: 1.3, border: "1px solid rgba(255,255,255,0.075)", bgcolor: "rgba(255,255,255,0.02)" }}><Typography noWrap title={readableKey(key)} sx={{ color: "text.secondary", fontSize: 10.5, fontWeight: 700 }}>{readableKey(key)}</Typography><Typography noWrap title={parameterLabel(value)} sx={{ mt: 0.15, color: "secondary.light", fontSize: 12, fontWeight: 900 }}>{parameterLabel(value)}</Typography></Box>)}</Box> : null}
    </Stack>
  </DashboardPreviewCard>;
};

export default ModelsOverviewCard;

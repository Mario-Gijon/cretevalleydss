import { Box, Button, Stack, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { AnalyticalScatterChart } from "../../../graphs/components/AnalyticalScatterChart";

const unavailableMessage = (reason) => {
  if (reason === "insufficient_variation_for_projection") return "Analytical graph is unavailable because all expert inputs are equivalent.";
  if (reason === "insufficient_points_for_projection") return "Analytical graph is unavailable because there are not enough points to project.";
  if (reason === "projection_failed") return "Analytical graph projection failed for this result.";
  return "No analytical graph data available.";
};

const VisualizationsPanel = ({ visualizations = {}, scatterPlotRef, onResetZoom }) => (
  <SectionCard title="Visualizations" icon={<AnalyticsIcon fontSize="small" />} right={visualizations.hasPerformanceMap ? <Button variant="outlined" color="secondary" size="small" onClick={onResetZoom}>Reset zoom</Button> : null}>
    {visualizations.hasPerformanceMap ? <Box sx={{ width: "100%", height: { xs: 290, md: 520 } }}><AnalyticalScatterChart data={visualizations.performanceMapData} phase={visualizations.selectedPhase ?? 0} scatterPlotRef={scatterPlotRef} /></Box> : <Stack justifyContent="center" alignItems="center"><Typography variant="body2" color="text.secondary">{unavailableMessage(visualizations.unavailableReason)}</Typography></Stack>}
  </SectionCard>
);

export default VisualizationsPanel;

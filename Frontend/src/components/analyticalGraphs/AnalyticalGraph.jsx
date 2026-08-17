import { Alert, Box, Typography } from "@mui/material";

import { resolveAnalyticalGraphRenderer } from "./analyticalGraphRegistry.js";
import { finishedIssueScrollbarSx } from "../../features/finishedIssueDialog/sections/resultsAnalysis/resultsAnalysis.styles.js";

const graphFrameSx = (chartHeight) => ({ height: chartHeight || { xs: 300, sm: 360 }, minHeight: 0, width: "100%" });
const graphViewportSx = { ...finishedIssueScrollbarSx, width: "100%", height: "100%", overflowX: "auto", overflowY: "hidden" };
const graphContentSx = (chartMinWidth) => ({ height: "100%", minWidth: chartMinWidth || 0, width: "100%" });

const AnalyticalGraph = ({ visualization, chartHeight, chartMinWidth, titleVariant = "h6" }) => {
  if (!visualization || typeof visualization !== "object") {
    return <Alert severity="info">This visualization is unavailable.</Alert>;
  }

  const Renderer = resolveAnalyticalGraphRenderer(visualization.type);
  if (!Renderer) {
    return <Alert severity="info">This visualization type is not supported.</Alert>;
  }

  return <Box data-testid={`analytical-graph-${visualization.type}`}>
    {visualization.title ? <Typography component="h3" variant={titleVariant} sx={titleVariant === "subtitle1" ? { fontWeight: 800 } : undefined}>{visualization.title}</Typography> : null}
    {visualization.description ? <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{visualization.description}</Typography> : null}
    <Box sx={graphFrameSx(chartHeight)}>
      <Box sx={graphViewportSx}>
        <Box sx={graphContentSx(chartMinWidth)}><Renderer visualization={visualization} /></Box>
      </Box>
    </Box>
    {visualization.insight ? <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>{visualization.insight}</Typography> : null}
  </Box>;
};

export default AnalyticalGraph;

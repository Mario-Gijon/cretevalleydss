import { Alert, Box, Typography } from "@mui/material";

import { resolveAnalyticalGraphRenderer } from "./analyticalGraphRegistry.js";
import { finishedIssueScrollbarSx } from "../../features/finishedIssueDialog/sections/resultsAnalysis/resultsAnalysis.styles.js";
import { getVisualizationReadingGuide } from "../../features/finishedIssueDialog/sections/resultsAnalysis/logic/visualizationReadingGuides.js";
import VisualizationReadingGuide from "../../features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationReadingGuide.jsx";
import { resolveVisualizationPresentation } from "../../features/finishedIssueDialog/sections/resultsAnalysis/logic/resolveVisualizationPresentation.js";

const graphFrameSx = (chartHeight) => ({ height: chartHeight || { xs: 300, sm: 360 }, minHeight: 0, width: "100%" });
const HORIZONTAL_SCROLLBAR_GUTTER = 12;
const graphViewportSx = {
  ...finishedIssueScrollbarSx,
  boxSizing: "border-box",
  width: "100%",
  height: "100%",
  pb: `${HORIZONTAL_SCROLLBAR_GUTTER}px`,
  overflowX: "auto",
  overflowY: "hidden",
};
const graphContentSx = (chartMinWidth) => ({ height: "100%", minWidth: chartMinWidth || 0, width: "100%" });

const AnalyticalGraph = ({ visualization, chartHeight, chartMinWidth, titleVariant = "h6", controls = null }) => {
  if (!visualization || typeof visualization !== "object") {
    return <Alert severity="info">This visualization is unavailable.</Alert>;
  }

  const Renderer = resolveAnalyticalGraphRenderer(visualization.type);
  if (!Renderer) {
    return <Alert severity="info">This visualization type is not supported.</Alert>;
  }

  const readingGuide = getVisualizationReadingGuide(visualization);
  const title = typeof visualization.title === "string" && visualization.title.trim()
    ? visualization.title.trim()
    : readingGuide.title;

  return <Box data-testid={`analytical-graph-${visualization.type}`}>
    <Typography component="h3" variant={titleVariant} sx={titleVariant === "subtitle1" ? { fontWeight: 800 } : undefined}>{title}</Typography>
    <VisualizationReadingGuide>{readingGuide.text}</VisualizationReadingGuide>
    {controls ? <Box data-testid="analytical-graph-controls" sx={{ width: "100%", minWidth: 0, mb: 1.2 }}>{controls}</Box> : null}
    <Box sx={graphFrameSx(chartHeight || resolveVisualizationPresentation(visualization).chartHeight)}>
      <Box data-testid="analytical-graph-viewport" sx={graphViewportSx}>
        <Box sx={graphContentSx(chartMinWidth)}><Renderer visualization={visualization} /></Box>
      </Box>
    </Box>
  </Box>;
};

export default AnalyticalGraph;

import { Alert, Box, Typography } from "@mui/material";

import { resolveAnalyticalGraphRenderer } from "./analyticalGraphRegistry.js";

const graphFrameSx = { height: { xs: 300, sm: 360 }, minHeight: 0, width: "100%" };

const AnalyticalGraph = ({ visualization }) => {
  if (!visualization || typeof visualization !== "object") {
    return <Alert severity="info">This visualization is unavailable.</Alert>;
  }

  const Renderer = resolveAnalyticalGraphRenderer(visualization.type);
  if (!Renderer) {
    return <Alert severity="info">This visualization type is not supported.</Alert>;
  }

  return <Box data-testid={`analytical-graph-${visualization.type}`}>
    {visualization.title ? <Typography component="h3" variant="h6">{visualization.title}</Typography> : null}
    {visualization.description ? <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{visualization.description}</Typography> : null}
    <Box sx={graphFrameSx}><Renderer visualization={visualization} /></Box>
    {visualization.insight ? <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>{visualization.insight}</Typography> : null}
  </Box>;
};

export default AnalyticalGraph;

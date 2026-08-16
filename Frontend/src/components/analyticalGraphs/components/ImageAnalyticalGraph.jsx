import { Box } from "@mui/material";

import GraphUnavailable from "./GraphUnavailable.jsx";

const ImageAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (data?.format !== "svg" || typeof data.content !== "string" || !data.content.trim()) return <GraphUnavailable />;
  const source = `data:image/svg+xml,${encodeURIComponent(data.content)}`;
  return <Box component="img" data-testid="image-analytical-graph" src={source} alt={visualization.title || "Analytical visualization"} sx={{ display: "block", maxWidth: "100%", maxHeight: "100%", mx: "auto" }} />;
};

export default ImageAnalyticalGraph;

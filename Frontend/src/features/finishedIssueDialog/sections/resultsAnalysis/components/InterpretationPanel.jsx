import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { comparisonDetailPanelSx } from "../resultsAnalysis.styles.js";

const markdownComponents = {
  h3: ({ children }) => <Typography component="h3" sx={{ mt: 0.5, fontSize: 17, fontWeight: 900 }}>{children}</Typography>,
  p: ({ children }) => <Typography component="p" variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>{children}</Typography>,
  strong: ({ children }) => <Box component="strong" sx={{ color: "text.primary", fontWeight: 850 }}>{children}</Box>,
  ul: ({ children }) => <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary" }}>{children}</Box>,
  ol: ({ children }) => <Box component="ol" sx={{ m: 0, pl: 2.5, color: "text.secondary" }}>{children}</Box>,
  li: ({ children }) => <Typography component="li" variant="body2" sx={{ mb: 0.35 }}>{children}</Typography>,
  table: ({ children }) => <Box sx={{ overflowX: "auto", width: "100%" }}><Box component="table" sx={{ borderCollapse: "collapse", minWidth: 480, width: "100%", "& th, & td": { border: "1px solid rgba(83,198,214,0.2)", px: 1, py: 0.7, textAlign: "left", fontSize: 12 }, "& th": { color: "text.primary", bgcolor: "rgba(83,198,214,0.08)", fontWeight: 800 }, "& td": { color: "text.secondary" } }}>{children}</Box></Box>,
};

const InterpretationPanel = ({ genericAnalysis }) => {
  if (genericAnalysis.loading) return <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  if (genericAnalysis.error) return <Alert severity="error">Generic interpretation could not be loaded. Please try again later.</Alert>;
  if (!genericAnalysis.data) return <Alert severity="info">Generic interpretation is not available for this finished issue.</Alert>;
  return <Stack spacing={1.4}>
    <Box sx={comparisonDetailPanelSx}>
      <Typography component="h2" sx={{ mb: 1.1, fontSize: 18, fontWeight: 950 }}>General analysis</Typography>
      {genericAnalysis.data.interpretation ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{genericAnalysis.data.interpretation}</ReactMarkdown> : <Alert severity="info">No general interpretation was returned.</Alert>}
    </Box>
  </Stack>;
};

export default InterpretationPanel;

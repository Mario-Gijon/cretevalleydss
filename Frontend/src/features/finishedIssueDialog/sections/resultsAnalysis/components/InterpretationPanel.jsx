import { Alert, Box, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { comparisonDetailPanelSx } from "../resultsAnalysis.styles.js";

const markdownComponents = {
  h3: ({ children }) => <Typography component="h3" sx={{ mt: 1, mb: 0.45, fontSize: 19, fontWeight: 900 }}>{children}</Typography>,
  p: ({ children }) => <Typography component="p" sx={{ color: "text.secondary", fontSize: 15, lineHeight: 1.65 }}>{children}</Typography>,
  strong: ({ children }) => <Box component="strong" sx={{ color: "text.primary", fontWeight: 850 }}>{children}</Box>,
  ul: ({ children }) => <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary", fontSize: 15, lineHeight: 1.6 }}>{children}</Box>,
  ol: ({ children }) => <Box component="ol" sx={{ m: 0, pl: 2.5, color: "text.secondary", fontSize: 15, lineHeight: 1.6 }}>{children}</Box>,
  li: ({ children }) => <Typography component="li" sx={{ mb: 0.5, fontSize: 15, lineHeight: 1.6 }}>{children}</Typography>,
  table: ({ children }) => <Box sx={{ overflowX: "auto", width: "100%" }}><Box component="table" sx={{ borderCollapse: "collapse", minWidth: 480, width: "100%", "& th, & td": { border: "1px solid rgba(83,198,214,0.2)", px: 1.2, py: 0.85, textAlign: "left", fontSize: 14 }, "& th": { color: "text.primary", bgcolor: "rgba(83,198,214,0.08)", fontWeight: 800 }, "& td": { color: "text.secondary" } }}>{children}</Box></Box>,
};

const InterpretationPanel = ({ executions = [] }) => {
  const multiple = executions.length > 1;
  return <Box sx={{ overflowX: multiple ? "auto" : "visible", maxWidth: "100%" }}>
    <Box sx={{ display: "grid", gridTemplateColumns: multiple ? { xs: "1fr", md: `repeat(${executions.length}, minmax(360px, 1fr))` } : "minmax(0, 1fr)", gap: 1.4, minWidth: multiple ? { md: executions.length * 360 } : 0 }}>
      {executions.map((execution) => <Box key={execution.key} sx={{ ...comparisonDetailPanelSx, minHeight: { md: 640 }, maxHeight: { md: "min(700px, 72vh)" }, overflowY: "auto", overflowX: "hidden" }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 950 }}>{execution.displayLabel}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>{execution.modelName}</Typography>
        <Typography component="h3" sx={{ mb: 1.25, fontSize: 17, fontWeight: 900 }}>General analysis</Typography>
        {execution.genericAnalysis?.interpretation ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{execution.genericAnalysis.interpretation}</ReactMarkdown> : <Alert severity="info">General analysis is not available for this execution. Reload Analysis to generate it.</Alert>}
      </Box>)}
    </Box>
  </Box>;
};

export default InterpretationPanel;

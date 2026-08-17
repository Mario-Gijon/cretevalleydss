import { Alert, Box, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { comparisonDetailPanelSx } from "../resultsAnalysis.styles.js";

const stageHeadingSx = {
  m: 0,
  mb: 0.8,
  pb: 0.6,
  fontSize: "24px",
  fontWeight: 950,
  lineHeight: 1.2,
  color: "text.primary",
  borderBottom: "1px solid",
  borderColor: "divider",
};

const markdownComponents = {
  h3: ({ children }) => (
    <Box
      component="h3"
      sx={{
        mt: 2.1,
        mb: 0.85,
        fontSize: "20px",
        fontWeight: 900,
        lineHeight: 1.25,
        color: "text.primary",
      }}
    >
      {children}
    </Box>
  ),

  h4: ({ children }) => (
    <Box
      component="h4"
      sx={{
        mt: 1.45,
        mb: 0.6,
        fontSize: "17px",
        fontWeight: 850,
        lineHeight: 1.3,
        color: "text.primary",
      }}
    >
      {children}
    </Box>
  ),

  p: ({ children }) => (
    <Typography
      component="p"
      sx={{
        mt: 0,
        mb: 0.9,
        color: "text.secondary",
        fontSize: "15px",
        lineHeight: 1.65,
      }}
    >
      {children}
    </Typography>
  ),

  strong: ({ children }) => (
    <Box
      component="strong"
      sx={{
        color: "text.primary",
        fontWeight: 850,
      }}
    >
      {children}
    </Box>
  ),

  ul: ({ children }) => (
    <Box
      component="ul"
      sx={{
        mt: 0,
        mb: 1,
        pl: 2.5,
        color: "text.secondary",
        fontSize: "15px",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Box>
  ),

  ol: ({ children }) => (
    <Box
      component="ol"
      sx={{
        mt: 0,
        mb: 1,
        pl: 2.5,
        color: "text.secondary",
        fontSize: "15px",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Box>
  ),

  li: ({ children }) => (
    <Typography
      component="li"
      sx={{
        mb: 0.45,
        fontSize: "15px",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Typography>
  ),

  table: ({ children }) => (
    <Box
      sx={{
        my: 0.9,
        overflowX: "auto",
        width: "100%",
      }}
    >
      <Box
        component="table"
        sx={{
          borderCollapse: "collapse",
          minWidth: 480,
          width: "100%",
          "& th, & td": {
            border: "1px solid rgba(83,198,214,0.2)",
            px: 1.2,
            py: 0.85,
            textAlign: "left",
            fontSize: "14px",
          },
          "& th": {
            color: "text.primary",
            bgcolor: "rgba(83,198,214,0.08)",
            fontWeight: 800,
          },
          "& td": {
            color: "text.secondary",
          },
        }}
      >
        {children}
      </Box>
    </Box>
  ),
};

const MODEL_ANALYSIS_STAGES = [
  {
    key: "criteriaWeighting",
    title: "Criteria weighting",
  },
  {
    key: "alternativeEvaluation",
    title: "Alternative evaluation",
  },
];

const stageAnalysisFor = (execution, stage) =>
  execution?.stageAnalyses?.[stage] ??
  (stage === "alternativeEvaluation"
    ? execution?.alternativeEvaluationAnalysis
    : null);

const stageCaption = (execution, stage, entry) =>
  stage === "alternativeEvaluation" &&
    execution.modelName &&
    execution.modelName !== "—"
    ? execution.modelName
    : entry?.apiModelKey || null;

const InterpretationPanel = ({ executions = [] }) => {
  const multiple = executions.length > 1;

  return (
    <Box
      sx={{
        overflowX: multiple ? "auto" : "visible",
        maxWidth: "100%",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: multiple
            ? {
              xs: "1fr",
              md: `repeat(${executions.length}, minmax(360px, 1fr))`,
            }
            : "minmax(0, 1fr)",
          gap: 1.4,
          minWidth: multiple
            ? {
              md: executions.length * 360,
            }
            : 0,
          alignItems: "start",
        }}
      >
        {executions.map((execution) => (
          <Box
            key={execution.key}
            sx={{
              ...comparisonDetailPanelSx,
              height: "auto",
              overflowX: "hidden",
            }}
          >
            {multiple ? (
              <Box
                component="h2"
                sx={{
                  m: 0,
                  fontSize: "28px",
                  fontWeight: 950,
                  lineHeight: 1.15,
                  color: "text.primary",
                }}
              >
                {execution.displayLabel}
              </Box>
            ) : null}

            {multiple ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: multiple ? 0.3 : 0,
                  mb: 1.9,
                }}
              >
                {execution.modelName}
              </Typography>
            ) : null}



            <Box component="h3" sx={stageHeadingSx}>
              General analysis
            </Box>

            {execution.genericAnalysis?.interpretation ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {execution.genericAnalysis.interpretation}
              </ReactMarkdown>
            ) : (
              <Alert severity="info">
                General analysis is not available for this execution. Reload
                Analysis to generate it.
              </Alert>
            )}

            {MODEL_ANALYSIS_STAGES.map((stage) => {
              const entry = stageAnalysisFor(execution, stage.key);
              const interpretation = entry?.analysis?.interpretation;

              if (!interpretation) {
                return null;
              }

              const caption = stageCaption(execution, stage.key, entry);

              return (
                <Box
                  key={stage.key}
                  sx={{
                    mt: 3.2,
                  }}
                >
                  <Box component="h3" sx={stageHeadingSx}>
                    {stage.title}
                  </Box>

                  {caption ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                        mb: 0.9,
                      }}
                    >
                      {caption}
                    </Typography>
                  ) : null}

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {interpretation}
                  </ReactMarkdown>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default InterpretationPanel;
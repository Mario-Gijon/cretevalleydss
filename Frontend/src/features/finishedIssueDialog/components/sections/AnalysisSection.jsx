import { useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";

const safeJson = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatScoreGap = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return numericValue.toFixed(2);
};

const toTitleCase = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "Unavailable";
  return `${text[0].toUpperCase()}${text.slice(1)}`;
};

const isInformationalWarning = (warning) => {
  const code = String(warning?.code || "").toUpperCase();
  return code === "NO_SCENARIOS_AVAILABLE";
};

const isTechnicalLimitationWarning = (warning) => {
  const code = String(warning?.code || "").toUpperCase();
  const message = String(warning?.message || "").toLowerCase();
  if (code === "PAIRWISE_DETAILED_ANALYSIS_LIMITED") return true;
  return message.includes("pairwise context is included") && message.includes("limited");
};

const dedupeWarnings = (items = []) => {
  const unique = new Map();
  items.forEach((item) => {
    const code = String(item?.code || "").trim();
    const message = String(item?.message || "").trim();
    const key = `${code}::${message}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });
  return Array.from(unique.values());
};

const normalizeWarnings = (analysisWarnings, contextWarnings, analysisMetrics) => {
  const merged = dedupeWarnings([...(analysisWarnings || []), ...(contextWarnings || [])]);
  const pairwiseDiagnosticsAvailable =
    analysisMetrics?.pairwiseDiagnostics?.available === true;
  const important = [];
  const notes = [];
  merged.forEach((warning) => {
    if (pairwiseDiagnosticsAvailable && isTechnicalLimitationWarning(warning)) {
      notes.push({
        ...warning,
        message:
          "Detailed pairwise diagnostics are partially limited in some cases, but core pairwise analysis is available for this result.",
      });
      return;
    }

    if (isInformationalWarning(warning)) {
      notes.push({
        ...warning,
        message: warning?.message || "No scenario analysis was performed for this issue.",
      });
      return;
    }

    const severity = String(warning?.severity || "").toLowerCase();
    if (severity === "high" || severity === "medium") {
      important.push(warning);
      return;
    }

    notes.push(warning);
  });
  return { important, notes };
};

const toSeverity = (severity) => {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "high") return "error";
  if (normalized === "medium") return "warning";
  return "info";
};

const toImportanceColor = (importance) => {
  const normalized = String(importance || "").toLowerCase();
  if (normalized === "high") return "error";
  if (normalized === "medium") return "warning";
  return "default";
};

const toImportanceLabel = (importance) => {
  const normalized = String(importance || "").toLowerCase();
  if (normalized === "high") return "Important";
  if (normalized === "medium") return "Relevant";
  return "Note";
};

const renderTextBlocks = (blocks = []) =>
  blocks.map((block) => (
    <Box
      key={block?.key || block?.title}
      sx={{ py: 0.25 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {block?.title || "Section"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {block?.text || "—"}
      </Typography>
    </Box>
  ));

/**
 * Seccion Analysis del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const AnalysisSection = () => {
  const { analysisSection } = useFinishedIssueDialogContext();
  const {
    savedAnalysis,
    loadingAnalysis,
    generatingAnalysis,
    analysisError,
    handleGenerateOrRegenerateAnalysis,
    isScenarioSelected,
  } = analysisSection;

  const status = savedAnalysis?.status || null;
  const analysis = savedAnalysis?.analysis || null;

  const warningsByPriority = useMemo(() => {
    const contextWarnings = Array.isArray(savedAnalysis?.contextWarnings)
      ? savedAnalysis.contextWarnings
      : [];
    const analysisWarnings = Array.isArray(analysis?.warnings) ? analysis.warnings : [];
    return normalizeWarnings(analysisWarnings, contextWarnings, analysis?.metrics);
  }, [savedAnalysis, analysis]);

  const confidenceLevel = analysis?.confidence?.level || "unknown";
  const confidenceLabel = `${toTitleCase(confidenceLevel)} confidence`;
  const formattedScoreGap = formatScoreGap(analysis?.confidence?.scoreGap);
  const mainRecommendation = analysis?.summary?.recommendation || null;
  const mainExplanation = analysis?.summary?.explanation || null;
  const fallbackNarrative = mainRecommendation
    ? `${mainRecommendation} is the recommended alternative based on the available result data.`
    : "The available data was not sufficient to generate a final recommendation.";

  const isEmpty = !loadingAnalysis && !savedAnalysis;
  const isFailed = status === "failed";
  const isCompleted = status === "completed" && Boolean(analysis);
  const generateLabel = isScenarioSelected
    ? "Generate scenario analysis"
    : "Generate analysis";
  const regenerateLabel = isScenarioSelected
    ? "Regenerate scenario analysis"
    : "Regenerate analysis";
  const generatingLabel = isScenarioSelected
    ? "Generating scenario analysis..."
    : "Generating...";
  const emptyMessage = isScenarioSelected
    ? "No results analysis has been generated for this scenario yet."
    : "No results analysis has been generated yet.";
  const failedMessage = isScenarioSelected
    ? "The scenario analysis could not be generated."
    : "The analysis could not be generated.";

  return (
    <SectionCard title="Results Analysis" icon={<AnalyticsIcon fontSize="small" />}>
      <Stack spacing={1.25}>
        {loadingAnalysis ? (
          <CircularLoading color="secondary" size={34} height="180px" />
        ) : null}

        {analysisError ? <Alert severity="warning">{analysisError}</Alert> : null}

        {isEmpty ? (
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {emptyMessage}
            </Typography>
            <Box>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGenerateOrRegenerateAnalysis}
                disabled={generatingAnalysis}
                color="secondary"
              >
                {generatingAnalysis ? generatingLabel : generateLabel}
              </Button>
            </Box>
          </Stack>
        ) : null}

        {isFailed ? (
          <Stack spacing={1}>
            <Alert severity="error">{failedMessage}</Alert>
            {savedAnalysis?.error?.message ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {savedAnalysis.error.message}
              </Typography>
            ) : null}
            <Box>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={handleGenerateOrRegenerateAnalysis}
                disabled={generatingAnalysis}
              >
                {generatingAnalysis ? generatingLabel : "Try again"}
              </Button>
            </Box>
          </Stack>
        ) : null}

        {isCompleted ? (
          <Stack spacing={1.25}>
            <Stack
              direction={"row"}
              spacing={1}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent={"space-between"}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={confidenceLabel}
                  color={confidenceLevel === "high" ? "success" : confidenceLevel === "low" ? "warning" : "default"}
                />
                {formattedScoreGap ? (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Score gap: {formattedScoreGap}
                  </Typography>
                ) : null}
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Generated: {formatDateTime(savedAnalysis?.generatedAt) || "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Version: {savedAnalysis?.analysisVersion || "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Source: {savedAnalysis?.source || "—"}
                </Typography>
              </Stack>

              <Box sx={{ ml: { md: "auto" } }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGenerateOrRegenerateAnalysis}
                  disabled={generatingAnalysis}
                  color="secondary"
                >
                  {generatingAnalysis ? "Regenerating..." : regenerateLabel}
                </Button>
              </Box>
            </Stack>

            <Divider />

            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Recommendation
              </Typography>
              {mainRecommendation ? (
                <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {mainRecommendation}
                </Typography>
              ) : null}
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                {mainExplanation || fallbackNarrative}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
                {analysis?.confidence?.isCloseDecision
                  ? "The leading alternatives are close, so the result should be interpreted carefully."
                  : "The score difference suggests a clear recommendation."}
              </Typography>
            </Box>

            {Array.isArray(analysis?.insights) && analysis.insights.length > 0 ? (
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Main observations
                </Typography>
                {analysis.insights.map((insight, index) => (
                  <Stack key={`${insight?.code || "insight"}-${index}`} direction="row" spacing={1} alignItems="flex-start">
                    {insight?.importance ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        color={toImportanceColor(insight.importance)}
                        label={toImportanceLabel(insight.importance)}
                      />
                    ) : null}
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      {insight?.message || "—"}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : null}

            {warningsByPriority.important.length > 0 ? (
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Warnings
                </Typography>
                {warningsByPriority.important.map((warning, index) => (
                  <Alert
                    key={`${warning?.code || "warning"}-${index}`}
                    severity={toSeverity(warning?.severity)}
                  >
                    <Typography variant="body2">{warning?.message || "—"}</Typography>
                  </Alert>
                ))}
              </Stack>
            ) : null}

            {Array.isArray(analysis?.sections?.general) && analysis.sections.general.length > 0 ? (
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  General interpretation
                </Typography>
                <Stack spacing={0.5}>{renderTextBlocks(analysis.sections.general)}</Stack>
              </Stack>
            ) : null}

            {warningsByPriority.notes.length > 0 ? (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Additional notes
                </Typography>
                {warningsByPriority.notes.map((note, index) => (
                  <Typography key={`${note?.code || "note"}-${index}`} variant="body2" sx={{ color: "text.secondary" }}>
                    • {note?.message || "—"}
                  </Typography>
                ))}
              </Stack>
            ) : null}

            <Accordion disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Technical details
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {Array.isArray(analysis?.sections?.technical) &&
                    analysis.sections.technical.length > 0 ? (
                    <Stack spacing={1}>{renderTextBlocks(analysis.sections.technical)}</Stack>
                  ) : null}

                  {Array.isArray(analysis?.insights) && analysis.insights.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Insight codes
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {analysis.insights
                          .map((insight) => insight?.code)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </Typography>
                    </Box>
                  ) : null}

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Model snapshot
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        mt: 0.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: "background.default",
                        overflowX: "auto",
                        fontSize: 12,
                        m: 0,
                      }}
                    >
                      {safeJson(savedAnalysis?.modelSnapshot || {})}
                    </Box>
                  </Box>

                  {(analysis?.metrics || analysis?.evidence) ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Analysis data
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          mt: 0.5,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: "background.default",
                          overflowX: "auto",
                          fontSize: 12,
                          m: 0,
                        }}
                      >
                        {safeJson({
                          metrics: analysis?.metrics || {},
                          evidence: analysis?.evidence || {},
                        })}
                      </Box>
                    </Box>
                  ) : null}

                  {(warningsByPriority.important.length > 0 || warningsByPriority.notes.length > 0) ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Warning trace
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          mt: 0.5,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: "background.default",
                          overflowX: "auto",
                          fontSize: 12,
                          m: 0,
                        }}
                      >
                        {safeJson({
                          important: warningsByPriority.important,
                          notes: warningsByPriority.notes,
                        })}
                      </Box>
                    </Box>
                  ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
};

export default AnalysisSection;

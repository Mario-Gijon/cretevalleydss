import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import { formatSaatyPreferenceLabel, getSaatyScaleValue } from "../operations/saatyPreference.js";
import { explainDiagnosticTriad, formatAHPDiagnosticRatio } from "../operations/explainDiagnosticTriad.js";
import {
  groupRecommendationsByCriterionPair,
  resolveRepresentativeRecommendations,
} from "../operations/resolveRepresentativeRecommendations.js";

const formatCR = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "—";

const containerSx = {
  minWidth: 0,
  p: { xs: 1.15, sm: 1.5 },
  borderColor: "rgba(255,255,255,0.11)",
  borderRadius: 1.5,
  bgcolor: "rgba(255,255,255,0.018)",
};

const quietAccordionSx = {
  bgcolor: "transparent",
  boxShadow: "none",
  borderTop: "1px solid",
  borderColor: "divider",
  "&::before": { display: "none" },
  "&.Mui-expanded": { my: 0 },
  "& .MuiAccordionSummary-root": { minHeight: 38, px: 0 },
  "& .MuiAccordionSummary-content": { my: 0.75 },
  "& .MuiAccordionDetails-root": { px: 0, pt: 0.25, pb: 0.75 },
};

const formatSaaty = (value) => {
  const normalized = getSaatyScaleValue(value);
  if (normalized === 1) return "1";
  return formatSaatyPreferenceLabel(value) || String(value);
};

const getCriterionNames = (criteria) => new Map(
  (Array.isArray(criteria) ? criteria : []).map((criterion) => [criterion.id, criterion.name]),
);

const getRecommendationPair = (recommendation, names) => {
  const comparison = recommendation?.comparison || {};
  const firstName = names.get(comparison.criterionId);
  const secondName = names.get(comparison.comparedCriterionId);
  if (!firstName || !secondName || comparison.criterionId === comparison.comparedCriterionId) return null;
  return { firstName, secondName };
};

const isStrongPreferenceReversal = (recommendation) => {
  const current = recommendation?.currentValue;
  const suggested = recommendation?.suggestedValue;
  if (
    typeof current !== "number" || !Number.isFinite(current) || current <= 0 ||
    typeof suggested !== "number" || !Number.isFinite(suggested) || suggested <= 0
  ) return false;

  const reversesDirection = (current > 1 && suggested < 1) || (current < 1 && suggested > 1);
  const currentStrength = Math.max(current, 1 / current);
  return reversesDirection && currentStrength >= 5;
};

const RecommendationCopy = ({ recommendation, pair, threshold, advanced = false }) => {
  if (!recommendation || !pair) return null;
  const originalCR = formatCR(recommendation.originalCR);
  const counterfactualCR = formatCR(recommendation.counterfactualCR);
  const stillAboveThreshold =
    typeof recommendation.counterfactualCR === "number" &&
    typeof threshold === "number" &&
    recommendation.counterfactualCR > threshold;
  const reversalWarning = isStrongPreferenceReversal(recommendation);

  return (
    <Stack
      spacing={0.35}
      data-testid={advanced ? "ahp-advanced-recommendation" : "ahp-diagnostic-recommendation"}
    >
      <Typography variant={advanced ? "body2" : "body1"} color={advanced ? "text.secondary" : "text.primary"}>
        {advanced
          ? `${pair.firstName} and ${pair.secondName}: ${formatSaaty(recommendation.currentValue)} → ${formatSaaty(recommendation.suggestedValue)} · CR ${originalCR} → ${counterfactualCR}`
          : `One possible change is to reconsider the comparison between ${pair.firstName} and ${pair.secondName}. In this simulation, the consistency ratio would decrease from ${originalCR} to ${counterfactualCR}${stillAboveThreshold ? `. It would still be above ${formatCR(threshold)}` : ""}.`}
      </Typography>
      {reversalWarning ? (
        <Typography variant="body2" color="warning.light">
          This would reverse a strong preference. Consider it only if it reflects what you believe.
        </Typography>
      ) : null}
    </Stack>
  );
};

const AdvancedTriadDetails = ({ triad }) => {
  const criteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
  const explanation = explainDiagnosticTriad(triad);
  if (!explanation) return null;

  return (
    <Stack spacing={0.35} data-testid="ahp-advanced-triad">
      <Typography variant="body2" color="text.secondary">
        {criteria.map((criterion) => criterion.name).join(" · ")}
        {` · discrepancy ${formatCR(triad.multiplicativeDiscrepancy)}`}
        {` · implied ratio ${formatAHPDiagnosticRatio(triad.impliedRatio) || "—"}`}
        {` · direct ratio ${formatAHPDiagnosticRatio(triad.directRatio) || "—"}`}
        {` · cycle ratio ${formatAHPDiagnosticRatio(triad.cycleRatio) || "—"}`}
      </Typography>
    </Stack>
  );
};

const AHPConsistencyDiagnostic = ({
  state,
  onCheck,
  selectedTriad,
  selectedTriadIndex = 0,
  onSelectTriad,
}) => {
  const [otherComparisonsOpen, setOtherComparisonsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const statusKey = `${state?.diagnosticKey ?? ""}:${state?.status}:${state?.data?.consistencyRatio ?? ""}`;

  useEffect(() => {
    setOtherComparisonsOpen(false);
    setAdvancedOpen(false);
  }, [statusKey]);

  const data = state?.data;
  const isReview =
    state?.status === "result" &&
    typeof data?.consistencyRatio === "number" &&
    data.consistencyRatio > data.consistencyThreshold;
  const triads = useMemo(
    () => (Array.isArray(data?.triads) ? data.triads : []),
    [data?.triads],
  );
  const recommendations = useMemo(
    () => (Array.isArray(data?.recommendations) ? data.recommendations : []),
    [data?.recommendations],
  );
  const names = useMemo(() => getCriterionNames(data?.criteria), [data?.criteria]);
  const representativeRecommendations = useMemo(() => {
    return resolveRepresentativeRecommendations(recommendations).flatMap((recommendation) => {
      const pair = getRecommendationPair(recommendation, names);
      return pair ? [{ recommendation, pair }] : [];
    });
  }, [names, recommendations]);
  const recommendationGroups = useMemo(
    () => groupRecommendationsByCriterionPair(recommendations),
    [recommendations],
  );
  const activeTriad = selectedTriad || triads[0] || null;
  const activeExplanation = activeTriad ? explainDiagnosticTriad(activeTriad) : null;

  if (!state || state.status === "disabled") return null;

  return (
    <Paper variant="outlined" sx={containerSx} data-testid="ahp-consistency-diagnostic">
      <Stack spacing={1.1}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <InfoOutlinedIcon fontSize="small" color="info" />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            AHP Consistency
          </Typography>
        </Stack>

        {state.status === "notApplicable" ? (
          <Typography variant="body2" color="text.secondary" role="status">
            CR is not applicable with fewer than three criteria.
          </Typography>
        ) : (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={0.8}
          >
            <Typography variant="body2" color="text.secondary" role="status">
              {state.status === "incomplete"
                ? "Complete all pairwise comparisons to check consistency."
                : state.status === "ready"
                  ? "Consistency has not been checked for the current comparisons."
                  : state.status === "error"
                    ? "Consistency check unavailable. Please try again."
                    : state.status === "checking"
                      ? "Checking your comparisons…"
                      : ""}
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              disabled={state.status === "incomplete" || state.status === "checking"}
              startIcon={state.status === "checking"
                ? <CircularProgress size={14} color="inherit" thickness={5} />
                : undefined}
              onClick={onCheck}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
            >
              {state.status === "checking" ? "Checking..." : "Check CR"}
            </Button>
          </Stack>
        )}

        {state.status === "result" && data ? (
          <>
            <Alert
              severity={isReview ? "warning" : "success"}
              icon={isReview ? <WarningAmberOutlinedIcon fontSize="inherit" /> : <CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ py: 0.2, alignItems: "center", "& .MuiAlert-message": { py: 0.25, width: "100%" } }}
            >
              <Stack spacing={0.25}>
                <Typography variant="body1" sx={{ fontWeight: 750 }}>
                  {isReview
                    ? "Your comparisons are not very consistent."
                    : "Your comparisons are consistent. No major contradictions were found."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CR {formatCR(data.consistencyRatio)} · recommended threshold {formatCR(data.consistencyThreshold)}
                </Typography>
                {isReview ? (
                  <Typography variant="body2" sx={{ pt: 0.4 }}>
                    Some of your judgments seem to contradict each other. You may want to review a few comparisons before submitting.
                  </Typography>
                ) : null}
              </Stack>
            </Alert>

            {isReview ? (
              <Stack spacing={0.75}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 750, mb: 0.35 }}>
                    Why does this happen?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" data-testid="ahp-diagnostic-triad">
                    {activeExplanation?.text || "We could not prepare a simple explanation for this group of comparisons."}
                  </Typography>
                </Box>

                {triads.length > 1 ? (
                  <Accordion
                    expanded={otherComparisonsOpen}
                    onChange={(_, expanded) => setOtherComparisonsOpen(expanded)}
                    disableGutters
                    sx={quietAccordionSx}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>
                        See other comparisons to review
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={0.35}>
                        {triads.map((triad, index) => {
                          if (index === selectedTriadIndex) return null;
                          const triadCriteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
                          const label = triadCriteria.map((criterion) => criterion.name).join(" · ");
                          return (
                            <Button
                              key={triadCriteria.map((criterion) => criterion.id).join(":") || index}
                              variant="text"
                              color="inherit"
                              onClick={() => onSelectTriad?.(index)}
                              aria-label={`Review comparisons involving ${label}`}
                              sx={{ justifyContent: "flex-start", textAlign: "left", py: 0.7, px: 1, color: "text.secondary" }}
                            >
                              <Typography variant="body2">{label}</Typography>
                            </Button>
                          );
                        })}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ) : null}

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 750, mb: 0.25 }}>
                    What can I do?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: representativeRecommendations.length ? 0.8 : 0 }}>
                    Review the comparisons shown above and check whether they reflect your preferences. You do not have to change any answer; nothing is changed automatically.
                  </Typography>
                  {representativeRecommendations.length ? (
                    <Stack spacing={0.85}>
                      {representativeRecommendations.slice(0, 2).map(({ recommendation, pair }, index) => (
                        <RecommendationCopy
                          key={`${recommendation.comparison.criterionId}:${recommendation.comparison.comparedCriterionId}:${index}`}
                          recommendation={recommendation}
                          pair={pair}
                          threshold={data.consistencyThreshold}
                        />
                      ))}
                      <Typography variant="body2" color="text.secondary">
                        These are suggestions to consider, not required corrections. A lower ratio does not mean a change is right for you.
                      </Typography>
                    </Stack>
                  ) : null}
                </Box>
              </Stack>
            ) : null}

            <Accordion
              expanded={advancedOpen}
              onChange={(_, expanded) => setAdvancedOpen(expanded)}
              disableGutters
              sx={quietAccordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  Advanced details
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={0.9}>
                  <Typography variant="body2" color="text.secondary">
                    CI {formatCR(data.consistencyIndex)} · λmax {formatCR(data.lambdaMax)} · CR threshold {formatCR(data.consistencyThreshold)}
                  </Typography>

                  {triads.length ? (
                    <Stack spacing={0.6}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>Comparison discrepancies</Typography>
                      {triads.map((triad, index) => (
                        <AdvancedTriadDetails
                          key={triad?.criteria?.map((criterion) => criterion.id).join(":") || index}
                          triad={triad}
                        />
                      ))}
                    </Stack>
                  ) : null}

                  {recommendations.length ? (
                    <Stack spacing={0.65}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>All DMS simulations</Typography>
                      {recommendationGroups.map((group, groupIndex) => {
                        const representative = group.recommendations[0];
                        const pair = getRecommendationPair(representative, names);
                        if (!pair) return null;
                        return (
                          <Stack key={group.key} spacing={0.55}>
                            <Typography variant="body2" sx={{ fontWeight: 650 }}>
                              {pair.firstName} and {pair.secondName}
                            </Typography>
                            {group.recommendations.map((recommendation, index) => {
                              const recommendationPair = getRecommendationPair(recommendation, names);
                              if (!recommendationPair) return null;
                              return (
                                <RecommendationCopy
                                  key={`${recommendation.comparison.criterionId}:${recommendation.comparison.comparedCriterionId}:${index}`}
                                  recommendation={recommendation}
                                  pair={recommendationPair}
                                  threshold={data.consistencyThreshold}
                                  advanced
                                />
                              );
                            })}
                            {groupIndex < recommendationGroups.length - 1 ? <Divider /> : null}
                          </Stack>
                        );
                      })}
                    </Stack>
                  ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default AHPConsistencyDiagnostic;

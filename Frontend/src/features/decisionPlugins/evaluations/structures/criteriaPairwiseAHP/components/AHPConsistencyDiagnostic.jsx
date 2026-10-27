import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import { formatSaatyPreferenceLabel, getSaatyScaleValue } from "../operations/saatyPreference.js";
import { explainDiagnosticTriad } from "../operations/explainDiagnosticTriad.js";

const formatCR = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "—";

const containerSx = {
  minWidth: 0,
  p: 1.1,
  borderColor: "rgba(255,255,255,0.11)",
  borderRadius: 1.5,
  bgcolor: "rgba(255,255,255,0.018)",
};

const formatSaaty = (value) => {
  const normalized = getSaatyScaleValue(value);
  if (normalized === 1) return "1";
  return formatSaatyPreferenceLabel(value) || String(value);
};

const triadSummary = (triad) => {
  const explanation = explainDiagnosticTriad(triad);
  if (!explanation) return null;
  return explanation;
};

const AHPConsistencyDiagnostic = ({ state, onCheck }) => {
  const [showMoreTriads, setShowMoreTriads] = useState(false);
  const [showMoreRecommendations, setShowMoreRecommendations] = useState(false);
  const statusKey = `${state?.diagnosticKey ?? ""}:${state?.status}:${state?.data?.consistencyRatio ?? ""}`;

  useEffect(() => {
    setShowMoreTriads(false);
    setShowMoreRecommendations(false);
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
  const visibleTriads = showMoreTriads ? triads : triads.slice(0, 1);
  const visibleRecommendations = showMoreRecommendations
    ? recommendations
    : recommendations.slice(0, 3);

  if (!state || state.status === "disabled") return null;

  return (
    <Paper variant="outlined" sx={containerSx} data-testid="ahp-consistency-diagnostic">
      <Stack spacing={0.75}>
        <Stack direction="row" alignItems="center" spacing={0.7}>
          <InfoOutlinedIcon fontSize="small" color="info" />
          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
            AHP Consistency
          </Typography>
        </Stack>

        {state.status === "notApplicable" ? (
          <Typography variant="caption" color="text.secondary" role="status">
            CR not applicable.
          </Typography>
        ) : (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={0.8}
          >
            {state.status === "incomplete" ? (
              <Typography variant="caption" color="text.secondary" role="status">
                Complete all pairwise comparisons to check consistency.
              </Typography>
            ) : null}
            {state.status === "ready" ? (
              <Typography variant="caption" color="text.secondary" role="status">
                Consistency has not been checked for the current comparisons.
              </Typography>
            ) : null}
            {state.status === "error" ? (
              <Typography variant="caption" color="text.secondary" role="status">
                Consistency check unavailable. Please try again.
              </Typography>
            ) : null}
            {state.status !== "disabled" ? (
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
            ) : null}
          </Stack>
        )}

        {state.status === "result" && data ? (
          <>
            <Alert
              severity={isReview ? "warning" : "success"}
              icon={isReview ? <WarningAmberOutlinedIcon fontSize="inherit" /> : <CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ py: 0.15, alignItems: "center", "& .MuiAlert-message": { py: 0.25 } }}
            >
              <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
                {isReview ? "Review consistency" : "Consistent"}
              </Typography>
              <Typography component="span" variant="body2" sx={{ ml: 0.7 }}>
                CR {formatCR(data.consistencyRatio)}
              </Typography>
            </Alert>

            {isReview ? (
              <>
                <Typography variant="caption" color="text.secondary">
                  Some judgments form cycles worth reviewing. No individual comparison is identified as wrong.
                </Typography>
                {visibleTriads.map((triad, index) => {
                  const explanation = triadSummary(triad);
                  if (!explanation) return null;
                  return (
                    <Box
                      key={`${triad?.criteria?.map((criterion) => criterion.id).join(":") || "cycle"}-${index}`}
                      sx={{ pl: 1, borderLeft: "2px solid", borderColor: "warning.main" }}
                      data-testid="ahp-diagnostic-triad"
                    >
                      <Typography variant="caption" color="text.secondary">
                        {explanation.text}
                      </Typography>
                      {explanation.outsideSaatyScale ? (
                        <Typography display="block" variant="caption" color="warning.light">
                          The implied relationship is outside Saaty&apos;s selectable scale.
                        </Typography>
                      ) : null}
                    </Box>
                  );
                })}
                {triads.length > 1 ? (
                  <Button
                    size="small"
                    color="info"
                    onClick={() => setShowMoreTriads((visible) => !visible)}
                    sx={{ alignSelf: "flex-start", minHeight: 26, px: 0.5 }}
                  >
                    {showMoreTriads ? "Show fewer cycles" : `Show ${triads.length - 1} more cycle${triads.length === 2 ? "" : "s"}`}
                  </Button>
                ) : null}

                {recommendations.length ? (
                  <Stack spacing={0.45}>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      Optional mathematical simulations
                    </Typography>
                    {visibleRecommendations.map((recommendation, index) => {
                      const comparison = recommendation?.comparison || {};
                      const names = new Map(
                        (Array.isArray(data.criteria) ? data.criteria : []).map((criterion) => [criterion.id, criterion.name]),
                      );
                      const firstName = names.get(comparison.criterionId) || "Criterion";
                      const secondName = names.get(comparison.comparedCriterionId) || "criterion";
                      return (
                        <Typography
                          key={`${comparison.criterionId || "criterion"}-${comparison.comparedCriterionId || "pair"}-${index}`}
                          variant="caption"
                          color="text.secondary"
                          data-testid="ahp-diagnostic-recommendation"
                        >
                          {firstName} vs {secondName}: {formatSaaty(recommendation.currentValue)} → {formatSaaty(recommendation.suggestedValue)}
                          {` · CR ${formatCR(recommendation.originalCR)} → ${formatCR(recommendation.counterfactualCR)}`}
                          {` · estimated reduction ${formatCR(recommendation.improvement)}`}
                        </Typography>
                      );
                    })}
                    <Typography variant="caption" color="text.secondary">
                      These are simulations only. Keep your judgments if they reflect your preferences; nothing is changed automatically.
                    </Typography>
                    {recommendations.length > 3 ? (
                      <Button
                        size="small"
                        color="info"
                        onClick={() => setShowMoreRecommendations((visible) => !visible)}
                        sx={{ alignSelf: "flex-start", minHeight: 26, px: 0.5 }}
                      >
                        {showMoreRecommendations ? "Show fewer suggestions" : `Show all ${recommendations.length} suggestions`}
                      </Button>
                    ) : null}
                  </Stack>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default AHPConsistencyDiagnostic;

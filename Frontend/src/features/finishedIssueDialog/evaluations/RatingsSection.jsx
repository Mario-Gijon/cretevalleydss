import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import UnsupportedEvaluationStructureAlert from "./components/UnsupportedEvaluationStructureAlert";
import { Fragment } from "react";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages";
import EvaluationStructureRenderer from "../../issueEvaluation/components/EvaluationStructureRenderer";

/**
 * Ratings section of the finished issue dialog.
 *
 * Manages:
 * - Expert selector
 * - Criterion selector (if applicable)
 * - Show collective toggle
 * - Expert criteria weights review
 * - Registered matrix component for the evaluation structure
 *
 * @returns {JSX.Element}
 */
const RatingsSection = () => {
  const theme = useTheme();

  const { ratingsSection } = useFinishedIssueDialogContext();

  const {
    viewIssue,
    selectedExpert,
    setSelectedExpert,
    expertList,
    showCollective,
    setShowCollective,
    canShowCollective,
    evaluations,
    criteriaWeightsEvaluation,
    finalCriteriaWeights,
    shouldShowExpertWeights,
    collectiveEvaluations,
    leafCriteria,
    evaluationStructure,
    unsupportedEvaluationStructure,
  } = ratingsSection;

  if (unsupportedEvaluationStructure) {
    return (
      <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
        <UnsupportedEvaluationStructureAlert />
      </SectionCard>
    );
  }

  if (!evaluationStructure) {
    return null;
  }

  const expertWeightStatus = criteriaWeightsEvaluation?.status || "notRequired";
  const finalWeightsRows = Array.isArray(finalCriteriaWeights?.weights)
    ? finalCriteriaWeights.weights
    : [];
  const orderedLeafCriteria = Array.isArray(leafCriteria) ? leafCriteria : [];
  const runtimeEvaluationContext =
    viewIssue?.evaluationContext &&
    typeof viewIssue.evaluationContext === "object" &&
    Array.isArray(viewIssue.evaluationContext?.alternatives) &&
    Array.isArray(viewIssue.evaluationContext?.criteriaTree) &&
    Array.isArray(viewIssue.evaluationContext?.leafCriteria)
      ? viewIssue.evaluationContext
      : null;

  const finalWeightsByCriterion = finalWeightsRows.reduce((accumulator, entry) => {
    if (entry?.criterionName) {
      accumulator[entry.criterionName] = entry.weight;
    }

    return accumulator;
  }, {});
  const criteriaNamesForWeights = orderedLeafCriteria
    .map((criterion) => criterion?.name)
    .filter(Boolean);

  const formatNumericWeight = (value) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return null;
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 3,
    }).format(Object.is(numeric, -0) ? 0 : numeric);
  };

  const getFinalWeightDisplayValue = (criterionName) => {
    const rawValue = finalWeightsByCriterion?.[criterionName];
    const formatted = formatNumericWeight(rawValue);

    return formatted ?? "—";
  };

  return (
    <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: "100%" }}
        >
          <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
            <InputLabel color="info">Expert</InputLabel>
            <Select
              value={selectedExpert}
              label="Expert"
              color="info"
              onChange={(event) => setSelectedExpert(event.target.value)}
            >
              {expertList.map((expert) => (
                <MenuItem key={expert} value={expert}>
                  {expert}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          {canShowCollective ? (
            <ToggleButton
              selected={showCollective}
              onChange={() => setShowCollective((value) => !value)}
              color="secondary"
              sx={{
                borderRadius: 3,
                borderColor: "rgba(255,255,255,0.14)",
                bgcolor: alpha(theme.palette.background.paper, 0.06),
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.14),
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                },
              }}
            >
              {showCollective ? "Hide collective" : "Show collective"}
            </ToggleButton>
          ) : null}
        </Stack>

        <Divider sx={{ opacity: 0.14 }} />

        {shouldShowExpertWeights ? (
          <>
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 2.5,
                border: "1px solid rgba(255,255,255,0.08)",
                bgcolor: alpha(theme.palette.common.white, 0.025),
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
                Weights
              </Typography>

              {criteriaWeightsEvaluation?.payload ? (
                <Box sx={{ width: "100%", minWidth: 0 }}>
                  <EvaluationStructureRenderer
                    issue={{
                      ...viewIssue,
                      criteria: Array.isArray(viewIssue?.summary?.criteria)
                        ? viewIssue.summary.criteria
                        : [],
                    }}
                    stage={EVALUATION_STAGES.CRITERIA_WEIGHTING}
                    structureKey={
                      criteriaWeightsEvaluation?.structureKey ||
                      viewIssue?.summary?.criteriaWeightsStructureKey ||
                      ""
                    }
                    backendPayload={criteriaWeightsEvaluation.payload}
                    readOnly
                  />
                </Box>
              ) : expertWeightStatus === "notRequired" ? (
                <Typography variant="body2" color="text.secondary">
                  Criteria weights are not required for this issue.
                </Typography>
              ) : expertWeightStatus === "notSubmitted" ? (
                <Typography variant="body2" color="text.secondary">
                  Expert did not submit criteria weights.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No criteria-weight payload available.
                </Typography>
              )}

              {criteriaNamesForWeights.length > 0 ? (
                <>
                  <Divider sx={{ opacity: 0.14, my: 1.25 }} />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "max-content max-content",
                      },
                      columnGap: { xs: 0, sm: 2.5 },
                      rowGap: 0.75,
                      alignItems: "center",
                      width: "fit-content",
                      maxWidth: "100%",
                    }}
                  >
                    {criteriaNamesForWeights.map((criterionName) => (
                      <Fragment key={criterionName}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 750,
                            pr: { xs: 0, sm: 1 },
                          }}
                        >
                          {criterionName}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Final:{" "}
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ color: "text.primary", fontWeight: 700 }}
                          >
                            {getFinalWeightDisplayValue(criterionName)}
                          </Typography>
                        </Typography>
                      </Fragment>
                    ))}
                  </Box>
                </>
              ) : null}
            </Box>

            <Divider sx={{ opacity: 0.14 }} />
          </>
        ) : null}

        <Box sx={{ width: "100%", minWidth: 0 }}>
          <EvaluationStructureRenderer
            evaluationContext={runtimeEvaluationContext}
            issue={{
              ...viewIssue,
              alternatives: runtimeEvaluationContext?.alternatives || [],
              criteria: runtimeEvaluationContext?.criteriaTree || [],
            }}
            stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
            structureKey={evaluationStructure}
            backendPayload={evaluations || {}}
            collectivePayload={showCollective ? collectiveEvaluations || null : null}
            readOnly
          />
        </Box>
      </Stack>
    </SectionCard>
  );
};

export default RatingsSection;

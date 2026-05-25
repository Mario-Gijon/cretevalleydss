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

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import UnsupportedEvaluationStructureAlert from "../shared/UnsupportedEvaluationStructureAlert";
import { Fragment } from "react";
import { EVALUATION_STAGES } from "../../../issueEvaluation/evaluation.constants";

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
    selectedCriterion,
    setSelectedCriterion,
    expertList,
    criterionList,
    showCriterionSelector,
    showCollective,
    setShowCollective,
    canShowCollective,
    evaluations,
    criteriaWeightsEvaluation,
    finalCriteriaWeights,
    shouldShowExpertWeights,
    collectiveEvaluations,
    leafNames,
    Matrix,
    unsupportedEvaluationStructure,
  } = ratingsSection;

  if (unsupportedEvaluationStructure) {
    return (
      <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
        <UnsupportedEvaluationStructureAlert />
      </SectionCard>
    );
  }

  if (!Matrix) {
    return null;
  }

  const expertWeightStatus = criteriaWeightsEvaluation?.status || "notRequired";
  const expertWeightsByCriterion =
    criteriaWeightsEvaluation?.weightsByCriterion || null;

  const finalWeightsRows = Array.isArray(finalCriteriaWeights?.weights)
    ? finalCriteriaWeights.weights
    : [];

  const finalWeightsByCriterion = finalWeightsRows.reduce((accumulator, entry) => {
    if (entry?.criterionName) {
      accumulator[entry.criterionName] = entry.weight;
    }

    return accumulator;
  }, {});

  const criteriaNamesForWeights = [
    ...new Set(
      [
        ...(Array.isArray(leafNames) ? leafNames : []),
        ...finalWeightsRows.map((entry) => entry?.criterionName).filter(Boolean),
        ...Object.keys(expertWeightsByCriterion || {}),
      ].filter(Boolean)
    ),
  ];

  const formatNumericWeight = (value) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return null;
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 3,
    }).format(Object.is(numeric, -0) ? 0 : numeric);
  };

  const getExpertWeightDisplayValue = (criterionName) => {
    const rawValue = expertWeightsByCriterion?.[criterionName];
    const formatted = formatNumericWeight(rawValue);

    if (formatted !== null) return formatted;
    if (expertWeightStatus === "draft") return "Draft";
    if (expertWeightStatus === "notRequired") return "Not required";

    return "Not submitted";
  };

  const getFinalWeightDisplayValue = (criterionName) => {
    const rawValue = finalWeightsByCriterion?.[criterionName];
    const formatted = formatNumericWeight(rawValue);

    return formatted ?? "—";
  };

  const evaluationContext = {
    issue: viewIssue,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    structureKey: ratingsSection.evaluationStructure || "",
    alternatives: viewIssue?.summary?.alternatives || [],
    criteria: leafNames || [],
    payload: evaluations,
    setPayload: () => {},
    collectivePayload: collectiveEvaluations || {},
    permitEdit: false,
    selectedCriterion,
    setSelectedCriterion,
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
              onChange={(event) => {
                const value = event.target.value;
                setSelectedExpert(value);

                const newCriteria = criterionList;
                setSelectedCriterion(newCriteria[0] || "");
              }}
            >
              {expertList.map((expert) => (
                <MenuItem key={expert} value={expert}>
                  {expert}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showCriterionSelector ? (
            <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
              <InputLabel color="info">Criterion</InputLabel>
              <Select
                value={selectedCriterion}
                label="Criterion"
                color="info"
                onChange={(event) => setSelectedCriterion(event.target.value)}
              >
                {criterionList.map((criterion) => (
                  <MenuItem key={criterion} value={criterion}>
                    {criterion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

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

              {criteriaNamesForWeights.length > 0 ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "max-content max-content max-content",
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
                        Expert:{" "}
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: "text.primary", fontWeight: 700 }}
                        >
                          {getExpertWeightDisplayValue(criterionName)}
                        </Typography>
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
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No weights available
                </Typography>
              )}
            </Box>

            <Divider sx={{ opacity: 0.14 }} />
          </>
        ) : null}

        <Matrix evaluationContext={evaluationContext} />
      </Stack>
    </SectionCard>
  );
};

export default RatingsSection;

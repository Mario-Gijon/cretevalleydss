import { useMemo } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";

import { manualCriteriaWeightsViewSx } from "./ManualCriteriaWeightsView.styles";
import WeightField from "./components/WeightField";
import { resolveCollective } from "./operations/resolveCollective";
import { resolveCriteria } from "./operations/resolveCriteria";
import { updateWeight } from "./operations/updateWeight";
import { validateEvaluation } from "./operations/validateEvaluation";

const EMPTY_ITEMS = Object.freeze([]);

const ManualCriteriaWeightsView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const criteriaResolution = useMemo(() => {
    try {
      return {
        criteria: resolveCriteria({ decisionContext }),
        message: "",
      };
    } catch (error) {
      return {
        criteria: null,
        message:
          error instanceof Error
            ? error.message
            : "Manual-weight criteria are invalid.",
      };
    }
  }, [decisionContext]);
  const criteria = criteriaResolution.criteria || EMPTY_ITEMS;
  const evaluationResolution = useMemo(() => {
    if (!criteriaResolution.criteria) {
      return { payload: null, message: criteriaResolution.message };
    }

    try {
      const payload = validateEvaluation({ criteria, evaluation });

      return { payload, message: "" };
    } catch (error) {
      return {
        payload: null,
        message:
          error instanceof Error
            ? error.message
            : "Manual-weight evaluation is invalid.",
      };
    }
  }, [criteria, criteriaResolution.criteria, criteriaResolution.message, evaluation]);
  const collectiveResolution = useMemo(() => {
    try {
      return {
        payload: resolveCollective({ criteria, collectiveEvaluation }),
        message: "",
      };
    } catch (error) {
      return {
        payload: null,
        message:
          error instanceof Error
            ? error.message
            : "Manual-weight collective evaluation is invalid.",
      };
    }
  }, [collectiveEvaluation, criteria]);

  if (loading === true && evaluation == null) {
    return null;
  }

  if (criteriaResolution.message) {
    return <Alert severity="error">{criteriaResolution.message}</Alert>;
  }

  if (criteria.length === 0) {
    return (
      <Typography variant="body2" sx={manualCriteriaWeightsViewSx.empty}>
        No criteria available.
      </Typography>
    );
  }

  if (!evaluationResolution.payload) {
    return <Alert severity="error">{evaluationResolution.message}</Alert>;
  }

  const currentEvaluation = evaluationResolution.payload;
  const permitEdit = readOnly !== true && loading !== true;

  const handleWeightChange = ({ criterionId, rawValue }) => {
    if (!permitEdit) {
      return;
    }

    const nextEvaluation = updateWeight({
      evaluation: currentEvaluation,
      criteria,
      criterionId,
      rawValue,
    });

    if (nextEvaluation !== currentEvaluation) {
      setEvaluation(nextEvaluation);
    }
  };

  return (
    <Stack spacing={2.2} sx={manualCriteriaWeightsViewSx.container}>
      {collectiveResolution.message ? (
        <Alert severity="error">{collectiveResolution.message}</Alert>
      ) : null}

      <Box sx={manualCriteriaWeightsViewSx.content}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={manualCriteriaWeightsViewSx.title}>
            Assign each criterion a weight between 0 and 1. Submitted weights must sum to 1.
          </Typography>

          <Box sx={manualCriteriaWeightsViewSx.content}>
            <Stack spacing={1.1} sx={manualCriteriaWeightsViewSx.fields}>
              {criteria.map((criterion) => (
                <WeightField
                  key={criterion.id}
                  criterion={criterion}
                  value={currentEvaluation.weightsByCriterion[criterion.id]}
                  collectiveValue={
                    collectiveResolution.payload
                      ? collectiveResolution.payload.weightsByCriterion[criterion.id]
                      : null
                  }
                  permitEdit={permitEdit}
                  onChange={(rawValue) =>
                    handleWeightChange({ criterionId: criterion.id, rawValue })
                  }
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};

export default ManualCriteriaWeightsView;

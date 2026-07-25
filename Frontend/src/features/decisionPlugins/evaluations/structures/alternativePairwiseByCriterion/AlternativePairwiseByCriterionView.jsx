import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";

import { alternativePairwiseByCriterionViewSx } from "./AlternativePairwiseByCriterionView.styles";
import CriterionSelector from "./components/CriterionSelector";
import PairwiseMatrix from "./components/PairwiseMatrix";
import { resolveCollective } from "./operations/resolveCollective";
import { updateValue } from "./operations/updateValue";
import { validateEvaluation } from "./operations/validateEvaluation";

const EMPTY_ITEMS = Object.freeze([]);

const AlternativePairwiseByCriterionView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const alternatives = Array.isArray(decisionContext?.alternatives)
    ? decisionContext.alternatives
    : EMPTY_ITEMS;
  const criteria = Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria
    : EMPTY_ITEMS;
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const safeCurrentCriterionIndex = Math.max(
    0,
    Math.min(currentCriterionIndex, Math.max(criteria.length - 1, 0))
  );
  const currentCriterion = criteria[safeCurrentCriterionIndex] || null;
  const permitEdit = readOnly !== true && loading !== true;

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [criteria.length]);

  const evaluationResolution = useMemo(() => {
    try {
      return {
        payload: validateEvaluation({
          alternatives,
          criteria,
          evaluation,
        }),
        message: "",
      };
    } catch (error) {
      return {
        payload: null,
        message:
          error instanceof Error
            ? error.message
            : "Pairwise evaluation payload is invalid.",
      };
    }
  }, [alternatives, criteria, evaluation]);

  const collectiveResolution = useMemo(() => {
    try {
      return {
        payload: resolveCollective({
          alternatives,
          criteria,
          collectiveEvaluation,
        }),
        message: "",
      };
    } catch (error) {
      return {
        payload: null,
        message:
          error instanceof Error
            ? error.message
            : "Collective pairwise payload is invalid.",
      };
    }
  }, [alternatives, collectiveEvaluation, criteria]);

  if (loading === true && evaluation == null) {
    return null;
  }

  if (criteria.length === 0) {
    return (
      <Typography variant="body2" sx={alternativePairwiseByCriterionViewSx.empty}>
        No criteria available.
      </Typography>
    );
  }

  if (alternatives.length === 0) {
    return (
      <Typography variant="body2" sx={alternativePairwiseByCriterionViewSx.empty}>
        No alternatives available.
      </Typography>
    );
  }

  if (!evaluationResolution.payload) {
    return (
      <Alert severity="error">
        {evaluationResolution.message || "Pairwise evaluation payload is invalid."}
      </Alert>
    );
  }

  const handleValueChange = ({
    rowAlternativeId,
    columnAlternativeId,
    nextValue,
  }) => {
    const nextEvaluation = updateValue({
      evaluation,
      alternatives,
      criterionId: currentCriterion.id,
      rowAlternativeId,
      columnAlternativeId,
      nextValue,
      expressionDomain: currentCriterion.expressionDomain,
    });

    setEvaluation(nextEvaluation);
  };

  return (
    <Box sx={alternativePairwiseByCriterionViewSx.container}>
      <Stack spacing={1.2}>
        {collectiveResolution.message ? (
          <Alert severity="error" sx={alternativePairwiseByCriterionViewSx.alert}>
            {collectiveResolution.message}
          </Alert>
        ) : null}
        <CriterionSelector
          criteria={criteria}
          currentIndex={safeCurrentCriterionIndex}
          onSelectCriterion={setCurrentCriterionIndex}
          onPreviousCriterion={() =>
            setCurrentCriterionIndex((previous) => Math.max(previous - 1, 0))
          }
          onNextCriterion={() =>
            setCurrentCriterionIndex((previous) =>
              Math.min(previous + 1, criteria.length - 1)
            )
          }
        />
        <PairwiseMatrix
          alternatives={alternatives}
          evaluation={evaluationResolution.payload[currentCriterion.id]}
          collectiveEvaluation={
            collectiveResolution.payload?.[currentCriterion.id] ?? null
          }
          expressionDomain={currentCriterion.expressionDomain}
          permitEdit={permitEdit}
          onChange={handleValueChange}
        />
      </Stack>
    </Box>
  );
};

export default AlternativePairwiseByCriterionView;

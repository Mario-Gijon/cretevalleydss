import { useEffect, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";

import PairwiseAlternativesGrid from "./components/PairwiseAlternativesGrid";
import CriterionCompactSelector from "./components/CriterionCompactSelector";
import { resolveAlternativePairwiseContext } from "./operations/resolveAlternativePairwiseContext";
import { resolveCollectiveAlternativePairwiseMatrix } from "./operations/resolveCollectiveAlternativePairwiseMatrix";
import { updateCriterionAlternativePairwiseEvaluation } from "./operations/updateCriterionAlternativePairwiseEvaluation";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const AlternativePairwiseByCriterionView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const { alternatives: alternativeItems, criteria: criteriaItems } =
    resolveAlternativePairwiseContext(decisionContext);
  const permitEdit = readOnly !== true && loading !== true;
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [criteriaItems.length]);

  if (criteriaItems.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  if (alternativeItems.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No alternatives available.
      </Typography>
    );
  }

  const safeCurrentCriterionIndex = Math.max(
    0,
    Math.min(currentCriterionIndex, Math.max(criteriaItems.length - 1, 0))
  );
  const currentCriterion = criteriaItems[safeCurrentCriterionIndex] || null;

  if (loading && !isPlainObject(evaluation)) {
    return null;
  }

  if (!loading && !isPlainObject(evaluation)) {
    return <Alert severity="error">Pairwise evaluation payload is unavailable.</Alert>;
  }

  if (
    !loading &&
    currentCriterion &&
    !Object.prototype.hasOwnProperty.call(evaluation, currentCriterion.id)
  ) {
    return <Alert severity="error">Pairwise criterion payload is unavailable.</Alert>;
  }

  let collectiveEvaluations = null;
  if (collectiveEvaluation !== null && collectiveEvaluation !== undefined) {
    try {
      collectiveEvaluations = resolveCollectiveAlternativePairwiseMatrix({
        collectiveEvaluation,
        criterionId: currentCriterion.id,
        alternatives: alternativeItems,
      });
    } catch (error) {
      return <Alert severity="error">{error instanceof Error ? error.message : "Collective pairwise payload is invalid."}</Alert>;
    }
  }

  return (
    <Stack spacing={1.25} sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: "none",
          minWidth: 0,
          p: { xs: 1, sm: 1.5 },
          overflow: "hidden",
        }}
      >
        <Stack spacing={1.2}>
          <CriterionCompactSelector
            criteria={criteriaItems}
            currentIndex={safeCurrentCriterionIndex}
            onSelectCriterion={setCurrentCriterionIndex}
            onPreviousCriterion={() => setCurrentCriterionIndex((previous) => Math.max(previous - 1, 0))}
            onNextCriterion={() => setCurrentCriterionIndex((previous) => Math.min(previous + 1, criteriaItems.length - 1))}
          />

          {currentCriterion ? (
            <Stack spacing={0.75}>
              <PairwiseAlternativesGrid
                alternatives={alternativeItems}
                evaluations={evaluation[currentCriterion.id]}
                setEvaluations={(nextComparisons) => {
                  if (!permitEdit) {
                    return;
                  }

                  setEvaluation(
                    updateCriterionAlternativePairwiseEvaluation({
                      evaluation,
                      criterionId: currentCriterion.id,
                      nextComparisons,
                    })
                  );
                }}
                expressionDomain={currentCriterion.expressionDomain}
                collectiveEvaluations={collectiveEvaluations}
                permitEdit={permitEdit}
              />
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
};

export default AlternativePairwiseByCriterionView;

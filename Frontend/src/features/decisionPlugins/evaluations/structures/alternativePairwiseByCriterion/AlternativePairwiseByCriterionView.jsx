import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";

import PairwiseAlternativesGrid from "./components/PairwiseAlternativesGrid";
import CriterionCompactSelector from "./components/CriterionCompactSelector";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const AlternativePairwiseByCriterionView = (
  {
    evaluationContext,
    evaluationPayload,
    setEvaluationPayload,
    collectivePayload,
    readOnly,
    loading,
  },
  ref
) => {
  const alternativeItems = Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives
        .map((alternative) => ({
          id: String(alternative?.id ?? alternative?._id ?? "").trim(),
          name: String(alternative?.name ?? "").trim(),
        }))
        .filter((alternative) => alternative.id && alternative.name)
    : [];
  const criteriaItems = Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          ...criterion,
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
  const evaluationsByCriterion =
    evaluationPayload && typeof evaluationPayload === "object" && !Array.isArray(evaluationPayload)
      ? evaluationPayload
      : {};
  const collectiveEvaluationsByCriterion =
    collectivePayload && typeof collectivePayload === "object" && !Array.isArray(collectivePayload)
      ? collectivePayload
      : {};
  const permitEdit = readOnly !== true && loading !== true;
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);

  useEffect(() => {
    setCurrentCriterionIndex(0);
  }, [criteriaItems.length]);

  useImperativeHandle(ref, () => ({}));

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
          {criteriaItems.length > 1 ? (
            <CriterionCompactSelector
              criteria={criteriaItems}
              currentIndex={safeCurrentCriterionIndex}
              onSelectCriterion={setCurrentCriterionIndex}
              onPreviousCriterion={() =>
                setCurrentCriterionIndex((previous) => Math.max(previous - 1, 0))
              }
              onNextCriterion={() =>
                setCurrentCriterionIndex((previous) =>
                  Math.min(previous + 1, criteriaItems.length - 1)
                )
              }
            />
          ) : null}

          {currentCriterion ? (
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {currentCriterion.name}
              </Typography>

              <PairwiseAlternativesGrid
                alternatives={alternativeItems}
                evaluations={evaluationsByCriterion?.[currentCriterion.id] || {}}
                setEvaluations={(nextComparisons) => {
                  if (!permitEdit) {
                    return;
                  }

                  setEvaluationPayload((previous) => ({
                    ...(isPlainObject(previous) ? previous : {}),
                    [currentCriterion.id]: nextComparisons,
                  }));
                }}
                collectiveEvaluations={
                  collectiveEvaluationsByCriterion?.[currentCriterion.id] || null
                }
                permitEdit={permitEdit}
              />
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
};

export default forwardRef(AlternativePairwiseByCriterionView);

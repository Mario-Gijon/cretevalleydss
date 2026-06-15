import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import PairwiseAlternativeMatrix from "./PairwiseAlternativeMatrix";
import CriterionCompactSelector from "./CriterionCompactSelector";
import { sectionSx } from "../../styles/alternativeEvaluationDialog.styles";

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
  const theme = useTheme();
  const alternativeItems = Array.isArray(evaluationContext?.alternatives?.items)
    ? evaluationContext.alternatives.items
    : [];
  const alternativeNames = Array.isArray(evaluationContext?.alternatives?.names)
    ? evaluationContext.alternatives.names
    : alternativeItems
        .map((alternative) => String(alternative?.name || "").trim())
        .filter(Boolean);
  const criteriaItems = Array.isArray(evaluationContext?.criteria?.leafItems)
    ? evaluationContext.criteria.leafItems
    : [];
  const criterionNames = Array.isArray(evaluationContext?.criteria?.leafNames)
    ? evaluationContext.criteria.leafNames
    : criteriaItems.map((criterion) => String(criterion?.name || "").trim()).filter(Boolean);
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
  }, [criterionNames.length]);

  useImperativeHandle(ref, () => ({}));

  if (criterionNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  if (alternativeNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No alternatives available.
      </Typography>
    );
  }

  const safeCurrentCriterionIndex = Math.max(
    0,
    Math.min(currentCriterionIndex, Math.max(criterionNames.length - 1, 0))
  );
  const currentCriterionName = criterionNames[safeCurrentCriterionIndex] || null;

  return (
    <Stack spacing={1.25} sx={{ maxWidth: 1200, mx: "auto" }}>
      <Box
        sx={{
          ...sectionSx(theme),
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
                  Math.min(previous + 1, criterionNames.length - 1)
                )
              }
            />
          ) : null}

          {currentCriterionName ? (
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {currentCriterionName}
              </Typography>

              <PairwiseAlternativeMatrix
                alternatives={alternativeNames}
                evaluations={evaluationsByCriterion?.[currentCriterionName] || []}
                setEvaluations={(nextRows) => {
                  if (!permitEdit) {
                    return;
                  }

                  setEvaluationPayload((previous) => ({
                    ...(previous && typeof previous === "object" ? previous : {}),
                    [currentCriterionName]: nextRows,
                  }));
                }}
                collectiveEvaluations={
                  collectiveEvaluationsByCriterion?.[currentCriterionName] || []
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

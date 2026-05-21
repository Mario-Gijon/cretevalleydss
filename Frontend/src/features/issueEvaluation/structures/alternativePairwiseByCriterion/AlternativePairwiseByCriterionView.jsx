import { Stack, Typography } from "@mui/material";

import PairwiseAlternativeMatrix from "./PairwiseAlternativeMatrix";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveCriterionName = (criterionEntry) => {
  if (typeof criterionEntry === "string") {
    return criterionEntry;
  }

  if (criterionEntry && typeof criterionEntry === "object") {
    return String(criterionEntry.name || "").trim();
  }

  return "";
};

const AlternativePairwiseByCriterionView = ({ evaluationContext }) => {
  const {
    alternatives = [],
    criteria = [],
    payload,
    setPayload,
    collectivePayload = {},
    permitEdit = false,
    selectedCriterion,
  } = evaluationContext || {};

  const criteriaFromContext = Array.isArray(criteria)
    ? criteria.map(resolveCriterionName).filter(Boolean)
    : [];

  const evaluationsByCriterion = isPlainObject(payload) ? payload : {};
  const collectiveEvaluationsByCriterion = isPlainObject(collectivePayload)
    ? collectivePayload
    : {};

  const resolvedCriteria =
    criteriaFromContext.length > 0
      ? criteriaFromContext
      : Object.keys(isPlainObject(evaluationsByCriterion) ? evaluationsByCriterion : {});

  const visibleCriteria =
    selectedCriterion && resolvedCriteria.includes(selectedCriterion)
      ? [selectedCriterion]
      : resolvedCriteria;

  if (resolvedCriteria.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No pairwise evaluations found.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.2}>
      {visibleCriteria.map((criterionName) => (
        <Stack key={criterionName} spacing={0.75}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {criterionName}
          </Typography>

          <PairwiseAlternativeMatrix
            alternatives={alternatives}
            evaluations={evaluationsByCriterion?.[criterionName] || []}
            setEvaluations={(nextRows) => {
              if (!permitEdit) {
                return;
              }

              setPayload?.((previous) => ({
                ...(isPlainObject(previous) ? previous : {}),
                [criterionName]: nextRows,
              }));
            }}
            collectiveEvaluations={collectiveEvaluationsByCriterion?.[criterionName] || []}
            permitEdit={permitEdit}
          />
        </Stack>
      ))}
    </Stack>
  );
};

export default AlternativePairwiseByCriterionView;

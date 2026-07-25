import { useMemo } from "react";
import { Alert, Divider, Stack, Typography } from "@mui/material";

import { bestWorstCriteriaViewSx } from "./BestWorstCriteriaView.styles";
import CollectiveWeights from "./components/CollectiveWeights";
import ComparisonSection from "./components/ComparisonSection";
import { buildEmptyPayload } from "./operations/buildEmptyPayload";
import { resolveCollective } from "./operations/resolveCollective";
import { resolveCriteria } from "./operations/resolveCriteria";
import { updateComparison } from "./operations/updateComparison";
import { updateSelection } from "./operations/updateSelection";
import { validateEvaluation } from "./operations/validateEvaluation";

const EMPTY_ITEMS = Object.freeze([]);

const BestWorstCriteriaView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const sourceCriteria =
    decisionContext?.leafCriteria === undefined
      ? EMPTY_ITEMS
      : decisionContext.leafCriteria;
  const criteriaResolution = useMemo(() => {
    try {
      return {
        criteria: resolveCriteria({
          decisionContext: { leafCriteria: sourceCriteria },
        }),
        message: "",
      };
    } catch (error) {
      return {
        criteria: null,
        message:
          error instanceof Error ? error.message : "BWM criteria are invalid.",
      };
    }
  }, [sourceCriteria]);
  const criteria = criteriaResolution.criteria || EMPTY_ITEMS;
  const evaluationResolution = useMemo(() => {
    if (!criteriaResolution.criteria) {
      return { payload: null, message: criteriaResolution.message };
    }

    try {
      const payload =
        evaluation === null || evaluation === undefined
          ? buildEmptyPayload({ criteria })
          : validateEvaluation({ criteria, evaluation });

      return { payload, message: "" };
    } catch (error) {
      return {
        payload: null,
        message:
          error instanceof Error ? error.message : "BWM evaluation is invalid.",
      };
    }
  }, [
    criteria,
    criteriaResolution.criteria,
    criteriaResolution.message,
    evaluation,
  ]);
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
            : "BWM collective evaluation is invalid.",
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
      <Typography variant="body2" sx={bestWorstCriteriaViewSx.empty}>
        No criteria available.
      </Typography>
    );
  }

  if (!evaluationResolution.payload) {
    return <Alert severity="error">{evaluationResolution.message}</Alert>;
  }

  const currentEvaluation = evaluationResolution.payload;
  const permitEdit = readOnly !== true && loading !== true;
  const longestCriterionLength = criteria.reduce(
    (maximum, criterion) => Math.max(maximum, criterion.name.length),
    0
  );
  const labelWidth = `${Math.min(
    Math.max(longestCriterionLength + 2, 10),
    28
  )}ch`;

  const handleSelectionChange = ({ selection, criterionId }) => {
    if (!permitEdit) {
      return;
    }

    const nextEvaluation = updateSelection({
      evaluation: currentEvaluation,
      criteria,
      selection,
      criterionId,
    });

    setEvaluation(nextEvaluation);
  };

  const handleComparisonChange = ({ comparison, criterionId, value }) => {
    if (!permitEdit) {
      return;
    }

    const nextEvaluation = updateComparison({
      evaluation: currentEvaluation,
      criteria,
      comparison,
      criterionId,
      value,
    });

    if (nextEvaluation !== currentEvaluation) {
      setEvaluation(nextEvaluation);
    }
  };

  return (
    <Stack spacing={1.5} sx={bestWorstCriteriaViewSx.container}>
      {collectiveResolution.message ? (
        <Alert severity="error">{collectiveResolution.message}</Alert>
      ) : null}

      {collectiveResolution.payload ? (
        <CollectiveWeights
          criteria={criteria}
          weightsByCriterion={
            collectiveResolution.payload.weightsByCriterion
          }
        />
      ) : null}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 5 }}
        alignItems="flex-start"
        sx={bestWorstCriteriaViewSx.sections}
      >
        <ComparisonSection
          title="Best to others"
          selectorLabel="Best criterion"
          selectedCriterionId={currentEvaluation.bestCriterionId}
          excludedCriterionId={currentEvaluation.worstCriterionId}
          criteria={criteria}
          comparisons={currentEvaluation.bestToOthers}
          labelWidth={labelWidth}
          permitEdit={permitEdit}
          onSelect={(criterionId) =>
            handleSelectionChange({ selection: "best", criterionId })
          }
          onComparisonChange={(criterionId, value) =>
            handleComparisonChange({
              comparison: "bestToOthers",
              criterionId,
              value,
            })
          }
        />

        <Divider
          orientation="vertical"
          flexItem
          sx={bestWorstCriteriaViewSx.verticalDivider}
        />
        <Divider sx={bestWorstCriteriaViewSx.horizontalDivider} />

        <ComparisonSection
          title="Others to worst"
          selectorLabel="Worst criterion"
          selectedCriterionId={currentEvaluation.worstCriterionId}
          excludedCriterionId={currentEvaluation.bestCriterionId}
          criteria={criteria}
          comparisons={currentEvaluation.othersToWorst}
          labelWidth={labelWidth}
          permitEdit={permitEdit}
          onSelect={(criterionId) =>
            handleSelectionChange({ selection: "worst", criterionId })
          }
          onComparisonChange={(criterionId, value) =>
            handleComparisonChange({
              comparison: "othersToWorst",
              criterionId,
              value,
            })
          }
        />
      </Stack>

      <Typography variant="caption" sx={bestWorstCriteriaViewSx.guidance}>
        Use integer values from 1 to 9.
      </Typography>
    </Stack>
  );
};

export default BestWorstCriteriaView;

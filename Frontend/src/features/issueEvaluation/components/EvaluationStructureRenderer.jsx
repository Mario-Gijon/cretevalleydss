import { useMemo } from "react";
import { Alert, Box } from "@mui/material";

import { getEvaluationStructureEntryForStage } from "../../decisionPlugins/evaluations";
import { buildDecisionContext } from "../logic/buildDecisionContext";
import { requireCompleteEvaluationObject } from "../logic/requireCompleteEvaluationObject";

const READ_ONLY_SET_EVALUATION = (nextEvaluation) => {
  requireCompleteEvaluationObject(nextEvaluation);
};

const EvaluationStructureRenderer = ({
  decisionContext: providedDecisionContext = null,
  issue,
  stage,
  structureKey,
  evaluation: providedEvaluation = null,
  collectiveEvaluation = null,
  readOnly = false,
  loading = false,
}) => {
  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey,
        stage,
      }),
    [stage, structureKey]
  );
  const View = structureEntry?.View || null;
  const decisionContext = useMemo(
    () => {
      if (providedDecisionContext && typeof providedDecisionContext === "object") {
        return providedDecisionContext;
      }

      if (!issue) {
        return null;
      }

      return buildDecisionContext({
        issue,
        stage,
        structure: structureEntry,
        alternatives: issue?.alternatives || [],
        criteriaTree: issue?.criteria || [],
      });
    },
    [providedDecisionContext, issue, stage, structureEntry]
  );
  if (!View || !decisionContext) {
    return null;
  }
  if (loading !== true && providedEvaluation == null) {
    return (
      <Alert severity="error">
        Evaluation payload is unavailable.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <View
        decisionContext={decisionContext}
        evaluation={providedEvaluation}
        setEvaluation={READ_ONLY_SET_EVALUATION}
        collectiveEvaluation={collectiveEvaluation}
        readOnly={readOnly === true}
        loading={loading === true}
      />
    </Box>
  );
};

export default EvaluationStructureRenderer;

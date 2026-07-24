import { useMemo } from "react";
import { Box } from "@mui/material";

import { getEvaluationStructureEntryForStage } from "../../decisionPlugins/evaluations/registry";
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
  const evaluation = useMemo(() => {
    if (!decisionContext) {
      return {};
    }

    return providedEvaluation ?? {};
  }, [decisionContext, providedEvaluation]);

  if (!View || !decisionContext) {
    return null;
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <View
        decisionContext={decisionContext}
        evaluation={evaluation}
        setEvaluation={READ_ONLY_SET_EVALUATION}
        collectiveEvaluation={collectiveEvaluation}
        readOnly={readOnly === true}
        loading={loading === true}
      />
    </Box>
  );
};

export default EvaluationStructureRenderer;

import { useMemo } from "react";
import { Box } from "@mui/material";

import { getEvaluationStructureEntryForStage } from "../../decisionPlugins/evaluations/evaluationStructureRegistry";
import { buildEvaluationContext } from "../logic/buildEvaluationContext";

const NOOP = () => {};

const EvaluationStructureRenderer = ({
  evaluationContext: providedEvaluationContext = null,
  issue,
  stage,
  structureKey,
  backendPayload = null,
  collectivePayload = null,
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
  const evaluationContext = useMemo(
    () => {
      if (providedEvaluationContext && typeof providedEvaluationContext === "object") {
        return providedEvaluationContext;
      }

      if (!issue) {
        return null;
      }

      return buildEvaluationContext({
        issue,
        stage,
        structure: structureEntry,
        alternatives: issue?.alternatives || [],
        criteriaTree: issue?.criteria || [],
      });
    },
    [providedEvaluationContext, issue, stage, structureEntry]
  );
  const evaluationPayload = useMemo(() => {
    if (!evaluationContext) {
      return {};
    }

    return backendPayload ?? {};
  }, [evaluationContext, backendPayload]);

  if (!View || !evaluationContext) {
    return null;
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <View
        evaluationContext={evaluationContext}
        evaluationPayload={evaluationPayload}
        setEvaluationPayload={NOOP}
        collectivePayload={collectivePayload}
        readOnly={readOnly === true}
        loading={loading === true}
      />
    </Box>
  );
};

export default EvaluationStructureRenderer;

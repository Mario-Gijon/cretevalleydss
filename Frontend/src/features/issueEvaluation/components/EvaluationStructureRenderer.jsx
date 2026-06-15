import { useMemo } from "react";

import { getEvaluationStructureEntryForStage } from "../evaluationStructureRegistry";
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
  const adapter = structureEntry?.adapter || null;
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
    if (!adapter || !evaluationContext) {
      return {};
    }

    return adapter.fromBackendPayload({
      evaluationContext,
      backendPayload,
    });
  }, [adapter, evaluationContext, backendPayload]);
  const adaptedCollectivePayload = useMemo(() => {
    if (!adapter || !evaluationContext) {
      return null;
    }

    return adapter.fromCollectivePayload({
      evaluationContext,
      collectivePayload,
    });
  }, [adapter, evaluationContext, collectivePayload]);

  if (!View || !adapter || !evaluationContext) {
    return null;
  }

  return (
    <View
      evaluationContext={evaluationContext}
      evaluationPayload={evaluationPayload}
      setEvaluationPayload={NOOP}
      collectivePayload={adaptedCollectivePayload}
      readOnly={readOnly === true}
      loading={loading === true}
    />
  );
};

export default EvaluationStructureRenderer;

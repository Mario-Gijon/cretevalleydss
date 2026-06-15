import { useMemo } from "react";

import { buildEvaluationContext } from "../context/buildEvaluationContext";
import { getEvaluationStructureEntryForStage } from "../evaluationStructureRegistry";

const NOOP = () => {};

const EvaluationStructureRenderer = ({
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
    () =>
      buildEvaluationContext({
        issue,
        stage,
        structure: structureEntry,
        alternatives: issue?.alternatives || [],
        criteriaTree: issue?.criteria || [],
      }),
    [issue, stage, structureEntry]
  );
  const evaluationPayload = useMemo(() => {
    if (!adapter) {
      return {};
    }

    return adapter.fromBackendPayload({
      evaluationContext,
      backendPayload,
    });
  }, [adapter, evaluationContext, backendPayload]);
  const adaptedCollectivePayload = useMemo(() => {
    if (!adapter) {
      return null;
    }

    return adapter.fromCollectivePayload({
      evaluationContext,
      collectivePayload,
    });
  }, [adapter, evaluationContext, collectivePayload]);

  if (!View || !adapter) {
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

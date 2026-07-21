import { toIdString } from "../../../utils/common/ids.js";

const cloneSerializable = (value, fallback) => {
  if (value === undefined) return fallback;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

export const getStageStandardResult = (stageResult) =>
  stageResult?.result?.standardResult || {};

export const getStageExpertWeights = (stageResult) =>
  Array.isArray(stageResult?.inputSnapshot?.expertWeights)
    ? stageResult.inputSnapshot.expertWeights
    : [];

/**
 * Keeps the established DecisionModelsService previous-stage input shape
 * independent from IssueStageResult's persistence layout.
 */
export const serializePreviousStageResultForExecution = (stageResult) => {
  const standardResult = getStageStandardResult(stageResult);

  return {
    _id: toIdString(stageResult?._id),
    issue: toIdString(stageResult?.issue),
    stage: stageResult?.stage ?? null,
    consensusPhase: stageResult?.consensusPhase ?? null,
    consensusMeasure: standardResult.consensusMeasure ?? null,
    rankedAlternatives: cloneSerializable(standardResult.rankedAlternatives, []),
    collectiveEvaluations: cloneSerializable(
      standardResult.collectiveEvaluations,
      {}
    ),
    plotsGraphic: cloneSerializable(standardResult.plotsGraphic, {}),
    modelExecution: cloneSerializable(stageResult?.result?.modelExecution, {}),
    rawOutput: cloneSerializable(stageResult?.result?.rawOutput, {}),
    expertWeights: cloneSerializable(getStageExpertWeights(stageResult), []),
  };
};

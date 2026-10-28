import { toIdString } from "../../../utils/common/ids.js";
import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import { projectNormalizedResultOrThrow } from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";

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

export const getStageExpertIds = (stageResult) =>
  Array.isArray(stageResult?.inputSnapshot?.expertIds)
    ? stageResult.inputSnapshot.expertIds.map(toIdString).filter(Boolean)
    : [];

/**
 * Keeps the established DecisionModelsService previous-stage input shape
 * independent from IssueStageResult's persistence layout.
 */
export const serializePreviousStageResultForExecution = (stageResult) => {
  const standardResult = getStageStandardResult(stageResult);
  const resultStructureMetadata = resolveResultStructureMetadata(
    stageResult?.result ?? {}
  );
  const projectedResult = projectNormalizedResultOrThrow({
    ...resultStructureMetadata,
    result: standardResult,
    target: "scenarioInput",
  });

  return {
    _id: toIdString(stageResult?._id),
    issue: toIdString(stageResult?.issue),
    stage: stageResult?.stage ?? null,
    consensusPhase: stageResult?.consensusPhase ?? null,
    ...projectedResult,
    modelExecution: cloneSerializable(stageResult?.result?.modelExecution, {}),
    rawOutput: cloneSerializable(stageResult?.result?.rawOutput, {}),
    expertWeights: cloneSerializable(getStageExpertWeights(stageResult), []),
  };
};

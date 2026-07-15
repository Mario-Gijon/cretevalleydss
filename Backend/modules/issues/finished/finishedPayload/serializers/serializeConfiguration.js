import {
  cloneSerializable,
  toNullableId,
} from "./serializers.shared.js";

export const resolveCriteriaWeightingSource = ({ issue, evaluations, finalWeights }) => {
  if (finalWeights.source.kind === "criteriaWeightingStageResult") {
    return "criteriaWeightingStageResult";
  }

  if (evaluations.some((evaluation) => evaluation.stage === "criteriaWeighting")) {
    return "expertCriteriaWeighting";
  }

  if (issue.criteriaWeightingModel || issue.criteriaWeightsStructureKey) {
    return "unknown";
  }

  return finalWeights.source.kind === "directModelParameters"
    ? "directModelParameters"
    : "notRequired";
};

export const serializeConfiguration = ({ issue, evaluations, finalWeights, criteriaWeightingEffectiveParameters }) => ({
  alternativeEvaluation: {
    structureKey: issue.evaluationStructureKey,
  },
  criteriaWeighting: {
    required: finalWeights.source.kind !== "notRequired",
    source: resolveCriteriaWeightingSource({ issue, evaluations, finalWeights }),
    structureKey: issue.criteriaWeightsStructureKey ?? null,
    modelId: toNullableId(issue.criteriaWeightingModel),
    configuredParameters: cloneSerializable(issue.criteriaWeightingParameters, {}),
    effectiveParameters: cloneSerializable(
      criteriaWeightingEffectiveParameters ?? issue.criteriaWeightingParameters,
      {}
    ),
  },
  consensus: {
    enabled: issue.isConsensus === true,
    supported: issue.supportsConsensus === true,
    simulated: issue.simulateConsensus === true,
    maxPhases: issue.consensusMaxPhases ?? null,
    threshold: issue.consensusThreshold ?? null,
    finalPhase: issue.consensusPhase ?? null,
  },
});

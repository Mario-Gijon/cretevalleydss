import { extractLeafCriteria } from "./extractIssueEvaluationLeafCriteria";
import { buildParameterContext } from "../../modelParameters/logic/buildModelParameterContext";

const toNonEmptyStringOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

export const buildEvaluationContext = ({
  issue = null,
  stage = null,
  structure = null,
  model = null,
  parameters = null,
  alternatives = null,
  criteriaTree = null,
  leafCriteria = null,
}) => {
  const parameterContext = buildParameterContext({
    model,
    alternatives: Array.isArray(alternatives) ? alternatives : [],
    criteriaTree: Array.isArray(criteriaTree) ? criteriaTree : [],
    leafCriteria: Array.isArray(leafCriteria)
      ? leafCriteria
      : extractLeafCriteria(Array.isArray(criteriaTree) ? criteriaTree : []),
  });
  const consensusPhase = Number.isInteger(issue?.consensusPhase)
    ? issue.consensusPhase
    : null;
  const consensusMaxPhases = Number.isInteger(issue?.consensusMaxPhases)
    ? issue.consensusMaxPhases
    : null;
  const consensusThreshold =
    typeof issue?.consensusThreshold === "number" && Number.isFinite(issue.consensusThreshold)
      ? issue.consensusThreshold
      : null;

  return {
    issue: {
      id: toNonEmptyStringOrNull(issue?.id ?? issue?._id),
      name: toNonEmptyStringOrNull(issue?.name),
      currentStage: toNonEmptyStringOrNull(issue?.currentStage),
      consensusPhase,
      isConsensus: issue?.isConsensus === true,
      consensusThreshold,
      consensusMaxPhases,
    },
    structure: {
      key: toNonEmptyStringOrNull(structure?.key),
      stage: toNonEmptyStringOrNull(stage ?? structure?.stage),
    },
    model: parameterContext.model,
    modelParameters:
      parameters?.modelParameters && typeof parameters.modelParameters === "object"
        ? parameters.modelParameters
        : {},
    criteriaWeightingParameters:
      parameters?.criteriaWeightingParameters &&
      typeof parameters.criteriaWeightingParameters === "object"
        ? parameters.criteriaWeightingParameters
        : {},
    alternatives: parameterContext.alternatives,
    criteriaTree: parameterContext.criteriaTree,
    leafCriteria: parameterContext.leafCriteria,
    consensus: {
      phase: consensusPhase,
      maxPhases: consensusMaxPhases,
      threshold: consensusThreshold,
      currentCollectiveEvaluations: {},
      previousCollectiveEvaluations: {},
    },
  };
};

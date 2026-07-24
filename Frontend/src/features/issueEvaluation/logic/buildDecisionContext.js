import { extractLeafCriteria } from "./extractIssueEvaluationLeafCriteria";
import { buildParameterContext } from "../../modelParameters/context";

const toNonEmptyStringOrNull = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const resolveObjectOrNull = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const normalizeExpert = (expert) => {
  if (typeof expert === "string" || typeof expert === "number") {
    return {
      id: toNonEmptyStringOrNull(expert),
      name: null,
    };
  }

  if (!resolveObjectOrNull(expert)) {
    return null;
  }

  const id = toNonEmptyStringOrNull(expert.id ?? expert._id ?? expert.email);
  if (!id) {
    return null;
  }

  return {
    id,
    name: toNonEmptyStringOrNull(expert.name),
  };
};

const resolveObjectOrEmpty = (value) => resolveObjectOrNull(value) || {};

export const buildDecisionContext = ({
  issue = null,
  stage = null,
  structure = null,
  model = undefined,
  parameters = undefined,
  alternatives = undefined,
  criteriaTree = undefined,
  leafCriteria = null,
  experts = undefined,
  criteriaWeights = undefined,
  expertWeights = undefined,
  currentCollectiveEvaluations = undefined,
  previousCollectiveEvaluations = undefined,
}) => {
  const issueModel = resolveObjectOrNull(issue?.model);
  const explicitParameters = resolveObjectOrNull(parameters);
  const issueParameters =
    resolveObjectOrNull(issue?.parameters) ||
    resolveObjectOrNull(issue?.modelParameters) ||
    resolveObjectOrNull(issue?.modelParams?.base?.paramsSaved) ||
    resolveObjectOrNull(issue?.modelParams?.base?.paramsResolved);
  const resolvedAlternatives = Array.isArray(alternatives)
    ? alternatives
    : Array.isArray(issue?.alternatives)
      ? issue.alternatives
      : [];
  const resolvedCriteriaTree = Array.isArray(criteriaTree)
    ? criteriaTree
    : Array.isArray(issue?.criteriaTree)
      ? issue.criteriaTree
      : Array.isArray(issue?.criteria)
        ? issue.criteria
        : [];
  const resolvedLeafCriteria = Array.isArray(leafCriteria)
    ? leafCriteria
    : extractLeafCriteria(resolvedCriteriaTree);
  const parameterContext = buildParameterContext({
    model: resolveObjectOrNull(model) || issueModel,
    alternatives: resolvedAlternatives,
    criteriaTree: resolvedCriteriaTree,
    leafCriteria: resolvedLeafCriteria,
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
  const resolvedExperts = Array.isArray(experts)
    ? experts
    : Array.isArray(issue?.experts)
      ? issue.experts
      : Array.isArray(issue?.expertParticipants)
        ? issue.expertParticipants
        : [];
  const resolvedCriteriaWeights =
    resolveObjectOrNull(criteriaWeights) ||
    resolveObjectOrNull(issue?.criteriaWeights) ||
    resolveObjectOrNull(issue?.modelParameters?.weights) ||
    {};
  const resolvedExpertWeights =
    resolveObjectOrNull(expertWeights) ||
    resolveObjectOrNull(issue?.expertWeights) ||
    {};

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
    modelParameters: resolveObjectOrNull(explicitParameters?.modelParameters) || issueParameters || {},
    criteriaWeightingParameters: resolveObjectOrNull(
      explicitParameters?.criteriaWeightingParameters
    ) || {},
    alternatives: parameterContext.alternatives,
    criteriaTree: parameterContext.criteriaTree,
    leafCriteria: parameterContext.leafCriteria,
    experts: resolvedExperts.map(normalizeExpert).filter(Boolean),
    criteriaWeights: resolvedCriteriaWeights,
    expertWeights: resolvedExpertWeights,
    consensus: {
      phase: consensusPhase,
      maxPhases: consensusMaxPhases,
      threshold: consensusThreshold,
      currentCollectiveEvaluations: resolveObjectOrEmpty(
        currentCollectiveEvaluations
      ),
      previousCollectiveEvaluations: resolveObjectOrEmpty(
        previousCollectiveEvaluations
      ),
    },
  };
};

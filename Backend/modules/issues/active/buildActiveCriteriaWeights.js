import { createInternalError } from "../../../utils/common/errors.js";
import { ISSUE_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";

const WEIGHTS_OPTIONAL_STAGES = new Set([
  ISSUE_STAGES.CRITERIA_WEIGHTING,
  ISSUE_STAGES.WEIGHTS_FINISHED,
]);

const WEIGHTS_REQUIRED_STAGES = new Set([
  ISSUE_STAGES.ALTERNATIVE_EVALUATION,
  ISSUE_STAGES.FINISHED,
]);

const getEffectiveCriteriaWeightsForActiveView = ({
  issue,
  orderedLeafCriteria,
  issueId,
}) => {
  const criteriaCount = orderedLeafCriteria.length;
  const stage = issue.currentStage;
  const weights = issue.modelParameters.weights;

  if (criteriaCount === 0) {
    return [];
  }

  if (Array.isArray(weights)) {
    if (weights.length !== criteriaCount) {
      throw createInternalError("Issue is missing effective criteria weights", {
        field: "modelParameters.weights",
        details: {
          issueId,
          currentStage: stage,
          criteriaCount,
          weightsLength: weights.length,
        },
      });
    }

    return weights;
  }

  if (!issue.model.usesCriteriaWeights) {
    return null;
  }

  if (criteriaCount === 1) {
    return [1];
  }

  if (WEIGHTS_OPTIONAL_STAGES.has(stage)) {
    return null;
  }

  if (WEIGHTS_REQUIRED_STAGES.has(stage)) {
    throw createInternalError("Issue is missing effective criteria weights", {
      field: "modelParameters.weights",
      details: {
        issueId,
        currentStage: stage,
        criteriaCount,
      },
    });
  }

  throw createInternalError("Unsupported active issue stage", {
    field: "currentStage",
    details: {
      issueId,
      stage,
    },
  });
};

export const buildActiveCriteriaWeights = ({
  issue,
  orderedLeafCriteria,
  issueId,
}) => {
  const criteriaWeights = getEffectiveCriteriaWeightsForActiveView({
    issue,
    orderedLeafCriteria,
    issueId,
  });

  const criteriaWeightsById = orderedLeafCriteria.reduce((acc, node, index) => {
    acc[node.id] = criteriaWeights === null ? null : criteriaWeights[index];
    return acc;
  }, {});

  const criteriaWeightsByName = orderedLeafCriteria.reduce(
    (acc, node, index) => {
      acc[node.name] = criteriaWeights === null ? null : criteriaWeights[index];
      return acc;
    },
    {}
  );

  return {
    criteriaWeightsById,
    criteriaWeightsByName,
  };
};

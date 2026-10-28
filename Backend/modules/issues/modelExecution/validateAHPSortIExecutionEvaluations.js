import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeAHPSortGroupConfiguration } from "../../decisionPlugins/shared/ahpSortGroup.js";

export const AHPSORT_I_API_MODEL_KEY = "ahp_sort_i";

export const validateAHPSortIGroupPolicyOrThrow = ({
  evaluationCount,
  modelParameters,
}) => {
  const hasPolicy = isPlainObject(modelParameters) &&
    Object.hasOwn(modelParameters, "ahpSortGroup");
  if (!hasPolicy) {
    if (evaluationCount > 1) {
      throw createBadRequestError(
        "Multi-expert AHPSort I requires an explicit ahpSortGroup.tiePolicy.",
        {
          code: "AHPSORT_I_GROUP_POLICY_REQUIRED",
          field: "modelParameters.ahpSortGroup",
          details: { evaluationCount },
        }
      );
    }
    return null;
  }

  const normalized = normalizeAHPSortGroupConfiguration(
    modelParameters.ahpSortGroup
  );
  if (normalized.error) {
    throw createBadRequestError(
      `Invalid AHPSort I group policy: ${normalized.error}.`,
      {
        code: "AHPSORT_I_GROUP_POLICY_INVALID",
        field: "modelParameters.ahpSortGroup",
        details: { evaluationCount },
      }
    );
  }
  return normalized.value;
};

export const validateAHPSortIExecutionEvaluationsOrThrow = ({
  apiModelKey,
  evaluations,
  modelParameters = {},
}) => {
  if (apiModelKey !== AHPSORT_I_API_MODEL_KEY) return null;

  const evaluationCount = Array.isArray(evaluations) ? evaluations.length : null;
  if (!Array.isArray(evaluations) || evaluationCount < 1) {
    throw createBadRequestError(
      "AHPSort I requires at least one completed expert evaluation.",
      {
        code: "AHPSORT_I_EXPERT_EVALUATION_REQUIRED",
        field: "evaluations",
        details: {
          minimumEvaluationCount: 1,
          receivedEvaluationCount: evaluationCount,
        },
      }
    );
  }

  const expertIds = evaluations.map((evaluation) =>
    toIdString(evaluation?.expert?._id || evaluation?.expert?.id || evaluation?.expert)
  );
  const invalidExpertIndexes = expertIds.flatMap((expertId, index) =>
    expertId ? [] : [index]
  );
  const duplicateExpertIds = expertIds.filter(
    (expertId, index) => expertId && expertIds.indexOf(expertId) !== index
  );
  const incompleteEvaluationIndexes = evaluations.flatMap((evaluation, index) =>
    !isPlainObject(evaluation?.payload) ||
      !Array.isArray(evaluation.payload.alternativeProfileComparisons) ||
      !Array.isArray(evaluation.payload.profileComparisons)
      ? [index]
      : []
  );
  if (
    invalidExpertIndexes.length > 0 ||
    duplicateExpertIds.length > 0 ||
    incompleteEvaluationIndexes.length > 0
  ) {
    throw createBadRequestError(
      "AHPSort I evaluations must have unique expert IDs and complete comparison payloads.",
      {
        code: "AHPSORT_I_EVALUATIONS_INVALID",
        field: "evaluations",
        details: {
          invalidExpertIndexes,
          duplicateExpertIds: [...new Set(duplicateExpertIds)].sort(),
          incompleteEvaluationIndexes,
        },
      }
    );
  }

  return {
    expertIds,
    groupPolicy: validateAHPSortIGroupPolicyOrThrow({
      evaluationCount,
      modelParameters,
    }),
  };
};

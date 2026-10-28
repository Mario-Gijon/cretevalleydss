import { createBadRequestError } from "../../../utils/common/errors.js";

export const AHPSORT_I_API_MODEL_KEY = "ahp_sort_i";

export const validateAHPSortIExecutionEvaluationsOrThrow = ({
  apiModelKey,
  evaluations,
}) => {
  if (apiModelKey !== AHPSORT_I_API_MODEL_KEY) return;

  const evaluationCount = Array.isArray(evaluations) ? evaluations.length : null;
  if (evaluationCount !== 1) {
    throw createBadRequestError(
      "AHPSort I requires exactly one completed expert evaluation; multi-expert aggregation is not supported.",
      {
        code: "AHPSORT_I_SINGLE_EXPERT_EVALUATION_REQUIRED",
        field: "evaluations",
        details: {
          expectedEvaluationCount: 1,
          receivedEvaluationCount: evaluationCount,
        },
      }
    );
  }
};

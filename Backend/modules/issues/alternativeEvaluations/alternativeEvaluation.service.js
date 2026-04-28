import { Issue } from "../../../models/Issues.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { resolveEvaluationStructure } from "../issue.evaluationStructure.js";

import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";
import { directAlternativeEvaluations } from "./alternativeEvaluation.direct.js";
import { pairwiseAlternativeEvaluations } from "./alternativeEvaluation.pairwiseAlternatives.js";

const ALTERNATIVE_EVALUATION_OPERATIONS_BY_STRUCTURE = Object.freeze({
  [EVALUATION_STRUCTURES.DIRECT]: directAlternativeEvaluations,
  [EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]:
    pairwiseAlternativeEvaluations,
});

const resolveAlternativeEvaluationContextOrThrow = async (issueId) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId)
    .select("_id evaluationStructure")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = resolveEvaluationStructure(issue);
  const operations =
    ALTERNATIVE_EVALUATION_OPERATIONS_BY_STRUCTURE[evaluationStructure];

  if (!operations) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${String(evaluationStructure)}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "evaluationStructure",
      }
    );
  }

  return {
    issue,
    operations,
  };
};

export const getAlternativeEvaluations = async ({ issueId, userId }) => {
  const { issue, operations } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return operations.read({
    issueId,
    userId,
    issue,
  });
};

export const saveAlternativeEvaluationDraft = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, operations } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return operations.saveDraft({
    issueId,
    userId,
    evaluations: body?.evaluations,
    issue,
  });
};

export const submitAlternativeEvaluations = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, operations } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return operations.submit({
    issueId,
    userId,
    evaluations: body?.evaluations,
    issue,
  });
};

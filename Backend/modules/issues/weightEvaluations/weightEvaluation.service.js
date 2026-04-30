import { Issue } from "../../../models/Issues.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

import { getWeightingModeOperationsOrThrow } from "./weightEvaluation.registry.js";

const getWeightEvaluationIssueOrThrow = async (issueId) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Issue id is required");
  }

  const issue = await Issue.findById(issueId);

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  return issue;
};

const resolveWeightEvaluationContextOrThrow = async (issueId) => {
  const issue = await getWeightEvaluationIssueOrThrow(issueId);
  const operations = getWeightingModeOperationsOrThrow(issue.weightingMode);

  return {
    issue,
    operations,
  };
};

export const getWeightEvaluation = async ({ issueId, userId }) => {
  const { issue, operations } = await resolveWeightEvaluationContextOrThrow(
    issueId
  );

  return operations.read({
    issue,
    userId,
  });
};

export const saveWeightDraft = async ({ issueId, userId, body }) => {
  const { issue, operations } = await resolveWeightEvaluationContextOrThrow(
    issueId
  );

  return operations.saveDraft({
    issue,
    userId,
    body,
  });
};

export const submitWeights = async ({ issueId, userId, body }) => {
  const { issue, operations } = await resolveWeightEvaluationContextOrThrow(
    issueId
  );

  return operations.submit({
    issue,
    userId,
    body,
  });
};

export const computeWeights = async ({ issueId, userId }) => {
  const { issue, operations } = await resolveWeightEvaluationContextOrThrow(
    issueId
  );

  return operations.compute({
    issue,
    userId,
  });
};

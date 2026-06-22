import { getIssueByIdOrThrow } from "../../issues/shared/queries.js";

import {
  createBadRequestError,
} from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

export const validateIssueIdOrThrow = (issueId) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }
};

export const validateExpertIdOrThrow = (expertId) => {
  if (!expertId || !isValidObjectIdLike(expertId)) {
    throw createBadRequestError("Valid expert id is required", {
      field: "expertId",
    });
  }
};

export const loadIssueForAdminDetailOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: [
      { path: "ownerId", select: "name email role accountConfirm" },
      { path: "createdBy", select: "name email role accountConfirm" },
      {
        path: "model",
        select:
          "name modelKind evaluationStructureKey isMultiCriteria parameters supportedDomains supportsConsensus supportsConsensusSimulation",
      },
    ],
    lean: true,
  });

  return issue;
};

export const loadIssueForExpertsProgressOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: {
      path: "model",
      select:
        "name modelKind evaluationStructureKey supportsConsensus supportsConsensusSimulation",
    },
    lean: true,
  });

  return issue;
};

export const loadIssueForExpertEvaluationsOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: {
      path: "model",
      select:
        "name modelKind evaluationStructureKey supportsConsensus supportsConsensusSimulation",
    },
    lean: true,
  });

  return issue;
};

export const loadIssueForExpertWeightsOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: {
      path: "model",
      select:
        "name modelKind evaluationStructureKey supportsConsensus supportsConsensusSimulation",
    },
    lean: true,
  });

  return issue;
};

import { ensureIssueOrdersDb } from "../../issues/shared/ordering.js";
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

const attachIssueOrders = async ({ issueId, issue }) => {
  const orderedIssue = await ensureIssueOrdersDb({ issueId });

  return {
    ...issue,
    alternativeOrder: orderedIssue.alternativeOrder,
    leafCriteriaOrder: orderedIssue.leafCriteriaOrder,
  };
};

export const loadIssueForAdminDetailOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: [
      { path: "admin", select: "name email role accountConfirm" },
      {
        path: "model",
        select:
          "name alternativeEvaluationStructureKey criteriaWeightingStructureKey lifecycleKind isMultiCriteria parameters supportedDomains supportsConsensus supportsConsensusSimulation",
      },
    ],
    lean: true,
  });

  return attachIssueOrders({ issueId, issue });
};

export const loadIssueForExpertsProgressOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: {
      path: "model",
      select:
        "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation",
    },
    lean: true,
  });

  return attachIssueOrders({ issueId, issue });
};

export const loadIssueForExpertEvaluationsOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: {
      path: "model",
      select:
        "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation",
    },
    lean: true,
  });

  return attachIssueOrders({ issueId, issue });
};

export const loadIssueForExpertWeightsOrThrow = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: {
      path: "model",
      select:
        "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation",
    },
    lean: true,
  });

  return attachIssueOrders({ issueId, issue });
};

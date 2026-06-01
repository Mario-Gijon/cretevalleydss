import { Issue } from "../../../models/Issues.js";

import { ensureIssueOrdersDb } from "../../issues/shared/ordering.js";

import {
  createBadRequestError,
  createNotFoundError,
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
  validateIssueIdOrThrow(issueId);

  const issue = await Issue.findById(issueId)
    .populate("admin", "name email role accountConfirm")
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey lifecycleKind isMultiCriteria parameters supportedDomains supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return attachIssueOrders({ issueId, issue });
};

export const loadIssueForExpertsProgressOrThrow = async ({ issueId }) => {
  validateIssueIdOrThrow(issueId);

  const issue = await Issue.findById(issueId)
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return attachIssueOrders({ issueId, issue });
};

export const loadIssueForExpertEvaluationsOrThrow = async ({ issueId }) => {
  validateIssueIdOrThrow(issueId);

  const issue = await Issue.findById(issueId)
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return attachIssueOrders({ issueId, issue });
};

export const loadIssueForExpertWeightsOrThrow = async ({ issueId }) => {
  validateIssueIdOrThrow(issueId);

  const issue = await Issue.findById(issueId)
    .populate(
      "model",
      "name alternativeEvaluationStructureKey criteriaWeightingStructureKey supportsConsensus supportsConsensusSimulation"
    )
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return attachIssueOrders({ issueId, issue });
};

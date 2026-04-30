import { Issue } from "../../../models/Issues.js";
import { createNotFoundError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { resolveEvaluationStructure } from "../issue.evaluationStructure.js";

import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";
import { getAlternativeEvaluationStructureOrThrow } from "./alternativeEvaluation.registry.js";
import { validateIssueIdOrThrow } from "./alternativeEvaluation.shared.js";

const resolveAlternativeEvaluationContextOrThrow = async (issueId) => {
  validateIssueIdOrThrow(issueId);

  const issue = await Issue.findById(issueId)
    .select("_id evaluationStructure")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = resolveEvaluationStructure(issue);
  const structure = getAlternativeEvaluationStructureOrThrow(
    evaluationStructure
  );

  return {
    issue,
    structure,
  };
};

export const getAlternativeEvaluations = async ({ issueId, userId }) => {
  const { issue, structure } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return structure.read({
    issue,
    userId,
  });
};

export const saveAlternativeEvaluationDraft = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, structure } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return structure.saveDraft({
    issue,
    userId,
    body,
  });
};

export const submitAlternativeEvaluations = async ({
  issueId,
  userId,
  body,
}) => {
  const { issue, structure } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return structure.submit({
    issue,
    userId,
    body,
  });
};

export const buildInitialAlternativeEvaluationDocs = ({
  issueId,
  experts = [],
  leafCriteria = [],
  alternatives = [],
  evaluationStructure = EVALUATION_STRUCTURES.DIRECT,
  consensusPhase = 1,
  includeReciprocal = false,
}) => {
  const issue = toIdString(issueId);

  if (!issue) {
    return [];
  }

  const resolvedEvaluationStructure = resolveEvaluationStructure({
    evaluationStructure,
  });
  const structure = getAlternativeEvaluationStructureOrThrow(
    resolvedEvaluationStructure
  );

  return structure.buildInitial({
    issueId: issue,
    experts,
    leafCriteria,
    alternatives,
    consensusPhase,
    includeReciprocal,
  });
};

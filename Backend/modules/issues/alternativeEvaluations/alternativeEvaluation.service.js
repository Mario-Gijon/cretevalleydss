import { toIdString } from "../../../utils/common/ids.js";
import { getIssueByIdOrThrow } from "../issue.queries.js";

import { getEvaluationStructureOperationsOrThrow } from "./alternativeEvaluation.registry.js";

const getAlternativeEvaluationIssueOrThrow = async (issueId) => {
  return getIssueByIdOrThrow(issueId, {
    select: "_id evaluationStructure",
  });
};

const resolveAlternativeEvaluationContextOrThrow = async (issueId) => {
  const issue = await getAlternativeEvaluationIssueOrThrow(issueId);

  const operations = getEvaluationStructureOperationsOrThrow(
    issue.evaluationStructure
  );

  return {
    issue,
    operations,
  };
};

export const getAlternativeEvaluations = async ({ issueId, userId }) => {
  const { issue, operations } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return operations.read({
    issue,
    userId,
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
  const { issue, operations } =
    await resolveAlternativeEvaluationContextOrThrow(issueId);

  return operations.submit({
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
  evaluationStructure,
  consensusPhase = 1,
  includeReciprocal = false,
}) => {
  const issue = toIdString(issueId);

  if (!issue) {
    return [];
  }

  const operations = getEvaluationStructureOperationsOrThrow(
    evaluationStructure
  );

  return operations.buildInitial({
    issueId: issue,
    experts,
    leafCriteria,
    alternatives,
    consensusPhase,
    includeReciprocal,
  });
};

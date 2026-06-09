import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../issues/shared/ordering.js";

import { toIdString } from "../../../utils/common/ids.js";
import {
  buildAdminExpertIdentityPayload,
  buildAdminExpertParticipationPayload,
} from "./adminIssueReadPayloads.js";
import {
  resolveEvaluationProgressStats,
} from "./adminIssueProgress.js";
import {
  loadIssueForExpertEvaluationsOrThrow,
  validateIssueIdOrThrow,
  validateExpertIdOrThrow,
} from "./adminIssueReadLoaders.js";
import { createNotFoundError } from "../../../utils/common/errors.js";
import { getEvaluationStructureOrThrow } from "../../decisionEngine/evaluations/index.js";
import { buildEvaluationStructureContext } from "../../decisionEngine/evaluations/evaluationStructureContext.js";

export const getIssueExpertEvaluationsPayload = async ({
  issueId,
  expertId,
}) => {
  validateIssueIdOrThrow(issueId);
  validateExpertIdOrThrow(expertId);
  const issue = await loadIssueForExpertEvaluationsOrThrow({ issueId });

  const [
    expert,
    participation,
    latestAlternativeStageResult,
    orderedAlternatives,
    orderedLeafCriteria,
    evaluationDoc,
  ] = await Promise.all([
    User.findById(expertId)
      .select("name email role university accountConfirm")
      .lean(),
    Participation.findOne({ issue: issueId, expert: expertId }).lean(),
    IssueStageResult.findOne({
      issue: issueId,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: -1 })
      .lean(),
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name type expressionDomain",
      lean: true,
    }),
    IssueEvaluation.findOne({
      issue: issueId,
      expert: expertId,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: -1 })
      .lean(),
  ]);

  if (!participation && !expert && !evaluationDoc) {
    throw createNotFoundError("Expert data for this issue not found", {
      field: "expertId",
    });
  }

  const collectiveSource =
    latestAlternativeStageResult?.collectiveEvaluations || null;

  const alternativeEvaluationStructure = getEvaluationStructureOrThrow(
    issue.alternativeEvaluationStructureKey
  );
  const structureContext = await buildEvaluationStructureContext({
    issue,
    alternatives: orderedAlternatives,
    leafCriteria: orderedLeafCriteria,
    collectiveEvaluations: collectiveSource,
  });

  const evaluations = await alternativeEvaluationStructure.get({
    storedEvaluation: evaluationDoc,
    structureContext,
  });
  const progress = await resolveEvaluationProgressStats({
    storedEvaluation: evaluationDoc,
  });

  return {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: issue.active,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    stats: {
      status: progress.status,
      completed: progress.completed,
      submittedAt: progress.submittedAt,
      updatedAt: progress.updatedAt,
      expectedCells: 1,
      filledCells: progress.completed ? 1 : 0,
      lastEvaluationAt: progress.lastActivityAt,
    },
    evaluations,
    collectiveEvaluations: collectiveSource,
  };
};

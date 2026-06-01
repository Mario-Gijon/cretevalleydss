import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Participation } from "../../../models/Participations.js";

import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../../issues/shared/ordering.js";

import { toIdString } from "../../../utils/common/ids.js";
import {
  buildExpertProgressRow,
  buildIssueEvaluationStatsByExpert,
  resolveExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";
import { loadIssueForExpertsProgressOrThrow } from "./adminIssueReadLoaders.js";

export const getIssueExpertsProgressPayload = async ({ issueId }) => {
  const issue = await loadIssueForExpertsProgressOrThrow({ issueId });

  const [
    alternatives,
    leafCriteria,
    participations,
    exits,
    evaluationAgg,
    weightDocs,
  ] = await Promise.all([
    getOrderedAlternativesDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    Participation.find({ issue: issueId })
      .populate("expert", "name email role university accountConfirm")
      .lean(),
    ExitUserIssue.find({ issue: issueId, hidden: true })
      .populate("user", "name email role university accountConfirm")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "alternativeEvaluation",
    })
      .select("expert payload completed submittedAt")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "criteriaWeighting",
    })
      .select("expert payload completed submittedAt")
      .lean(),
  ]);

  const expectedPerExpert = await resolveExpectedEvaluationCellsPerExpert({
    issue,
    alternatives,
    criteria: leafCriteria,
  });

  const evaluationMap = await buildIssueEvaluationStatsByExpert({
    issue,
    evaluationDocs: evaluationAgg,
    alternatives,
    criteria: leafCriteria,
  });

  const weightMap = new Map(
    weightDocs.map((weightDoc) => [toIdString(weightDoc.expert), weightDoc])
  );

  const currentParticipantIds = new Set(
    participations.map((participation) =>
      toIdString(participation.expert?._id || participation.expert)
    )
  );

  const rows = participations.map((participation) => {
    const expertId = toIdString(participation.expert?._id || participation.expert);

    return buildExpertProgressRow({
      expert: participation.expert,
      expertId,
      currentParticipant: true,
      participation,
      evaluationStats: evaluationMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      },
      weightDoc: weightMap.get(expertId),
      expectedEvaluationCells: expectedPerExpert,
    });
  });

  for (const exit of exits) {
    const expertId = toIdString(exit.user?._id || exit.user);

    if (currentParticipantIds.has(expertId)) {
      continue;
    }

    rows.push(
      buildExpertProgressRow({
        expert: exit.user,
        expertId,
        currentParticipant: false,
        exit,
        evaluationStats: evaluationMap.get(expertId) || {
          totalDocs: 0,
          filledDocs: 0,
          lastEvaluationAt: null,
        },
        weightDoc: weightMap.get(expertId),
        expectedEvaluationCells: expectedPerExpert,
      })
    );
  }

  rows.sort((a, b) => {
    if (a.currentParticipant !== b.currentParticipant) {
      return a.currentParticipant ? -1 : 1;
    }

    return a.expert.email.localeCompare(
      b.expert.email,
      undefined,
      { sensitivity: "base" }
    );
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
      model: issue.model
        ? {
          id: toIdString(issue.model._id),
          name: issue.model.name,
          alternativeEvaluationStructureKey:
            issue.model.alternativeEvaluationStructureKey,
          criteriaWeightingStructureKey:
            issue.model.criteriaWeightingStructureKey,
        }
        : null,
    },
    experts: rows,
  };
};

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Participation } from "../../../models/Participations.js";

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
    participations,
    exits,
    evaluationAgg,
    weightDocs,
  ] = await Promise.all([
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
      .select("expert completed submittedAt updatedAt")
      .lean(),
    IssueEvaluation.find({
      issue: issueId,
      stage: "criteriaWeighting",
    })
      .select("expert completed submittedAt updatedAt")
      .lean(),
  ]);

  const expectedPerExpert = await resolveExpectedEvaluationCellsPerExpert();

  const evaluationMap = await buildIssueEvaluationStatsByExpert({
    evaluationDocs: evaluationAgg,
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
        submittedDocs: 0,
        draftDocs: 0,
        lastEvaluationAt: null,
        latestStatus: "notSubmitted",
        latestCompleted: false,
        latestSubmittedAt: null,
        latestUpdatedAt: null,
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
          submittedDocs: 0,
          draftDocs: 0,
          lastEvaluationAt: null,
          latestStatus: "notSubmitted",
          latestCompleted: false,
          latestSubmittedAt: null,
          latestUpdatedAt: null,
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

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Participation } from "../../../models/Participations.js";

import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import {
  buildExpertProgressRow,
  buildIssueEvaluationStatsByExpert,
  resolveExpectedEvaluationCellsPerExpert,
} from "./adminIssueProgress.js";
import { loadIssueForExpertsProgressOrThrow } from "./adminIssueReadLoaders.js";

const requireParticipationExpertOrThrow = ({ participation, issueId }) => {
  const expert = participation.expert;
  const expertId = expert ? toIdString(expert._id) : null;

  if (!expertId) {
    throw createInternalError("Participation expert id is invalid", {
      field: "participations.expert",
      details: {
        issueId,
        participationId: toIdString(participation._id),
      },
    });
  }

  return {
    expert,
    expertId,
  };
};

const requireExitUserOrThrow = ({ exit, issueId }) => {
  const user = exit.user;
  const userId = user ? toIdString(user._id) : null;

  if (!userId) {
    throw createInternalError("Exit user id is invalid", {
      field: "exits.user",
      details: {
        issueId,
        exitId: toIdString(exit._id),
      },
    });
  }

  return {
    user,
    userId,
  };
};

export const getIssueExpertsProgressPayload = async ({ issueId }) => {
  const issue = await loadIssueForExpertsProgressOrThrow({ issueId });
  const normalizedIssueId = toIdString(issue._id);

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
  const validatedParticipations = participations.map((participation) => ({
    participation,
    ...requireParticipationExpertOrThrow({
      participation,
      issueId: normalizedIssueId,
    }),
  }));
  const validatedExits = exits.map((exit) => ({
    exit,
    ...requireExitUserOrThrow({
      exit,
      issueId: normalizedIssueId,
    }),
  }));

  const currentParticipantIds = new Set(
    validatedParticipations.map(({ expertId }) => expertId)
  );

  const rows = validatedParticipations.map(({ participation, expert, expertId }) => {
    return buildExpertProgressRow({
      expert,
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

  for (const { exit, user, userId } of validatedExits) {
    if (currentParticipantIds.has(userId)) {
      continue;
    }

    rows.push(
      buildExpertProgressRow({
        expert: user,
        expertId: userId,
        currentParticipant: false,
        exit,
        evaluationStats: evaluationMap.get(userId) || {
          totalDocs: 0,
          submittedDocs: 0,
          draftDocs: 0,
          lastEvaluationAt: null,
          latestStatus: "notSubmitted",
          latestCompleted: false,
          latestSubmittedAt: null,
          latestUpdatedAt: null,
        },
        weightDoc: weightMap.get(userId),
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
      evaluationStructureKey: issue.evaluationStructureKey,
      criteriaWeightsStructureKey: issue.criteriaWeightsStructureKey,
      model: issue.model
        ? {
          id: toIdString(issue.model._id),
          name: issue.model.name,
          modelKind: issue.model.modelKind,
          evaluationStructureKey: issue.model.evaluationStructureKey,
        }
        : null,
    },
    experts: rows,
  };
};

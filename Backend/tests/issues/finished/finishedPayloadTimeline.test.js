import { describe, expect, it } from "vitest";

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { getFinishedIssueInfoPayload } from "../../../modules/issues/finished/getFinishedIssueInfoPayload.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueEvaluationFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const buildAlternativeMatrixPayload = ({
  alternatives,
  leafCriteria,
  valuesByAlternativeId,
}) => {
  const criterionId = String(leafCriteria[0]._id);

  return Object.fromEntries(
    alternatives.map((alternative) => {
      const alternativeId = String(alternative._id);

      return [
        alternativeId,
        {
          [criterionId]: {
            value: valuesByAlternativeId[alternativeId],
          },
        },
      ];
    })
  );
};

describe("finished payload timeline safety", () => {
  it("builds the existing finished payload when an accepted expert has entered and exited history", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const declinedExpert = await createConfirmedUser({
      email: "declined@example.com",
    });
    const model = await createIssueModel({
      name: "Timeline Safe Model",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      modelId: model._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 2,
      name: "Finished timeline issue",
    });

    const alternatives = await createIssueAlternativesFixture({
      issueId: issue._id,
      names: ["Alternative A", "Alternative B"],
    });
    const domain = await createIssueExpressionDomainSnapshotFixture({
      issueId: issue._id,
      numericRange: { min: 0, max: 10, step: 1 },
    });
    const { leafCriteria } = await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Criterion A"],
      expressionDomainId: domain._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: declinedExpert._id,
      invitationStatus: "declined",
      entryPhase: 0,
      entryStage: "alternativeEvaluation",
    });

    await ExitUserIssue.create({
      issue: issue._id,
      user: expert._id,
      hidden: false,
      phase: 2,
      stage: "alternativeEvaluation",
      reason: "Invited by owner",
      history: [
        {
          phase: 0,
          stage: "alternativeEvaluation",
          action: "entered",
          reason: "Invited by owner",
        },
        {
          phase: 1,
          stage: "alternativeEvaluation",
          action: "exited",
          reason: "Expelled by owner",
        },
        {
          phase: 2,
          stage: "alternativeEvaluation",
          action: "entered",
          reason: "Invited by owner",
        },
      ],
    });

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 8,
          [String(alternatives[1]._id)]: 5,
        },
      }),
    });

    await IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      rankedAlternatives: [
        { name: "Alternative A", score: 0.8, rank: 1 },
        { name: "Alternative B", score: 0.5, rank: 2 },
      ],
      collectiveEvaluations: {
        note: "timeline-safe",
      },
      plotsGraphic: {
        scatter: [],
      },
      modelExecution: {
        finished: true,
      },
      rawOutput: {
        result: "ok",
      },
    });

    const payload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: expert._id,
    });

    expect(payload.summary.name).toBe("Finished timeline issue");
    expect(payload.summary.experts).toEqual({
      participated: ["expert@example.com"],
      notAccepted: ["declined@example.com"],
    });
    expect(payload.alternativesRankings[0]).toMatchObject({
      phase: 2,
      rankedAlternatives: [
        expect.objectContaining({
          name: "Alternative A",
          rank: 1,
        }),
        expect.objectContaining({
          name: "Alternative B",
          rank: 2,
        }),
      ],
    });
  });
});

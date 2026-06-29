import { describe, expect, it } from "vitest";

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { User } from "../../../models/Users.js";
import { buildDeletedUserEmail } from "../../../modules/auth/deletedUserPurge.js";
import { getFinishedIssueInfoPayload } from "../../../modules/issues/finished/getFinishedIssueInfoPayload.js";
import { hideFinishedIssueForUser } from "../../../modules/issues/lifecycle/hideFinishedIssue.js";
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

const createFinishedNonConsensusFixture = async () => {
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
    name: "Finished Non-Consensus Model",
  });
  const issue = await createIssueFixture({
    ownerId: owner._id,
    modelId: model._id,
    active: false,
    currentStage: "finished",
    consensusPhase: 2,
    name: "Finished non-consensus issue",
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
      { alternativeId: String(alternatives[0]._id), name: "Alternative A", score: 0.8, rank: 1 },
      { alternativeId: String(alternatives[1]._id), name: "Alternative B", score: 0.5, rank: 2 },
    ],
    collectiveEvaluations: {
      note: "stable",
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

  return {
    owner,
    expert,
    declinedExpert,
    issue,
    alternatives,
    leafCriteria,
  };
};

const createFinishedConsensusFixture = async () => {
  const owner = await createConfirmedUser({
    email: "owner@example.com",
  });
  const expertA = await createConfirmedUser({
    email: "expert-a@example.com",
  });
  const expertB = await createConfirmedUser({
    email: "expert-b@example.com",
  });
  const outsider = await createConfirmedUser({
    email: "outsider@example.com",
  });
  const model = await createIssueModel({
    name: "Finished Consensus Model",
    supportsConsensus: true,
  });
  const issue = await createIssueFixture({
    ownerId: owner._id,
    modelId: model._id,
    active: false,
    currentStage: "finished",
    consensusPhase: 1,
    isConsensus: true,
    supportsConsensus: true,
    consensusThreshold: 0.8,
    consensusMaxPhases: 3,
    name: "Finished consensus issue",
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

  for (const expert of [expertA, expertB]) {
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 1,
      entryStage: "alternativeEvaluation",
    });
  }

  await ExitUserIssue.create({
    issue: issue._id,
    user: expertB._id,
    hidden: false,
    phase: 1,
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
        phase: 0,
        stage: "alternativeEvaluation",
        action: "exited",
        reason: "Expelled by owner",
      },
      {
        phase: 1,
        stage: "alternativeEvaluation",
        action: "entered",
        reason: "Invited by owner",
      },
    ],
  });

  for (const [phase, expertAValue, expertBValue] of [
    [0, 8, 6],
    [1, 3, 9],
  ]) {
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expertA._id,
      stage: "alternativeEvaluation",
      consensusPhase: phase,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: expertAValue,
          [String(alternatives[1]._id)]: 10 - expertAValue,
        },
      }),
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expertB._id,
      stage: "alternativeEvaluation",
      consensusPhase: phase,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: expertBValue,
          [String(alternatives[1]._id)]: 10 - expertBValue,
        },
      }),
    });
  }

  await createIssueEvaluationFixture({
    issueId: issue._id,
    expertId: outsider._id,
    stage: "alternativeEvaluation",
    consensusPhase: 99,
    completed: true,
    payload: buildAlternativeMatrixPayload({
      alternatives,
      leafCriteria,
      valuesByAlternativeId: {
        [String(alternatives[0]._id)]: 1,
        [String(alternatives[1]._id)]: 9,
      },
    }),
  });

  await IssueStageResult.create([
    {
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      consensusMeasure: 0.4,
      rankedAlternatives: [
        { alternativeId: String(alternatives[0]._id), name: "Alternative A", score: 0.7, rank: 1 },
        { alternativeId: String(alternatives[1]._id), name: "Alternative B", score: 0.6, rank: 2 },
      ],
      collectiveEvaluations: {
        phase: 0,
      },
      plotsGraphic: {
        scatter: [],
      },
      modelExecution: {
        consensusLifecycle: {
          consensusReached: false,
          maxPhasesReached: false,
          finalizationReason: null,
          currentConsensusPhase: 0,
          nextConsensusPhase: 1,
          threshold: 0.8,
          maxPhases: 3,
          consensusMeasure: 0.4,
        },
      },
      rawOutput: {
        phase: 0,
      },
    },
    {
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      consensusMeasure: 0.9,
      rankedAlternatives: [
        { alternativeId: String(alternatives[1]._id), name: "Alternative B", score: 0.95, rank: 1 },
        { alternativeId: String(alternatives[0]._id), name: "Alternative A", score: 0.5, rank: 2 },
      ],
      collectiveEvaluations: {
        phase: 1,
      },
      plotsGraphic: {
        scatter: [],
      },
      modelExecution: {
        consensusLifecycle: {
          consensusReached: true,
          maxPhasesReached: false,
          finalizationReason: "consensusReached",
          currentConsensusPhase: 1,
          nextConsensusPhase: 1,
          threshold: 0.8,
          maxPhases: 3,
          consensusMeasure: 0.9,
        },
      },
      rawOutput: {
        phase: 1,
      },
    },
  ]);

  return {
    owner,
    expertA,
    expertB,
    outsider,
    issue,
    alternatives,
    leafCriteria,
  };
};

describe("finished payload robustness", () => {
  it("builds the existing non-consensus finished payload shape in a re-entry timeline scenario", async () => {
    const { expert, declinedExpert, issue } = await createFinishedNonConsensusFixture();

    const payload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: expert._id,
    });

    expect(payload.summary).toMatchObject({
      name: "Finished non-consensus issue",
      experts: {
        participated: ["expert@example.com"],
        notAccepted: [declinedExpert.email],
      },
    });
    expect(payload.alternativesRankings).toEqual([
      expect.objectContaining({
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
      }),
    ]);
  });

  it("builds the consensus finished payload across multiple phases without mixing phase-specific evaluations", async () => {
    const { expertA, issue, alternatives, leafCriteria } =
      await createFinishedConsensusFixture();

    const payload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: expertA._id,
    });

    const alternativeAId = String(alternatives[0]._id);
    const criterionId = String(leafCriteria[0]._id);

    expect(payload.alternativesRankings.map((entry) => entry.phase)).toEqual([0, 1]);
    expect(payload.expertsRatings[0].expertEvaluations["expert-a@example.com"][alternativeAId][criterionId].value).toBe(8);
    expect(payload.expertsRatings[1].expertEvaluations["expert-a@example.com"][alternativeAId][criterionId].value).toBe(3);
    expect(payload.expertsRatings[99]).toBeUndefined();
    expect(payload.consensusRounds).toHaveLength(2);
    expect(payload.summary.consensusInfo).toMatchObject({
      currentPhase: 1,
      consensusReachedPhase: 1,
      finalizationReason: "consensusReached",
    });
  });

  it("does not break finished payloads when the owner and an accepted expert are anonymized deleted users", async () => {
    const { owner, expert, issue } = await createFinishedNonConsensusFixture();

    await User.updateOne(
      { _id: owner._id },
      {
        $set: {
          isDeleted: true,
          name: "Deleted user",
          email: buildDeletedUserEmail(owner._id),
        },
      }
    );
    await User.updateOne(
      { _id: expert._id },
      {
        $set: {
          isDeleted: true,
          name: "Deleted user",
          email: buildDeletedUserEmail(expert._id),
        },
      }
    );

    const payload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: expert._id,
    });

    expect(payload.summary.owner).toBe(buildDeletedUserEmail(owner._id));
    expect(payload.summary.experts.participated).toEqual([
      buildDeletedUserEmail(expert._id),
    ]);
  });

  it("owner and accepted participant can fetch real finished detail, while unrelated and hidden users cannot", async () => {
    const { owner, expert, issue } = await createFinishedNonConsensusFixture();
    const outsider = await createConfirmedUser();

    const ownerPayload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: owner._id,
    });
    const expertPayload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: expert._id,
    });

    expect(ownerPayload.summary.name).toBe("Finished non-consensus issue");
    expect(expertPayload.summary.name).toBe("Finished non-consensus issue");

    await expect(
      getFinishedIssueInfoPayload({
        issueId: issue._id,
        userId: outsider._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to access this finished issue",
    });

    await hideFinishedIssueForUser({
      issueId: issue._id,
      userId: expert._id,
    });

    await expect(
      getFinishedIssueInfoPayload({
        issueId: issue._id,
        userId: expert._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to access this finished issue",
    });
  });
});

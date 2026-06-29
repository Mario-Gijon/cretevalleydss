import { describe, expect, it, vi } from "vitest";

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Issue } from "../../../models/Issues.js";
import { computeIssueEvaluationStage } from "../../../modules/issues/computation/index.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueEvaluationFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const MODELS_BASE_URL = "http://models.test";

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

const buildModelSuccessResponse = (data) => ({
  data: {
    success: true,
    data,
  },
});

const buildAlternativeServiceResult = ({ alternatives, consensusMeasure = null }) => ({
  rankedAlternatives: alternatives.map((alternative, index) => ({
    alternativeId: String(alternative._id),
    name: alternative.name,
    score: alternatives.length - index,
    rank: index + 1,
  })),
  collectiveEvaluations: {
    aggregate: true,
  },
  plotsGraphic: {
    scatter: [],
  },
  consensusMeasure,
  rawOutput: {
    provider: "mocked",
  },
});

const createHttpClientMock = (...responses) => ({
  post: vi.fn().mockImplementation(() => {
    if (responses.length === 0) {
      throw new Error("No mocked model response configured");
    }

    return Promise.resolve(responses.shift());
  }),
});

const createAlternativeTimelineFixture = async ({
  consensusPhase = 2,
  currentStage = "alternativeEvaluation",
  isConsensus = false,
  simulateConsensus = false,
  consensusThreshold = 0.9,
  consensusMaxPhases = 3,
} = {}) => {
  const owner = await createConfirmedUser({
    email: "owner@example.com",
  });
  const currentExpert = await createConfirmedUser({
    email: "current@example.com",
  });
  const removedExpert = await createConfirmedUser({
    email: "removed@example.com",
  });
  const readdedExpert = await createConfirmedUser({
    email: "readded@example.com",
  });

  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage,
    consensusPhase,
    active: true,
    evaluationStructureKey: "alternativeCriteriaMatrix",
    isConsensus,
    simulateConsensus,
    consensusThreshold,
    consensusMaxPhases,
    modelParameters: {
      beta: 2,
    },
  });

  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
    numericRange: { min: 0, max: 10, step: 1 },
  });
  const alternatives = await createIssueAlternativesFixture({
    issueId: issue._id,
    names: ["Alternative A", "Alternative B"],
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Criterion A"],
    expressionDomainId: domain._id,
  });

  return {
    owner,
    currentExpert,
    removedExpert,
    readdedExpert,
    issue,
    alternatives,
    leafCriteria,
  };
};

describe("compute participation timeline hardening", () => {
  it("ignores old history and same-phase evaluations from removed experts when computing the current phase", async () => {
    const {
      owner,
      currentExpert,
      removedExpert,
      issue,
      alternatives,
      leafCriteria,
    } = await createAlternativeTimelineFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: currentExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });

    await ExitUserIssue.create({
      issue: issue._id,
      user: removedExpert._id,
      hidden: true,
      phase: 2,
      stage: "alternativeEvaluation",
      reason: "Expelled by owner",
      history: [
        {
          phase: 0,
          stage: "alternativeEvaluation",
          action: "entered",
          reason: "Invited by owner",
        },
        {
          phase: 2,
          stage: "alternativeEvaluation",
          action: "exited",
          reason: "Expelled by owner",
        },
      ],
    });

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: currentExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 8,
          [String(alternatives[1]._id)]: 4,
        },
      }),
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: removedExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
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
    const removedDraftExpert = await createConfirmedUser({
      email: "removed-draft@example.com",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: removedDraftExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: false,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 3,
          [String(alternatives[1]._id)]: 7,
        },
      }),
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives }))
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const [, requestPayload] = httpClient.post.mock.calls[0];

    expect(requestPayload.evaluations).toHaveLength(1);
    expect(requestPayload.evaluations[0].expert.email).toBe("current@example.com");
    expect(result.currentStage).toBe("finished");
  });

  it("counts re-added current experts as expected evaluators and rejects compute until they complete the current phase", async () => {
    const {
      owner,
      currentExpert,
      readdedExpert,
      issue,
      alternatives,
      leafCriteria,
    } = await createAlternativeTimelineFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: currentExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: readdedExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: false,
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });

    await ExitUserIssue.create({
      issue: issue._id,
      user: readdedExpert._id,
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
      expertId: currentExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 6,
          [String(alternatives[1]._id)]: 5,
        },
      }),
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: readdedExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 2,
          [String(alternatives[1]._id)]: 8,
        },
      }),
    });

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "alternativeEvaluation",
        httpClient: createHttpClientMock(),
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EVALUATION_STAGE_NOT_COMPLETED_BY_ALL_EXPERTS",
      field: "stage",
      details: {
        pendingExpertIds: expect.arrayContaining([String(readdedExpert._id)]),
      },
    });
  });

  it("uses only current-phase completed evaluations after a re-added expert completes the current phase", async () => {
    const {
      owner,
      currentExpert,
      readdedExpert,
      issue,
      alternatives,
      leafCriteria,
    } = await createAlternativeTimelineFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: currentExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      entryPhase: 0,
      entryStage: "alternativeEvaluation",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: readdedExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: currentExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 9,
          [String(alternatives[1]._id)]: 1,
        },
      }),
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: readdedExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 2,
          [String(alternatives[1]._id)]: 8,
        },
      }),
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: readdedExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 5,
          [String(alternatives[1]._id)]: 7,
        },
      }),
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives }))
    );

    await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const [, requestPayload] = httpClient.post.mock.calls[0];

    expect(requestPayload.evaluations).toHaveLength(2);
    expect(requestPayload.evaluations.map((entry) => entry.expert.email).sort()).toEqual([
      "current@example.com",
      "readded@example.com",
    ]);
    expect(requestPayload.evaluations.find((entry) => entry.expert.email === "readded@example.com").payload).toEqual(
      buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 5,
          [String(alternatives[1]._id)]: 7,
        },
      })
    );
    expect(await IssueEvaluation.countDocuments({
      issue: issue._id,
      expert: readdedExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
    })).toBe(1);
  });

  it("does not advance consensusPhase or create next-phase evaluations when simulated consensus suggestions are invalid", async () => {
    const {
      owner,
      currentExpert,
      readdedExpert,
      issue,
      alternatives,
      leafCriteria,
    } = await createAlternativeTimelineFixture({
      isConsensus: true,
      simulateConsensus: true,
      consensusPhase: 0,
      consensusThreshold: 0.95,
      consensusMaxPhases: 2,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: currentExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      entryPhase: 0,
      entryStage: "alternativeEvaluation",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: readdedExpert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      entryPhase: 0,
      entryStage: "alternativeEvaluation",
    });

    for (const expert of [currentExpert, readdedExpert]) {
      await createIssueEvaluationFixture({
        issueId: issue._id,
        expertId: expert._id,
        stage: "alternativeEvaluation",
        consensusPhase: 0,
        completed: true,
        payload: buildAlternativeMatrixPayload({
          alternatives,
          leafCriteria,
          valuesByAlternativeId: {
            [String(alternatives[0]._id)]: 7,
            [String(alternatives[1]._id)]: 3,
          },
        }),
      });
    }

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse({
        ...buildAlternativeServiceResult({
          alternatives,
          consensusMeasure: 0.4,
        }),
        rawOutput: {
          suggested_next_evaluations: {
            [String(currentExpert._id)]: {
              payload: buildAlternativeMatrixPayload({
                alternatives,
                leafCriteria,
                valuesByAlternativeId: {
                  [String(alternatives[0]._id)]: 9,
                  [String(alternatives[1]._id)]: 1,
                },
              }),
            },
          },
        },
      })
    );

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "alternativeEvaluation",
        httpClient,
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      field: "rawOutput.suggested_next_evaluations",
      message: "Suggested next evaluations do not match accepted experts",
    });

    const storedIssue = await Issue.findById(issue._id).lean();

    expect(storedIssue.consensusPhase).toBe(0);
    expect(await IssueEvaluation.countDocuments({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
    })).toBe(0);
    expect(await IssueStageResult.countDocuments({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
    })).toBe(0);
  });
});

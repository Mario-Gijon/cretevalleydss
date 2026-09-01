import { describe, expect, it, vi } from "vitest";

import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Issue } from "../../../models/Issues.js";
import { IssueExecutionAttempt } from "../../../models/IssueExecutionAttempts.js";
import { IssueEvaluationRevision } from "../../../models/IssueEvaluationRevisions.js";
import { IssueEvent } from "../../../models/IssueEvents.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { Participation } from "../../../models/Participations.js";
import { computeIssueEvaluationStage } from "../../../modules/issues/computation/index.js";
import { writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import { serializePhaseResults } from "../../../modules/issues/finished/finishedPayload/serializers/serializePhaseResults.js";
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

const buildModelSuccessResponse = (data) => ({
  data: {
    success: true,
    data,
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

const buildManualWeightsPayload = (leafCriteria, values) => ({
  weightsByCriterion: Object.fromEntries(
    leafCriteria.map((criterion, index) => [
      String(criterion._id),
      values[index],
    ])
  ),
});

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
          [criterionId]: valuesByAlternativeId[alternativeId],
        },
      ];
    })
  );
};

const buildCriteriaWeightingServiceResult = ({
  leafCriteria,
  message = "Criteria weighting computed successfully.",
  weights = [],
  collectiveEvaluations = null,
  consensusMeasure = null,
  rawOutput = { provider: "mocked" },
}) => {
  const weightsByCriterion = Object.fromEntries(
    leafCriteria.map((criterion, index) => [
      String(criterion._id),
      weights[index] ?? 1,
    ])
  );

  return {
    message,
    weightsByCriterion,
    collectiveEvaluations:
      collectiveEvaluations ?? {
        weightsByCriterion,
      },
    consensusMeasure,
    rawOutput,
  };
};

const buildAlternativeServiceResult = ({
  alternatives,
  leafCriteria,
  rankedAlternativeResultLabels = null,
  consensusMeasure = null,
  collectiveEvaluations = buildAlternativeMatrixPayload({
    alternatives,
    leafCriteria,
    valuesByAlternativeId: Object.fromEntries(
      alternatives.map((alternative, index) => [
        String(alternative._id),
        alternatives.length - index,
      ])
    ),
  }),
  plotsGraphic = { series: [] },
  rawOutput = { provider: "mocked" },
}) => ({
  rankedAlternatives: alternatives.map((alternative, index) => ({
    alternativeId: String(alternative._id),
    name: alternative.name,
    score: alternatives.length - index,
    rank: index + 1,
    ...(rankedAlternativeResultLabels?.[index]
      ? { resultLabel: rankedAlternativeResultLabels[index] }
      : {}),
  })),
  collectiveEvaluations,
  plotsGraphic,
  consensusMeasure,
  rawOutput,
});

const createCriteriaComputeFixture = async ({
  currentStage = "weightsFinished",
  active = true,
  consensusPhase = 0,
  acceptedExpertCount = 2,
  pendingExpertCount = 0,
  acceptedWeightsCompleted = true,
  issueOverrides = {},
} = {}) => {
  const owner = await createConfirmedUser({
    email: "owner@example.com",
  });
  const acceptedExperts = await Promise.all(
    Array.from({ length: acceptedExpertCount }, (_, index) =>
      createConfirmedUser({
        email: `accepted-${index}@example.com`,
      })
    )
  );
  const pendingExperts = await Promise.all(
    Array.from({ length: pendingExpertCount }, (_, index) =>
      createConfirmedUser({
        email: `pending-${index}@example.com`,
      })
    )
  );
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    active,
    currentStage,
    consensusPhase,
    criteriaWeightsStructureKey: "manualCriteriaWeights",
    criteriaWeightingApiModelKey: "criteria-weighting-model",
    criteriaWeightingApiEndpoint: {
      method: "POST",
      path: "/criteria-weighting",
    },
    criteriaWeightingParameters: {
      alpha: 1,
    },
    ...issueOverrides,
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
  });
  const alternatives = await createIssueAlternativesFixture({
    issueId: issue._id,
    names: ["Alternative A", "Alternative B"],
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Criterion A", "Criterion B"],
    expressionDomainId: domain._id,
  });

  for (const expert of acceptedExperts) {
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      weightsCompleted: acceptedWeightsCompleted,
      entryPhase: consensusPhase,
      entryStage: "criteriaWeighting",
    });
  }

  for (const expert of pendingExperts) {
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
      weightsCompleted: false,
      entryPhase: consensusPhase,
      entryStage: "criteriaWeighting",
    });
  }
  return {
    owner,
    acceptedExperts,
    pendingExperts,
    issue,
    domain,
    alternatives,
    leafCriteria,
  };
};

const createAlternativeComputeFixture = async ({
  active = true,
  currentStage = "alternativeEvaluation",
  consensusPhase = 0,
  acceptedExpertCount = 2,
  pendingExpertCount = 0,
  evaluationCompleted = true,
  issueOverrides = {},
} = {}) => {
  const owner = await createConfirmedUser({
    email: "owner@example.com",
  });
  const acceptedExperts = await Promise.all(
    Array.from({ length: acceptedExpertCount }, (_, index) =>
      createConfirmedUser({
        email: `accepted-${index}@example.com`,
      })
    )
  );
  const pendingExperts = await Promise.all(
    Array.from({ length: pendingExpertCount }, (_, index) =>
      createConfirmedUser({
        email: `pending-${index}@example.com`,
      })
    )
  );
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    active,
    currentStage,
    consensusPhase,
    evaluationStructureKey: "alternativeCriteriaMatrix",
    modelParameters: {
      weights: {},
      beta: 2,
    },
    ...issueOverrides,
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

  for (const expert of acceptedExperts) {
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      evaluationCompleted,
      entryPhase: consensusPhase,
      entryStage: "alternativeEvaluation",
    });
  }

  for (const expert of pendingExperts) {
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
      evaluationCompleted: false,
      entryPhase: consensusPhase,
      entryStage: "alternativeEvaluation",
    });
  }
  if (issueOverrides.isConsensus === true) {
    await writeIssueStateSnapshot({ issue, snapshotType: "creation", occurredAt: new Date(), correlationId: "fixture-creation" });
  }

  return {
    owner,
    acceptedExperts,
    pendingExperts,
    issue,
    domain,
    alternatives,
    leafCriteria,
  };
};

const createCompletedCriteriaEvaluations = async ({
  issueId,
  experts,
  leafCriteria,
  consensusPhase = 0,
}) => {
  for (const [index, expert] of experts.entries()) {
    await createIssueEvaluationFixture({
      issueId,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase,
      completed: true,
      payload: buildManualWeightsPayload(leafCriteria, [0.7 - index * 0.1, 0.3 + index * 0.1]),
    });
  }
};

const createCompletedAlternativeEvaluations = async ({
  issueId,
  experts,
  alternatives,
  leafCriteria,
  consensusPhase = 0,
}) => {
  for (const [index, expert] of experts.entries()) {
    await createIssueEvaluationFixture({
      issueId,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 8 - index,
          [String(alternatives[1]._id)]: 4 + index,
        },
      }),
    });
  }
};

describe("computeIssueEvaluationStage guards", () => {
  it("rejects non-owner compute requests", async () => {
    const outsider = await createConfirmedUser({
      email: "outsider@example.com",
    });
    const { issue, acceptedExperts, leafCriteria } =
      await createCriteriaComputeFixture();

    await createCompletedCriteriaEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      leafCriteria,
    });

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: outsider._id,
        stage: "criteriaWeighting",
        httpClient: createHttpClientMock(),
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      field: "userId",
      message: "Only the issue owner can compute evaluation stages",
    });
  });

  it("rejects unsupported compute stages explicitly", async () => {
    const { owner, issue } = await createAlternativeComputeFixture();

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "not-a-stage",
        httpClient: createHttpClientMock(),
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "UNSUPPORTED_EVALUATION_STAGE",
      field: "stage",
    });
  });

  it("rejects criteriaWeighting compute unless the issue is in weightsFinished", async () => {
    const { owner, issue } = await createCriteriaComputeFixture({
      currentStage: "criteriaWeighting",
    });

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "criteriaWeighting",
        httpClient: createHttpClientMock(),
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "ISSUE_STAGE_NOT_READY_TO_COMPUTE",
      field: "stage",
      details: {
        currentStage: "criteriaWeighting",
        requestedStage: "criteriaWeighting",
      },
    });
  });

  it("rejects alternativeEvaluation compute unless the issue is in alternativeEvaluation", async () => {
    const { owner, issue } = await createAlternativeComputeFixture({
      currentStage: "weightsFinished",
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
      code: "ISSUE_STAGE_NOT_READY_TO_COMPUTE",
      field: "stage",
      details: {
        currentStage: "weightsFinished",
        requestedStage: "alternativeEvaluation",
      },
    });
  });

  it("rejects compute for inactive issues", async () => {
    const { owner, issue, acceptedExperts, alternatives, leafCriteria } =
      await createAlternativeComputeFixture({
        active: false,
      });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
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
      code: "ISSUE_NOT_ACTIVE",
      field: "issueId",
      message: "Issue is not active",
    });
  });

  it("rejects compute when pending invitations exist", async () => {
    const { owner, issue, acceptedExperts, leafCriteria } =
      await createCriteriaComputeFixture({
        pendingExpertCount: 1,
      });

    await createCompletedCriteriaEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      leafCriteria,
    });

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "criteriaWeighting",
        httpClient: createHttpClientMock(),
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "PENDING_INVITATIONS_BLOCK_STAGE_COMPUTE",
      field: "stage",
    });
  });

  it("rejects compute when there are no accepted participants", async () => {
    const { owner, issue } = await createAlternativeComputeFixture({
      acceptedExpertCount: 0,
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
      code: "NO_ACCEPTED_PARTICIPATIONS",
      field: "issueId",
    });
  });

  it("rejects compute when an accepted participant has not completed the requested stage", async () => {
    const { owner, issue } = await createAlternativeComputeFixture({
      evaluationCompleted: false,
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
    });
  });

  it("rejects compute when completion flags exist without matching completed evaluation documents", async () => {
    const { owner, issue } = await createCriteriaComputeFixture();

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "criteriaWeighting",
        httpClient: createHttpClientMock(),
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "COMPLETED_EVALUATIONS_MISSING",
      field: "stage",
    });
  });
});

describe("criteria weighting compute orchestration", () => {
  it("loads completed evaluations, calls the configured endpoint, persists IssueStageResult, and moves the issue forward", async () => {
    const { owner, issue, acceptedExperts, leafCriteria } =
      await createCriteriaComputeFixture({
        consensusPhase: 2,
      });

    await createCompletedCriteriaEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      leafCriteria,
      consensusPhase: 2,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildCriteriaWeightingServiceResult({
          leafCriteria,
          weights: [0.65, 0.35],
          collectiveEvaluations: {
            weightsByCriterion: {
              [String(leafCriteria[0]._id)]: 0.65,
              [String(leafCriteria[1]._id)]: 0.35,
            },
          },
          consensusMeasure: 0.72,
          rawOutput: {
            backend: "mock",
          },
        })
      )
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "criteriaWeighting",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const [calledUrl, requestPayload] = httpClient.post.mock.calls[0];
    const storedIssue = await Issue.findById(issue._id).lean();
    const stageResult = await IssueStageResult.findOne({
      issue: issue._id,
      stage: "criteriaWeighting",
      consensusPhase: 2,
    }).lean();

    expect(calledUrl).toBe("http://models.test/criteria-weighting");
    expect(requestPayload).toMatchObject({
      modelParameters: {
        alpha: 1,
      },
      context: {
        issue: {
          id: String(issue._id),
          name: issue.name,
        },
        consensusPhase: 2,
        structure: {
          key: "manualCriteriaWeights",
          stage: "criteriaWeighting",
        },
      },
    });
    expect(requestPayload.context.criteria).toEqual([
      expect.objectContaining({
        id: String(leafCriteria[0]._id),
        name: "Criterion A",
      }),
      expect.objectContaining({
        id: String(leafCriteria[1]._id),
        name: "Criterion B",
      }),
    ]);
    expect(requestPayload.evaluations).toHaveLength(2);
    expect(requestPayload.evaluations.map((entry) => entry.expert.email).sort()).toEqual(
      acceptedExperts.map((expert) => expert.email).sort()
    );

    expect(stageResult).toMatchObject({
      issue: issue._id,
      stage: "criteriaWeighting",
      consensusPhase: 2,
      inputSnapshot: {
        expertWeights: expect.any(Array),
      },
      result: {
        standardResult: {
          collectiveEvaluations: {
            weightsByCriterion: {
              [String(leafCriteria[0]._id)]: 0.65,
              [String(leafCriteria[1]._id)]: 0.35,
            },
          },
          weightsByCriterion: {
            [String(leafCriteria[0]._id)]: 0.65,
            [String(leafCriteria[1]._id)]: 0.35,
          },
        },
        rawOutput: {
          backend: "mock",
        },
      },
    });
    expect(stageResult.result.modelExecution).toMatchObject({
      kind: "decisionModelsService",
      structureKey: "manualCriteriaWeights",
      apiModelKey: "criteria-weighting-model",
      apiEndpointPath: "/criteria-weighting",
    });
    expect(stageResult.result.standardResult).not.toHaveProperty("rankedAlternatives");
    expect(stageResult.result.standardResult).not.toHaveProperty("plotsGraphic");
    expect(storedIssue.currentStage).toBe("alternativeEvaluation");
    expect(storedIssue.modelParameters.weights).toEqual({
      [String(leafCriteria[0]._id)]: 0.65,
      [String(leafCriteria[1]._id)]: 0.35,
    });
    expect(result).toMatchObject({
      stage: "criteriaWeighting",
      structureKey: "manualCriteriaWeights",
      consensusPhase: 2,
      currentStage: "alternativeEvaluation",
      result: {
        weightsByCriterion: {
          [String(leafCriteria[0]._id)]: 0.65,
          [String(leafCriteria[1]._id)]: 0.35,
        },
        collectiveEvaluations: {
          weightsByCriterion: {
            [String(leafCriteria[0]._id)]: 0.65,
            [String(leafCriteria[1]._id)]: 0.35,
          },
        },
        consensusMeasure: 0.72,
        rawOutput: {
          backend: "mock",
        },
      },
    });
  });

  it("creates the phase-zero boundary only after expert criteria weighting moves a consensus issue forward", async () => {
    const { owner, issue, acceptedExperts, leafCriteria } = await createCriteriaComputeFixture({
      issueOverrides: { isConsensus: true, supportsConsensus: true, consensusThreshold: 0.8, consensusMaxPhases: 3 },
    });
    await writeIssueStateSnapshot({ issue, snapshotType: "creation", occurredAt: new Date(), correlationId: "criteria-boundary-creation" });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "creation" })).toBe(1);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 0 })).toBe(0);
    await createCompletedCriteriaEvaluations({ issueId: issue._id, experts: acceptedExperts, leafCriteria });

    await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "criteriaWeighting",
      httpClient: createHttpClientMock(buildModelSuccessResponse(buildCriteriaWeightingServiceResult({ leafCriteria, weights: [0.65, 0.35] }))),
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const phaseZero = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 0 }).lean();
    expect(phaseZero).not.toBeNull();
    expect(phaseZero.state.evaluations).toEqual([]);
    expect(phaseZero.state.criteriaWeighting.weightsByCriterionId).toEqual({ [String(leafCriteria[0]._id)]: 0.65, [String(leafCriteria[1]._id)]: 0.35 });
  });

  it("rejects invalid criteria weighting model responses before persistence", async () => {
    const { owner, issue, acceptedExperts, leafCriteria } =
      await createCriteriaComputeFixture();

    await createCompletedCriteriaEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      leafCriteria,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse({
        weightsByCriterion: {
          [String(leafCriteria[0]._id)]: 0.5,
          [String(leafCriteria[1]._id)]: 0.5,
        },
        collectiveEvaluations: {},
        rawOutput: {},
      })
    );

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "criteriaWeighting",
        httpClient,
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      field: "message",
      message: "Criteria weighting execution message is required",
    });

    expect(await IssueStageResult.countDocuments({ issue: issue._id })).toBe(0);
    expect((await Issue.findById(issue._id).lean()).currentStage).toBe("weightsFinished");
  });

  it("rejects criteria weighting responses that miss a required criterion weight", async () => {
    const { owner, issue, acceptedExperts, leafCriteria } =
      await createCriteriaComputeFixture();

    await createCompletedCriteriaEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      leafCriteria,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildCriteriaWeightingServiceResult({
          leafCriteria: [leafCriteria[0]],
          weights: [1],
        })
      )
    );

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "criteriaWeighting",
        httpClient,
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: `computeResult.weightsByCriterion.${String(leafCriteria[1]._id)}`,
    });
  });
});

describe("alternative compute orchestration", () => {
  it("loads only current-phase completed evaluations, includes expression domains, persists the stage result, and finishes non-consensus issues", async () => {
    const {
      owner,
      issue,
      domain,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      consensusPhase: 1,
      issueOverrides: {
        modelParameters: {
          gamma: 9,
        },
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
      consensusPhase: 1,
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: acceptedExperts[0]._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      completed: true,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 1,
          [String(alternatives[1]._id)]: 2,
        },
      }),
    });
    const outsiderDraftExpert = await createConfirmedUser({
      email: "draft-only@example.com",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: outsiderDraftExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: false,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 3,
          [String(alternatives[1]._id)]: 4,
        },
      }),
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          rankedAlternativeResultLabels: [
            "High, slightly leaning toward Very High",
            "High, leaning toward Medium",
          ],
          collectiveEvaluations: {
            [String(alternatives[0]._id)]: {
              [String(leafCriteria[0]._id)]: 7,
            },
            [String(alternatives[1]._id)]: {
              [String(leafCriteria[0]._id)]: 5,
            },
          },
          plotsGraphic: {
            scatter: [],
          },
          rawOutput: {
            source: "alt-model",
          },
        })
      )
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const [calledUrl, requestPayload] = httpClient.post.mock.calls[0];
    const stageResult = await IssueStageResult.findOne({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
    }).lean();
    const storedIssue = await Issue.findById(issue._id).lean();

    expect(calledUrl).toBe(`http://models.test${issue.apiEndpoint.path}`);
    expect(requestPayload).toMatchObject({
      modelParameters: {
        gamma: 9,
      },
      context: {
        issue: {
          id: String(issue._id),
          name: issue.name,
        },
        consensusPhase: 1,
        structure: {
          key: "alternativeCriteriaMatrix",
          stage: "alternativeEvaluation",
        },
      },
    });
    expect(requestPayload.context.alternatives).toEqual([
      expect.objectContaining({
        id: String(alternatives[0]._id),
        name: "Alternative A",
      }),
      expect.objectContaining({
        id: String(alternatives[1]._id),
        name: "Alternative B",
      }),
    ]);
    expect(requestPayload.context.criteria).toEqual([
      expect.objectContaining({
        id: String(leafCriteria[0]._id),
        name: "Criterion A",
        type: leafCriteria[0].type,
        expressionDomain: {
          _id: domain._id,
          id: String(domain._id),
          name: domain.name,
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 10, step: 1 },
        },
      }),
    ]);
    expect(requestPayload.evaluations).toHaveLength(2);

    expect(stageResult).toMatchObject({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      result: {
        standardResult: {
          collectiveEvaluations: {
            [String(alternatives[0]._id)]: {
              [String(leafCriteria[0]._id)]: 7,
            },
            [String(alternatives[1]._id)]: {
              [String(leafCriteria[0]._id)]: 5,
            },
          },
          plotsGraphic: {
            scatter: [],
          },
        },
        rawOutput: {
          source: "alt-model",
        },
      },
    });
    expect(stageResult.result.standardResult.rankedAlternatives).toEqual([
      expect.objectContaining({ resultLabel: "High, slightly leaning toward Very High" }),
      expect.objectContaining({ resultLabel: "High, leaning toward Medium" }),
    ]);
    const serializedPhase = serializePhaseResults({
      phaseResults: [stageResult],
      alternatives: alternatives.map((alternative) => ({
        id: String(alternative._id),
        name: alternative.name,
      })),
    })[0];
    expect(serializedPhase.standardizedOutput.rankedAlternatives).toEqual([
      expect.objectContaining({ resultLabel: "High, slightly leaning toward Very High" }),
      expect.objectContaining({ resultLabel: "High, leaning toward Medium" }),
    ]);
    expect(stageResult.result.standardResult).not.toHaveProperty("weightsByCriterion");
    expect(stageResult.result.modelExecution).toMatchObject({
      kind: "decisionModelsService",
      structureKey: "alternativeCriteriaMatrix",
      apiModelKey: issue.apiModelKey,
      apiEndpointPath: issue.apiEndpoint.path,
    });
    expect(storedIssue.currentStage).toBe("finished");
    expect(storedIssue.active).toBe(false);
    expect(storedIssue.finishedAt).toBeTruthy();
    expect(result).toMatchObject({
      stage: "alternativeEvaluation",
      structureKey: "alternativeCriteriaMatrix",
      consensusPhase: 1,
      currentStage: "finished",
      result: {
        collectiveEvaluations: {
          [String(alternatives[0]._id)]: {
            [String(leafCriteria[0]._id)]: 7,
          },
          [String(alternatives[1]._id)]: {
            [String(leafCriteria[0]._id)]: 5,
          },
        },
        plotsGraphic: {
          scatter: [],
        },
        consensusMeasure: null,
        rawOutput: {
          source: "alt-model",
        },
      },
    });
  });

  it("rejects invalid alternative model responses before persistence", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture();

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse({
        collectiveEvaluations: {},
        plotsGraphic: {},
        rawOutput: {},
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
      field: "result.rankedAlternatives",
      message: "Model execution result.rankedAlternatives must be a non-empty array",
    });

    expect(await IssueStageResult.countDocuments({ issue: issue._id })).toBe(0);
    const storedIssue = await Issue.findById(issue._id).lean();
    expect(storedIssue.currentStage).toBe("alternativeEvaluation");
    expect(storedIssue.active).toBe(true);
    expect(storedIssue.finishedAt).toBeNull();
  });

  it("replaces the complete persisted snapshot and result when recomputing an existing phase", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture();

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
    });
    await IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      inputSnapshot: {
        expertWeights: [{ expert: acceptedExperts[0]._id, weight: 1 }],
      },
      result: {
        standardResult: {
          consensusMeasure: 0.1,
          rankedAlternatives: [],
          collectiveEvaluations: buildAlternativeMatrixPayload({
            alternatives,
            leafCriteria,
            valuesByAlternativeId: {
              [String(alternatives[0]._id)]: 1,
              [String(alternatives[1]._id)]: 2,
            },
          }),
          plotsGraphic: { stale: true },
        },
        modelExecution: { stale: true },
        rawOutput: { stale: true },
      },
    });
    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          collectiveEvaluations: buildAlternativeMatrixPayload({
            alternatives,
            leafCriteria,
            valuesByAlternativeId: {
              [String(alternatives[0]._id)]: 8,
              [String(alternatives[1]._id)]: 9,
            },
          }),
          plotsGraphic: { refreshed: true },
          rawOutput: { refreshed: true },
        })
      )
    );

    await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const stageResult = await IssueStageResult.findOne({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
    }).lean();

    expect(stageResult.inputSnapshot).toEqual({ expertWeights: [] });
    expect(stageResult.result).toMatchObject({
      standardResult: {
        collectiveEvaluations: buildAlternativeMatrixPayload({
          alternatives,
          leafCriteria,
          valuesByAlternativeId: {
            [String(alternatives[0]._id)]: 8,
            [String(alternatives[1]._id)]: 9,
          },
        }),
        plotsGraphic: { refreshed: true },
      },
      rawOutput: { refreshed: true },
    });
    expect(stageResult.result).not.toMatchObject({ rawOutput: { stale: true } });
  });
});

describe("consensus compute lifecycle", () => {
  it("finishes a consensus issue when the threshold is reached", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      issueOverrides: {
        isConsensus: true,
        consensusThreshold: 0.8,
        consensusMaxPhases: 3,
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          consensusMeasure: 0.9,
        })
      )
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const storedIssue = await Issue.findById(issue._id).lean();
    const stageResult = await IssueStageResult.findOne({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
    }).lean();

    expect(storedIssue.currentStage).toBe("finished");
    expect(storedIssue.active).toBe(false);
    expect(stageResult.result.modelExecution.consensusLifecycle).toMatchObject({
      consensusReached: true,
      maxPhasesReached: false,
      finalizationReason: "consensusReached",
      currentConsensusPhase: 0,
      nextConsensusPhase: 0,
    });
    expect(result.result.consensusLifecycle).toMatchObject({
      consensusReached: true,
      finalizationReason: "consensusReached",
    });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 1 })).toBe(0);
  });

  it("advances to the next consensus round and resets accepted participation completion when consensus is not reached", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      consensusPhase: 1,
      issueOverrides: {
        isConsensus: true,
        consensusThreshold: 0.95,
        consensusMaxPhases: 3,
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
      consensusPhase: 1,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          consensusMeasure: 0.5,
        })
      )
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const storedIssue = await Issue.findById(issue._id).lean();
    const participations = await Participation.find({ issue: issue._id }).lean();

    expect(storedIssue.currentStage).toBe("alternativeEvaluation");
    expect(storedIssue.active).toBe(true);
    expect(storedIssue.consensusPhase).toBe(2);
    expect(participations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ evaluationCompleted: false }),
        expect.objectContaining({ evaluationCompleted: false }),
      ])
    );
    expect(await IssueEvaluation.countDocuments({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
    })).toBe(2);
    expect(result.result.consensusLifecycle).toMatchObject({
      consensusReached: false,
      maxPhasesReached: false,
      currentConsensusPhase: 1,
      nextConsensusPhase: 2,
    });
  });

  it("finalizes a consensus issue when the max phase limit is reached", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      consensusPhase: 3,
      issueOverrides: {
        isConsensus: true,
        consensusThreshold: 0.99,
        consensusMaxPhases: 3,
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
      consensusPhase: 3,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          consensusMeasure: 0.4,
        })
      )
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const storedIssue = await Issue.findById(issue._id).lean();

    expect(storedIssue.currentStage).toBe("finished");
    expect(storedIssue.active).toBe(false);
    expect(result.result.consensusLifecycle).toMatchObject({
      consensusReached: false,
      maxPhasesReached: true,
      finalizationReason: "maxPhasesReached",
      currentConsensusPhase: 3,
      nextConsensusPhase: 3,
    });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 4 })).toBe(0);
  });
});

describe("simulated consensus orchestration", () => {
  it("rejects simulated consensus issues that are not consensus-enabled", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      issueOverrides: {
        isConsensus: false,
        simulateConsensus: true,
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
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
      code: "SIMULATION_REQUIRES_CONSENSUS_ISSUE",
      field: "simulateConsensus",
    });
  });

  it("rejects simulated consensus when suggested next evaluations do not match accepted experts", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      issueOverrides: {
        isConsensus: true,
        simulateConsensus: true,
        consensusThreshold: 0.9,
        consensusMaxPhases: 2,
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
    });

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          consensusMeasure: 0.5,
          rawOutput: {
            suggested_next_evaluations: {
              [String(acceptedExperts[0]._id)]: {
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
      )
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
  });

  it("computes simulated consensus rounds until consensus is reached and stores next-phase evaluations", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture({
      issueOverrides: {
        isConsensus: true,
        simulateConsensus: true,
        consensusThreshold: 0.9,
        consensusMaxPhases: 2,
      },
    });

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
    });

    const nextPhaseSuggestions = Object.fromEntries(
      acceptedExperts.map((expert, index) => [
        String(expert._id),
        {
          payload: buildAlternativeMatrixPayload({
            alternatives,
            leafCriteria,
            valuesByAlternativeId: {
              [String(alternatives[0]._id)]: 9 - index,
              [String(alternatives[1]._id)]: 2 + index,
            },
          }),
        },
      ])
    );

    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          consensusMeasure: 0.4,
          rawOutput: {
            suggested_next_evaluations: nextPhaseSuggestions,
          },
        })
      ),
      buildModelSuccessResponse(
        buildAlternativeServiceResult({
          alternatives,
          leafCriteria,
          consensusMeasure: 0.95,
          rawOutput: {
            settled: true,
          },
        })
      )
    );

    const result = await computeIssueEvaluationStage({
      issueId: issue._id,
      userId: owner._id,
      stage: "alternativeEvaluation",
      httpClient,
      decisionModelsServiceBaseUrl: MODELS_BASE_URL,
    });

    const storedIssue = await Issue.findById(issue._id).lean();
    const stageResults = await IssueStageResult.find({
      issue: issue._id,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: 1 })
      .lean();
    const nextPhaseEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
    }).lean();
    const attempts = await IssueExecutionAttempt.find({ issue: issue._id, scope: "issueStage" }).sort({ consensusPhase: 1 }).lean();
    const generatedRevisions = await IssueEvaluationRevision.find({ issue: issue._id, action: "generated" }).lean();
    const phaseOneSnapshot = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 1 }).lean();

    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(stageResults.map((entry) => entry.consensusPhase)).toEqual([0, 1]);
    expect(nextPhaseEvaluations).toHaveLength(2);
    expect(attempts).toHaveLength(2);
    expect(attempts.map((attempt) => attempt.application.status)).toEqual(["applied", "applied"]);
    expect(stageResults.map((result, index) => String(result.executionAttempt))).toEqual(attempts.map((attempt) => String(attempt._id)));
    expect(generatedRevisions).toHaveLength(2);
    expect(generatedRevisions.every((revision) => revision.actorType === "system" && revision.actorUser === null && revision.submittedAt === null && String(revision.sourceExecutionAttempt) === String(attempts[0]._id))).toBe(true);
    expect(phaseOneSnapshot).toMatchObject({ sourceExecutionAttempt: attempts[0]._id, state: { issue: { consensusPhase: 1 }, evaluations: expect.arrayContaining([expect.objectContaining({ stage: "alternativeEvaluation", consensusPhase: 1, completed: true, submittedAt: null })]), previousPhase: { stageResultId: String(stageResults[0]._id), executionAttemptId: String(attempts[0]._id) } } });
    const originalPreviousPhase = structuredClone(phaseOneSnapshot.state.previousPhase);
    const snapshotCount = await IssueStateSnapshot.countDocuments({ issue: issue._id });
    await IssueStageResult.updateOne({ _id: stageResults[0]._id }, { $set: { "result.standardResult.consensusMeasure": 0.01, "result.standardResult.rankedAlternatives": [], "result.standardResult.collectiveEvaluations": { overwritten: true }, "result.modelExecution": { overwritten: true } } });
    expect((await IssueStateSnapshot.findById(phaseOneSnapshot._id).lean()).state.previousPhase).toEqual(originalPreviousPhase);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(snapshotCount);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 2 })).toBe(0);
    expect(storedIssue.currentStage).toBe("finished");
    expect(storedIssue.active).toBe(false);
    expect(storedIssue.consensusPhase).toBe(1);
    expect(result).toMatchObject({
      stage: "alternativeEvaluation",
      structureKey: "alternativeCriteriaMatrix",
      consensusPhase: 1,
      currentStage: "finished",
      result: {
        simulatedConsensus: {
          enabled: true,
          initialPhase: 0,
          finalPhase: 1,
          roundsComputed: 2,
          consensusReached: true,
          maxPhasesReached: false,
          finalizationReason: "consensusReached",
        },
      },
    });
  });

  it("rolls back a later continuing round, preserves the completed attempt, and stops further DMS calls", async () => {
    const { owner, issue, acceptedExperts, alternatives, leafCriteria } = await createAlternativeComputeFixture({ issueOverrides: { isConsensus: true, simulateConsensus: true, consensusThreshold: 0.9, consensusMaxPhases: 3 } });
    await createCompletedAlternativeEvaluations({ issueId: issue._id, experts: acceptedExperts, alternatives, leafCriteria });
    const committedSnapshots = structuredClone(await IssueStateSnapshot.find({ issue: issue._id }).sort({ snapshotType: 1, consensusPhase: 1, _id: 1 }).lean());
    const suggestions = (value) => Object.fromEntries(acceptedExperts.map((expert) => [String(expert._id), { payload: buildAlternativeMatrixPayload({ alternatives, leafCriteria, valuesByAlternativeId: { [String(alternatives[0]._id)]: value, [String(alternatives[1]._id)]: 2 } }) }]));
    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives, leafCriteria, consensusMeasure: 0.2, rawOutput: { suggested_next_evaluations: suggestions(8) } })),
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives, leafCriteria, consensusMeasure: 0.3, rawOutput: { suggested_next_evaluations: suggestions(7) } })),
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives, leafCriteria, consensusMeasure: 0.95, rawOutput: { settled: true } }))
    );
    const originalCreate = IssueEvent.create;
    const injected = new Error("round 1 application persistence failed");
    const createSpy = vi.spyOn(IssueEvent, "create").mockImplementation(async function(docs, options) {
      const event = Array.isArray(docs) ? docs[0] : docs;
      if (event.eventType === "consensus.phase.completed" && event.phase === 1) throw injected;
      return originalCreate.call(this, docs, options);
    });
    await expect(computeIssueEvaluationStage({ issueId: issue._id, userId: owner._id, stage: "alternativeEvaluation", httpClient, decisionModelsServiceBaseUrl: MODELS_BASE_URL })).rejects.toThrow(injected.message);
    createSpy.mockRestore();
    const attempts = await IssueExecutionAttempt.find({ issue: issue._id }).sort({ consensusPhase: 1 }).lean();
    const stageResults = await IssueStageResult.find({ issue: issue._id, stage: "alternativeEvaluation" }).sort({ consensusPhase: 1 }).lean();
    const events = await IssueEvent.find({ issue: issue._id }).lean();
    const revisions = await IssueEvaluationRevision.find({ issue: issue._id, action: "generated" }).lean();
    const storedIssue = await Issue.findById(issue._id).lean();
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(attempts).toHaveLength(2);
    expect(attempts[0].application.status).toBe("applied");
    expect(attempts[1]).toMatchObject({ status: "succeeded", application: { status: "failed", error: { message: injected.message } } });
    expect(attempts[1].application.completedAt).toBeInstanceOf(Date);
    expect(stageResults.map((result) => result.consensusPhase)).toEqual([0]);
    expect(revisions).toHaveLength(acceptedExperts.length);
    expect(storedIssue).toMatchObject({ consensusPhase: 1, currentStage: "alternativeEvaluation", active: true, finishedAt: null });
    expect(events.some((event) => event.eventType === "model.execution.applicationFailed" && String(event.entityId) === String(attempts[1]._id))).toBe(true);
    expect(events.some((event) => event.eventType === "consensus.phase.completed" && event.phase === 1)).toBe(false);
    expect(events.some((event) => event.eventType === "consensus.phase.started" && event.phase === 2)).toBe(false);
    const snapshots = await IssueStateSnapshot.find({ issue: issue._id }).sort({ snapshotType: 1, consensusPhase: 1, _id: 1 }).lean();
    expect(snapshots.find((snapshot) => snapshot.snapshotType === "creation").state).toEqual(committedSnapshots.find((snapshot) => snapshot.snapshotType === "creation").state);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 1 })).toBe(1);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 2 })).toBe(0);
    expect(snapshots).toHaveLength(committedSnapshots.length + 1);
  });

  it("rolls back final-round finalization after DMS succeeds", async () => {
    const { owner, issue, acceptedExperts, alternatives, leafCriteria } = await createAlternativeComputeFixture({ issueOverrides: { isConsensus: true, simulateConsensus: true, consensusThreshold: 0.9, consensusMaxPhases: 2 } });
    await createCompletedAlternativeEvaluations({ issueId: issue._id, experts: acceptedExperts, alternatives, leafCriteria });
    const suggestions = Object.fromEntries(acceptedExperts.map((expert) => [String(expert._id), { payload: buildAlternativeMatrixPayload({ alternatives, leafCriteria, valuesByAlternativeId: { [String(alternatives[0]._id)]: 8, [String(alternatives[1]._id)]: 2 } }) }]));
    const httpClient = createHttpClientMock(
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives, leafCriteria, consensusMeasure: 0.2, rawOutput: { suggested_next_evaluations: suggestions } })),
      buildModelSuccessResponse(buildAlternativeServiceResult({ alternatives, leafCriteria, consensusMeasure: 0.95, rawOutput: { settled: true } }))
    );
    const originalCreate = IssueEvent.create;
    const createSpy = vi.spyOn(IssueEvent, "create").mockImplementation(async function(docs, options) {
      const event = Array.isArray(docs) ? docs[0] : docs;
      if (event.eventType === "issue.finished" && event.phase === 1) throw new Error("finalization persistence failed");
      return originalCreate.call(this, docs, options);
    });
    await expect(computeIssueEvaluationStage({ issueId: issue._id, userId: owner._id, stage: "alternativeEvaluation", httpClient, decisionModelsServiceBaseUrl: MODELS_BASE_URL })).rejects.toThrow("finalization persistence failed");
    createSpy.mockRestore();
    const attempts = await IssueExecutionAttempt.find({ issue: issue._id }).sort({ consensusPhase: 1 }).lean();
    const storedIssue = await Issue.findById(issue._id).lean();
    const finalStageResult = await IssueStageResult.findOne({ issue: issue._id, stage: "alternativeEvaluation", consensusPhase: 1 });
    const events = await IssueEvent.find({ issue: issue._id }).lean();
    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect(attempts[0].application.status).toBe("applied");
    expect(attempts[1]).toMatchObject({ status: "succeeded", application: { status: "failed" } });
    expect(finalStageResult).toBeNull();
    expect(storedIssue).toMatchObject({ consensusPhase: 1, currentStage: "alternativeEvaluation", active: true, finishedAt: null });
    expect(events.some((event) => event.eventType === "issue.finished" && event.phase === 1)).toBe(false);
    expect(events.some((event) => event.eventType === "issue.stage.changed" && event.stage === "finished")).toBe(false);
    expect(events.some((event) => event.eventType === "model.execution.applicationFailed" && String(event.entityId) === String(attempts[1]._id))).toBe(true);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 1 })).toBe(1);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 2 })).toBe(0);
  });
});

describe("compute model-service error handling", () => {
  it("surfaces upstream model service request failures as controlled errors", async () => {
    const {
      owner,
      issue,
      acceptedExperts,
      alternatives,
      leafCriteria,
    } = await createAlternativeComputeFixture();

    await createCompletedAlternativeEvaluations({
      issueId: issue._id,
      experts: acceptedExperts,
      alternatives,
      leafCriteria,
    });

    const httpClient = {
      post: vi.fn().mockRejectedValue({
        message: "Service unavailable",
        response: {
          status: 503,
          data: {
            message: "Upstream service unavailable",
            error: {
              code: "UPSTREAM_DOWN",
            },
          },
        },
      }),
    };

    await expect(
      computeIssueEvaluationStage({
        issueId: issue._id,
        userId: owner._id,
        stage: "alternativeEvaluation",
        httpClient,
        decisionModelsServiceBaseUrl: MODELS_BASE_URL,
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "UPSTREAM_DOWN",
      message: "Upstream service unavailable",
    });
  });
});

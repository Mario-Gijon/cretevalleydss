import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `token-${payload?.uid ?? "anonymous"}`,
    verify: () => authState.currentPayload,
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

const buildManualWeightsPayload = (leafCriteria) => ({
  weightsByCriterion: {
    [String(leafCriteria[0]._id)]: 1,
  },
});

const buildAlternativeMatrixPayload = ({ alternatives, leafCriteria }) => ({
  [String(alternatives[0]._id)]: {
    [String(leafCriteria[0]._id)]: {
      value: 6,
    },
  },
  [String(alternatives[1]._id)]: {
    [String(leafCriteria[0]._id)]: {
      value: 4,
    },
  },
});

const createCriteriaWeightingIssueApiFixture = async () => {
  const owner = await createConfirmedUser();
  const expert = await createConfirmedUser({
    email: "expert@example.com",
  });
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage: "criteriaWeighting",
    criteriaWeightsStructureKey: "manualCriteriaWeights",
  });
  await createIssueAlternativesFixture({
    issueId: issue._id,
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
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
    entryPhase: 0,
    entryStage: "criteriaWeighting",
  });

  return {
    owner,
    expert,
    issue,
    leafCriteria,
  };
};

const createAlternativeEvaluationIssueApiFixture = async () => {
  const owner = await createConfirmedUser();
  const expert = await createConfirmedUser({
    email: "expert@example.com",
  });
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage: "alternativeEvaluation",
    evaluationStructureKey: "alternativeCriteriaMatrix",
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
  });
  const alternatives = await createIssueAlternativesFixture({
    issueId: issue._id,
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
    entryPhase: 0,
    entryStage: "alternativeEvaluation",
  });

  return {
    owner,
    expert,
    issue,
    alternatives,
    leafCriteria,
  };
};

describe("evaluation API contracts", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("unauthenticated evaluation routes are rejected by middleware", async () => {
    const issueId = "000000000000000000000001";

    await request(app)
      .post(`/api/issues/${issueId}/evaluations/criteriaWeighting/send`)
      .send({ payload: {} })
      .expect(401);

    await request(app)
      .post(`/api/issues/${issueId}/evaluations/criteriaWeighting/submit`)
      .send({ payload: {} })
      .expect(401);

    await request(app)
      .get(`/api/issues/${issueId}/evaluations/criteriaWeighting`)
      .expect(401);
  });

  it("authenticated POST /api/issues/:id/evaluations/:stage/send saves a draft", async () => {
    const { expert, issue, leafCriteria } =
      await createCriteriaWeightingIssueApiFixture();

    authState.currentPayload = {
      uid: String(expert._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/send`)
      .set(getAuthHeader())
      .send({
        payload: buildManualWeightsPayload(leafCriteria),
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Evaluation draft saved successfully",
      data: {
        stage: "criteriaWeighting",
        structureKey: "manualCriteriaWeights",
        consensusPhase: 0,
        completed: false,
      },
    });
  });

  it("authenticated POST /api/issues/:id/evaluations/:stage/submit submits and returns currentStage", async () => {
    const {
      expert,
      issue,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationIssueApiFixture();

    authState.currentPayload = {
      uid: String(expert._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/alternativeEvaluation/submit`)
      .set(getAuthHeader())
      .send({
        payload: buildAlternativeMatrixPayload({
          alternatives,
          leafCriteria,
        }),
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Evaluation submitted successfully",
      data: {
        stage: "alternativeEvaluation",
        structureKey: "alternativeCriteriaMatrix",
        consensusPhase: 0,
        completed: true,
        currentStage: "alternativeEvaluation",
      },
    });
  });

  it("authenticated GET /api/issues/:id/evaluations/:stage returns the current evaluation payload", async () => {
    const { expert, issue, leafCriteria } =
      await createCriteriaWeightingIssueApiFixture();

    authState.currentPayload = {
      uid: String(expert._id),
      role: "user",
    };

    await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/send`)
      .set(getAuthHeader())
      .send({
        payload: buildManualWeightsPayload(leafCriteria),
      })
      .expect(200);

    const response = await request(app)
      .get(`/api/issues/${issue._id}/evaluations/criteriaWeighting`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Evaluation fetched successfully",
      data: {
        stage: "criteriaWeighting",
        structureKey: "manualCriteriaWeights",
        consensusPhase: 0,
        evaluationContext: expect.any(Object),
        payload: {
          weightsByCriterion: {
            [String(leafCriteria[0]._id)]: 1,
          },
        },
        completed: false,
        submittedAt: null,
      },
    });
  });

  it("unrelated authenticated user is rejected from evaluation routes", async () => {
    const outsider = await createConfirmedUser();
    const { issue, leafCriteria } = await createCriteriaWeightingIssueApiFixture();

    authState.currentPayload = {
      uid: String(outsider._id),
      role: "user",
    };

    const expectedError = {
      success: false,
      message: "You are not an accepted participant for this issue",
      error: {
        field: "userId",
      },
    };

    const saveResponse = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/send`)
      .set(getAuthHeader())
      .send({
        payload: buildManualWeightsPayload(leafCriteria),
      })
      .expect(403);

    const getResponse = await request(app)
      .get(`/api/issues/${issue._id}/evaluations/criteriaWeighting`)
      .set(getAuthHeader())
      .expect(403);

    const submitResponse = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/submit`)
      .set(getAuthHeader())
      .send({
        payload: buildManualWeightsPayload(leafCriteria),
      })
      .expect(403);

    expect(saveResponse.body).toMatchObject(expectedError);
    expect(getResponse.body).toMatchObject(expectedError);
    expect(submitResponse.body).toMatchObject(expectedError);
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

const axiosState = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `token-${payload?.uid ?? "anonymous"}`,
    verify: () => authState.currentPayload,
  },
}));

vi.mock("axios", () => ({
  default: {
    post: axiosState.post,
  },
}));

vi.mock("../../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../../app.js";
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

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

const buildManualWeightsPayload = (leafCriteria, values) => ({
  weightsByCriterion: Object.fromEntries(
    leafCriteria.map((criterion, index) => [
      String(criterion._id),
      values[index] ?? 1,
    ])
  ),
});

const buildCriteriaComputeApiFixture = async ({
  currentStage = "weightsFinished",
} = {}) => {
  const owner = await createConfirmedUser({
    email: "owner@example.com",
  });
  const outsider = await createConfirmedUser({
    email: "outsider@example.com",
  });
  const experts = await Promise.all([
    createConfirmedUser({ email: "expert-a@example.com" }),
    createConfirmedUser({ email: "expert-b@example.com" }),
  ]);
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage,
    criteriaWeightsStructureKey: "manualCriteriaWeights",
    criteriaWeightingApiModelKey: "criteria-weighting-model",
    criteriaWeightingApiEndpoint: {
      method: "POST",
      path: "/criteria-weighting",
    },
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
  });
  await createIssueAlternativesFixture({
    issueId: issue._id,
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Criterion A", "Criterion B"],
    expressionDomainId: domain._id,
  });

  for (const [index, expert] of experts.entries()) {
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      weightsCompleted: true,
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
      completed: true,
      payload: buildManualWeightsPayload(leafCriteria, [0.7 - index * 0.1, 0.3 + index * 0.1]),
    });
  }

  return {
    owner,
    outsider,
    issue,
    leafCriteria,
  };
};

describe("compute evaluation API contracts", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    axiosState.post.mockReset();
  });

  it("authenticated owners can POST /api/issues/:id/evaluations/:stage/compute", async () => {
    const { owner, issue, leafCriteria } = await buildCriteriaComputeApiFixture();

    axiosState.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          message: "Criteria weighting computed successfully.",
          weightsByCriterion: {
            [String(leafCriteria[0]._id)]: 0.6,
            [String(leafCriteria[1]._id)]: 0.4,
          },
          collectiveEvaluations: {
            weightsByCriterion: {
              [String(leafCriteria[0]._id)]: 0.6,
              [String(leafCriteria[1]._id)]: 0.4,
            },
          },
          consensusMeasure: 0.8,
          rawOutput: {
            provider: "mocked",
          },
        },
      },
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/compute`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Criteria weighting computed successfully.",
      data: {
        stage: "criteriaWeighting",
        structureKey: "manualCriteriaWeights",
        consensusPhase: 0,
        currentStage: "alternativeEvaluation",
        result: {
          weightsByCriterion: {
            [String(leafCriteria[0]._id)]: 0.6,
            [String(leafCriteria[1]._id)]: 0.4,
          },
          consensusMeasure: 0.8,
        },
      },
    });
    expect(axiosState.post).toHaveBeenCalledTimes(1);
  });

  it("unauthenticated compute requests are rejected by middleware", async () => {
    const issueId = "000000000000000000000001";

    const response = await request(app)
      .post(`/api/issues/${issueId}/evaluations/criteriaWeighting/compute`)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Token does not exist.",
      error: {
        code: "NO_TOKEN",
      },
    });
  });

  it("authenticated non-owners cannot compute an issue stage", async () => {
    const { outsider, issue } = await buildCriteriaComputeApiFixture();

    authState.currentPayload = {
      uid: String(outsider._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/compute`)
      .set(getAuthHeader())
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: "Only the issue owner can compute evaluation stages",
      error: {
        field: "userId",
      },
    });
  });

  it("returns a clear error when the requested stage is not ready for compute", async () => {
    const { owner, issue } = await buildCriteriaComputeApiFixture({
      currentStage: "criteriaWeighting",
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/compute`)
      .set(getAuthHeader())
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Issue is not currently ready to compute 'criteriaWeighting'",
      error: {
        code: "ISSUE_STAGE_NOT_READY_TO_COMPUTE",
        field: "stage",
      },
    });
  });
});

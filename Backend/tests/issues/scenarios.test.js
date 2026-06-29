import mongoose from "mongoose";
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
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import {
  getIssueScenariosPayload,
  getScenarioByIdPayload,
  removeIssueScenario,
} from "../../modules/issues/scenarios/index.js";
import {
  createConfirmedUser,
  createIssueFixture,
  createParticipationFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

const createScenarioFixture = async ({
  issueId,
  createdBy,
  name = "Scenario A",
  targetModelId = null,
  targetModelName = "Scenario Model",
  domainType = "numeric",
  evaluationStructureKey = "alternativeCriteriaMatrix",
  criteriaWeightsStructureKey = "manualCriteriaWeights",
  status = "done",
  config = {
    modelParameters: { alpha: 1 },
    normalizedModelParameters: { alpha: 1 },
  },
  inputs = {
    consensusPhaseUsed: 0,
    expertsOrder: ["expert@example.com"],
    alternatives: [{ id: new mongoose.Types.ObjectId(), name: "Alternative A" }],
    criteria: [{
      id: new mongoose.Types.ObjectId(),
      name: "Criterion A",
      criterionType: "benefit",
    }],
    weightsUsed: { "criterion-1": 1 },
    evaluationPayloads: [{ expert: { id: "expert-1" }, payload: { value: 1 } }],
    context: { issue: { id: String(issueId) } },
  },
  outputs = {
    standardResult: { ranking: ["Alternative A"] },
    modelExecution: { ok: true },
    rawOutput: { raw: true },
  },
} = {}) => {
  return IssueScenario.create({
    issue: issueId,
    createdBy,
    name,
    targetModel: targetModelId ?? createdBy,
    targetModelName,
    targetApiModelKey: "scenario-model",
    targetApiEndpoint: {
      method: "POST",
      path: "/solve-scenario",
    },
    targetEvaluationStructureKey: "alternativeCriteriaMatrix",
    targetSupportsConsensus: false,
    evaluationStructureKey,
    criteriaWeightsStructureKey,
    domainType,
    status,
    config,
    inputs,
    outputs,
  });
};

describe("issue scenarios access and payloads", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("owner can list scenarios for their issue with the stable payload fields", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      createdBy: owner._id,
    });

    await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
      name: "Owner scenario",
    });

    const result = await getIssueScenariosPayload({
      issueId: issue._id,
      userId: owner._id,
    });

    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0]).toMatchObject({
      id: expect.any(String),
      name: "Owner scenario",
      targetModelId: expect.any(String),
      targetModelName: "Scenario Model",
      domainType: "numeric",
      evaluationStructureKey: "alternativeCriteriaMatrix",
      criteriaWeightsStructureKey: "manualCriteriaWeights",
      status: "done",
      createdAt: expect.any(Date),
      createdBy: {
        email: "owner@example.com",
        name: "Owner User",
      },
    });
  });

  it("accepted participant can list scenarios for their issue", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const participant = await createConfirmedUser({
      email: "participant@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      createdBy: owner._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });
    await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    const result = await getIssueScenariosPayload({
      issueId: issue._id,
      userId: participant._id,
    });

    expect(result.scenarios).toHaveLength(1);
  });

  it("non-participant cannot list scenarios for another user's issue", async () => {
    const owner = await createConfirmedUser();
    const outsider = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    await expect(
      getIssueScenariosPayload({
        issueId: issue._id,
        userId: outsider._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to access scenarios for this issue",
    });
  });

  it("pending participant cannot list scenarios for the issue", async () => {
    const owner = await createConfirmedUser();
    const pendingUser = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: pendingUser._id,
      invitationStatus: "pending",
    });
    await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    await expect(
      getIssueScenariosPayload({
        issueId: issue._id,
        userId: pendingUser._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to access scenarios for this issue",
    });
  });

  it("owner can read scenario detail with the stable payload fields", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
      name: "Detailed scenario",
    });

    const result = await getScenarioByIdPayload({
      scenarioId: scenario._id,
      userId: owner._id,
    });

    expect(result.scenario).toMatchObject({
      id: String(scenario._id),
      issueId: String(issue._id),
      name: "Detailed scenario",
      targetModelId: expect.any(String),
      targetModelName: "Scenario Model",
      targetApiModelKey: "scenario-model",
      targetApiEndpoint: {
        method: "POST",
        path: "/solve-scenario",
      },
      targetEvaluationStructureKey: "alternativeCriteriaMatrix",
      targetSupportsConsensus: false,
      evaluationStructureKey: "alternativeCriteriaMatrix",
      criteriaWeightsStructureKey: "manualCriteriaWeights",
      domainType: "numeric",
      status: "done",
      config: expect.any(Object),
      inputs: expect.any(Object),
      outputs: expect.any(Object),
      createdBy: {
        email: "owner@example.com",
        name: "Owner User",
      },
    });
  });

  it("accepted participant can read scenario detail", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    const result = await getScenarioByIdPayload({
      scenarioId: scenario._id,
      userId: participant._id,
    });

    expect(result.scenario.id).toBe(String(scenario._id));
  });

  it("non-participant cannot read scenario detail", async () => {
    const owner = await createConfirmedUser();
    const outsider = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    await expect(
      getScenarioByIdPayload({
        scenarioId: scenario._id,
        userId: outsider._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to access this scenario",
    });
  });

  it("users who hid a finished issue cannot list its scenarios", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 1,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });
    await ExitUserIssue.create({
      issue: issue._id,
      user: participant._id,
      hidden: true,
      phase: 1,
      stage: "alternativeEvaluation",
      reason: "Removed from list",
      history: [
        {
          phase: 1,
          stage: "alternativeEvaluation",
          action: "exited",
          reason: "Removed from list",
        },
      ],
    });
    await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    await expect(
      getIssueScenariosPayload({
        issueId: issue._id,
        userId: participant._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to access scenarios for this issue",
    });
  });

  it("scenario creator can delete their own scenario if they still have access to the issue", async () => {
    const owner = await createConfirmedUser();
    const creator = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: creator._id,
      invitationStatus: "accepted",
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: creator._id,
    });

    await removeIssueScenario({
      scenarioId: scenario._id,
      userId: creator._id,
    });

    expect(await IssueScenario.findById(scenario._id)).toBeNull();
  });

  it("issue owner can delete another user's scenario for the issue", async () => {
    const owner = await createConfirmedUser();
    const creator = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: creator._id,
    });

    await removeIssueScenario({
      scenarioId: scenario._id,
      userId: owner._id,
    });

    expect(await IssueScenario.findById(scenario._id)).toBeNull();
  });

  it("non-owner non-creator accepted participant cannot delete a scenario", async () => {
    const owner = await createConfirmedUser();
    const creator = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: creator._id,
    });

    await expect(
      removeIssueScenario({
        scenarioId: scenario._id,
        userId: participant._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to delete this scenario",
    });
  });

  it("non-participant cannot delete a scenario from an issue they do not belong to", async () => {
    const owner = await createConfirmedUser();
    const outsider = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: outsider._id,
    });

    await expect(
      removeIssueScenario({
        scenarioId: scenario._id,
        userId: outsider._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to delete this scenario",
    });
  });

  it("removeIssueScenario rejects invalid and unknown scenario ids", async () => {
    await expect(
      removeIssueScenario({
        scenarioId: "not-an-id",
        userId: "000000000000000000000001",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "scenarioId",
      message: "Valid scenario id is required",
    });

    await expect(
      removeIssueScenario({
        scenarioId: "000000000000000000000001",
        userId: "000000000000000000000002",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "scenarioId",
      message: "Scenario not found",
    });
  });
});

describe("scenario API contracts", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("rejects unauthenticated requests to the scenario list endpoint", async () => {
    const issueId = "000000000000000000000001";

    const response = await request(app)
      .get(`/api/issues/${issueId}/scenarios`)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Token does not exist.",
      error: {
        code: "NO_TOKEN",
      },
    });
  });

  it("authenticated owner can GET /api/issues/:id/scenarios", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
      name: "API scenario",
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .get(`/api/issues/${issue._id}/scenarios`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Scenarios fetched successfully",
      data: [
        {
          name: "API scenario",
          targetModelName: "Scenario Model",
          createdBy: {
            email: "owner@example.com",
          },
        },
      ],
    });
  });

  it("authenticated accepted participant can GET /api/issues/scenarios/:scenarioId", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: owner._id,
    });

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const response = await request(app)
      .get(`/api/issues/scenarios/${scenario._id}`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Scenario fetched successfully",
      data: {
        id: String(scenario._id),
        issueId: String(issue._id),
      },
    });
  });

  it("authenticated owner can DELETE /api/issues/scenarios/:scenarioId", async () => {
    const owner = await createConfirmedUser();
    const creator = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });
    const scenario = await createScenarioFixture({
      issueId: issue._id,
      createdBy: creator._id,
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .delete(`/api/issues/scenarios/${scenario._id}`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Scenario deleted",
      data: {
        scenarioId: String(scenario._id),
      },
    });
    expect(await IssueScenario.findById(scenario._id)).toBeNull();
  });
});

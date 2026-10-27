import request from "supertest";
import axios from "axios";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";
import { Issue } from "../../models/Issues.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { IssueExecutionAttempt } from "../../models/IssueExecutionAttempts.js";
import { IssueEvent } from "../../models/IssueEvents.js";
import { IssueStateSnapshot } from "../../models/IssueStateSnapshots.js";
import { Notification } from "../../models/Notifications.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

let authenticatedUserId = null;
let dmsPostSpy = null;

const completeDiagnostic = (payload) => ({
  expertKey: payload.evaluations[0].expert.id,
  expertName: payload.evaluations[0].expert.name,
  criterionCount: payload.context.criteria.length,
  completedComparisons: payload.evaluations[0].payload.comparisons.length,
  requiredComparisons: payload.evaluations[0].payload.comparisons.length,
  lambdaMax: 3.123456789012345,
  consistencyIndex: 0.123456789012345,
  randomIndex: 0.58,
  consistencyRatio: 0.2128565327799052,
  consistencyStatus: "review",
  consistencyThreshold: 0.1,
  triads: [],
  candidateComparisons: [],
  recommendations: [],
  criteria: payload.context.criteria.map(({ id, name }) => ({ id, name })),
});

const mockDmsSuccess = () => {
  dmsPostSpy = vi.spyOn(axios, "post").mockImplementation(async (_url, payload) => ({
    status: 200,
    data: {
      success: true,
      message: "AHP consistency diagnostic completed",
      data: completeDiagnostic(payload),
      error: null,
    },
  }));
};

const configureAuthentication = (userId) => {
  authenticatedUserId = String(userId);
  jwt.verify.mockImplementation(() => ({ uid: authenticatedUserId, role: "user" }));
};

const createAHPModel = () =>
  createIssueModel({
    name: "AHP Criteria Weights",
    apiModelKey: "ahp_criteria_weights",
    modelKind: "criteriaWeighting",
    supportsCreatorCriteriaWeighting: true,
    supportsExpertCriteriaWeighting: true,
    visibleInIssueCreation: false,
    visibleInCriteriaWeighting: true,
    apiEndpoint: { method: "POST", path: "/ahp_criteria_weights" },
    manifestSync: { isStale: false },
    implementationStatus: "ready",
    publicUsable: true,
    evaluationStructureKey: "criteriaPairwiseAHP",
    parameters: [],
  });

const creatorRequest = (modelId) => ({
  criteriaWeightingModelId: String(modelId),
  criteriaWeightingParameters: {},
  criteria: [
    { id: "draft-quality", name: "Quality" },
    { id: "draft-cost", name: "Cost" },
    { id: "draft-safety", name: "Safety" },
  ],
  payload: {
    comparisons: [
      { criterionId: "draft-quality", comparedCriterionId: "draft-cost", value: 5 },
      { criterionId: "draft-quality", comparedCriterionId: "draft-safety", value: 3 },
      { criterionId: "draft-cost", comparedCriterionId: "draft-safety", value: 2 },
    ],
  },
});

afterEach(() => {
  dmsPostSpy?.mockRestore();
  dmsPostSpy = null;
  authenticatedUserId = null;
  jwt.verify.mockReset();
});

describe("AHP diagnostic HTTP endpoints", () => {
  it("authenticates the creator, keeps provisional IDs, and returns high CR without persisting an Issue", async () => {
    const creator = await createConfirmedUser();
    const model = await createAHPModel();
    configureAuthentication(creator._id);
    mockDmsSuccess();

    const response = await request(app)
      .post("/api/issues/criteria-weighting/diagnostics")
      .set("Authorization", "Bearer creator-token")
      .send(creatorRequest(model._id))
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        expertKey: String(creator._id),
        consistencyRatio: 0.2128565327799052,
        consistencyStatus: "review",
        criteria: [
          { id: "draft-quality", name: "Quality" },
          { id: "draft-cost", name: "Cost" },
          { id: "draft-safety", name: "Safety" },
        ],
      },
    });
    expect(dmsPostSpy).toHaveBeenCalledTimes(1);
    expect(dmsPostSpy.mock.calls[0][0]).toBe(
      "http://localhost:7000/diagnostics/ahp_criteria_weights"
    );
    expect(dmsPostSpy.mock.calls[0][1].evaluations).toHaveLength(1);
    expect(dmsPostSpy.mock.calls[0][1].evaluations[0].expert.id).toBe(
      String(creator._id)
    );
    expect(await Issue.countDocuments()).toBe(0);
    expect(await IssueEvaluation.countDocuments()).toBe(0);
    expect(await IssueExecutionAttempt.countDocuments()).toBe(0);
    expect(await IssueEvent.countDocuments()).toBe(0);
    expect(await IssueStateSnapshot.countDocuments()).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it("uses only the authenticated participant identity for an existing Issue diagnosis", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const model = await createAHPModel();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "criteriaWeighting",
      criteriaWeightsStructureKey: "criteriaPairwiseAHP",
      criteriaWeightingModel: model._id,
      criteriaWeightingApiModelKey: model.apiModelKey,
      criteriaWeightingApiEndpoint: model.apiEndpoint,
      criteriaWeightingParameters: {},
      criteriaWeightingLevel: "leaf",
    });
    const domain = await createIssueExpressionDomainSnapshotFixture({
      issueId: issue._id,
    });
    const { leafCriteria } = await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Quality", "Cost", "Safety"],
      expressionDomainId: domain._id,
    });
    await createIssueAlternativesFixture({ issueId: issue._id });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
    });
    configureAuthentication(expert._id);
    mockDmsSuccess();

    const response = await request(app)
      .post(`/api/issues/${issue._id}/evaluations/criteriaWeighting/diagnostics`)
      .set("Authorization", "Bearer expert-token")
      .send({
        expert: { id: String(owner._id), name: "Impersonated owner" },
        payload: {
          comparisons: [
            { criterionId: String(leafCriteria[0]._id), comparedCriterionId: String(leafCriteria[1]._id), value: 5 },
            { criterionId: String(leafCriteria[0]._id), comparedCriterionId: String(leafCriteria[2]._id), value: 3 },
            { criterionId: String(leafCriteria[1]._id), comparedCriterionId: String(leafCriteria[2]._id), value: 2 },
          ],
        },
      })
      .expect(200);

    expect(response.body.data.expertKey).toBe(String(expert._id));
    expect(dmsPostSpy.mock.calls[0][1].evaluations).toHaveLength(1);
    expect(dmsPostSpy.mock.calls[0][1].evaluations[0].expert.id).toBe(
      String(expert._id)
    );
    expect(dmsPostSpy.mock.calls[0][1].evaluations[0].expert.name).toBe(expert.name);
    expect(dmsPostSpy.mock.calls[0][1].context.criteria.map(({ id }) => id)).toEqual(
      leafCriteria.map(({ _id }) => String(_id))
    );
    expect(await IssueEvaluation.countDocuments()).toBe(0);
    expect(await IssueExecutionAttempt.countDocuments()).toBe(0);
    expect(await IssueEvent.countDocuments()).toBe(0);
    expect(await IssueStateSnapshot.countDocuments()).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
  });

  it("requires a valid token before either diagnostics route can be called", async () => {
    const creatorResponse = await request(app)
      .post("/api/issues/criteria-weighting/diagnostics")
      .send({})
      .expect(401);
    const expertResponse = await request(app)
      .post("/api/issues/123/evaluations/criteriaWeighting/diagnostics")
      .send({ payload: {} })
      .expect(401);

    expect(creatorResponse.body.error.code).toBe("NO_TOKEN");
    expect(expertResponse.body.error.code).toBe("NO_TOKEN");
    expect(dmsPostSpy).toBeNull();
  });
});

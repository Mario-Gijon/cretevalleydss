import mongoose from "mongoose";
import { describe, expect, it, vi } from "vitest";

import { Criterion } from "../../models/Criteria.js";
import { Issue } from "../../models/Issues.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { IssueExecutionAttempt } from "../../models/IssueExecutionAttempts.js";
import { IssueEvent } from "../../models/IssueEvents.js";
import { IssueStateSnapshot } from "../../models/IssueStateSnapshots.js";
import { Notification } from "../../models/Notifications.js";
import { Participation } from "../../models/Participations.js";
import { diagnoseCreatorCriteriaWeighting } from "../../modules/issues/creation/initialCriteriaWeights/diagnoseCreatorCriteriaWeighting.js";
import { diagnoseIssueCriteriaWeighting } from "../../modules/issues/evaluations/diagnoseIssueCriteriaWeighting.js";
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

const comparisonSet = (ids = ["quality", "cost", "safety"]) => [
  { criterionId: ids[0], comparedCriterionId: ids[1], value: 5 },
  { criterionId: ids[0], comparedCriterionId: ids[2], value: 3 },
  { criterionId: ids[1], comparedCriterionId: ids[2], value: 2 },
];

const createAHPModel = (overrides = {}) =>
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
    ...overrides,
  });

const diagnosticFor = (requestPayload) => ({
  expertKey: requestPayload.evaluations[0].expert.id,
  expertName: requestPayload.evaluations[0].expert.name,
  criterionCount: requestPayload.context.criteria.length,
  completedComparisons: requestPayload.evaluations[0].payload.comparisons.length,
  requiredComparisons: requestPayload.evaluations[0].payload.comparisons.length,
  lambdaMax: 3.1,
  consistencyIndex: 0.05,
  randomIndex: 0.58,
  consistencyRatio: 0.08620689655172414,
  consistencyStatus: "consistent",
  consistencyThreshold: 0.1,
  triads: [],
  candidateComparisons: [],
  recommendations: [],
  criteria: requestPayload.context.criteria.map(({ id, name }) => ({ id, name })),
});

const createDiagnosticHttpClient = () => ({
  post: vi.fn(async (url, requestPayload, options) => ({
    status: 200,
    data: {
      success: true,
      message: "AHP diagnostic completed",
      data: diagnosticFor(requestPayload),
      error: null,
    },
    url,
    options,
  })),
});

const validCreatorInput = (modelId) => ({
  criteriaWeightingModelId: String(modelId),
  criteriaWeightingParameters: {},
  criteria: [
    { id: "draft-quality", name: "Quality" },
    { id: "draft-cost", name: "Cost" },
    { id: "draft-safety", name: "Safety" },
  ],
  payload: {
    comparisons: comparisonSet([
      "draft-quality",
      "draft-cost",
      "draft-safety",
    ]),
  },
});

describe("AHP creator diagnostics before Issue creation", () => {
  it("validates the selected model, criteria and complete Saaty matrix, then sends one authenticated evaluation", async () => {
    const creator = await createConfirmedUser({ name: "Verified Creator" });
    const model = await createAHPModel();
    const client = createDiagnosticHttpClient();
    const userId = String(creator._id);
    const input = validCreatorInput(model._id);

    const result = await diagnoseCreatorCriteriaWeighting({
      userId,
      input,
      decisionModelsServiceBaseUrl: "http://dms.test",
      timeoutMs: 1600,
      httpClient: client,
    });

    expect(result).toMatchObject({
      expertKey: userId,
      consistencyRatio: 0.08620689655172414,
      criteria: input.criteria,
    });
    expect(client.post).toHaveBeenCalledTimes(1);
    const [url, request, options] = client.post.mock.calls[0];
    expect(url).toBe("http://dms.test/diagnostics/ahp_criteria_weights");
    expect(options.timeout).toBe(1600);
    expect(request.modelParameters).toEqual({});
    expect(request.evaluations).toHaveLength(1);
    expect(request.evaluations[0]).toEqual({
      expert: { id: userId, name: "Verified Creator" },
      payload: { comparisons: input.payload.comparisons },
    });
    expect(request.context).toMatchObject({
      criteria: input.criteria,
      structure: { key: "criteriaPairwiseAHP", stage: "criteriaWeighting" },
      consensusPhase: 0,
    });
    expect(await Issue.countDocuments()).toBe(0);
    expect(await IssueExecutionAttempt.countDocuments()).toBe(0);
  });

  it("rejects duplicate provisional IDs, unknown comparison IDs, incomplete matrices and non-Saaty values before DMS", async () => {
    const model = await createAHPModel();
    const client = createDiagnosticHttpClient();
    const userId = new mongoose.Types.ObjectId().toString();

    const duplicate = validCreatorInput(model._id);
    duplicate.criteria[1].id = duplicate.criteria[0].id;
    await expect(
      diagnoseCreatorCriteriaWeighting({ userId, input: duplicate, httpClient: client })
    ).rejects.toMatchObject({ statusCode: 400 });

    const unknown = validCreatorInput(model._id);
    unknown.payload.comparisons[0].criterionId = "unknown-id";
    await expect(
      diagnoseCreatorCriteriaWeighting({ userId, input: unknown, httpClient: client })
    ).rejects.toMatchObject({ statusCode: 400 });

    const incomplete = validCreatorInput(model._id);
    incomplete.payload.comparisons.pop();
    await expect(
      diagnoseCreatorCriteriaWeighting({ userId, input: incomplete, httpClient: client })
    ).rejects.toMatchObject({ statusCode: 400 });

    const invalidValue = validCreatorInput(model._id);
    invalidValue.payload.comparisons[0].value = 1.7;
    await expect(
      diagnoseCreatorCriteriaWeighting({ userId, input: invalidValue, httpClient: client })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(client.post).not.toHaveBeenCalled();
    expect(await Issue.countDocuments()).toBe(0);
  });

  it("enforces model visibility, readiness, creator capability, AHP structure and the 15-criterion limit", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const client = createDiagnosticHttpClient();
    const visibleModel = await createAHPModel({ visibleInCriteriaWeighting: false });
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: validCreatorInput(visibleModel._id),
        httpClient: client,
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    const staleModel = await createAHPModel({ manifestSync: { isStale: true } });
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: validCreatorInput(staleModel._id),
        httpClient: client,
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    const notReadyModel = await createAHPModel({ apiModelKey: "not_ready_ahp", implementationStatus: "scaffold" });
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: validCreatorInput(notReadyModel._id),
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    const wrongStructure = await createAHPModel({ evaluationStructureKey: "manualCriteriaWeights" });
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: validCreatorInput(wrongStructure._id),
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    const creatorNotSupported = await createAHPModel({ supportsCreatorCriteriaWeighting: false });
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: validCreatorInput(creatorNotSupported._id),
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    const notPubliclyUsable = await createAHPModel({ publicUsable: false });
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: validCreatorInput(notPubliclyUsable._id),
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    const missingModel = validCreatorInput(new mongoose.Types.ObjectId());
    await expect(
      diagnoseCreatorCriteriaWeighting({ userId, input: missingModel, httpClient: client })
    ).rejects.toMatchObject({ statusCode: 400 });

    const unapprovedParameter = validCreatorInput((await createAHPModel())._id);
    unapprovedParameter.criteriaWeightingParameters = { arbitrary: true };
    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId,
        input: unapprovedParameter,
        httpClient: client,
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    const tooManyCriteria = validCreatorInput((await createAHPModel())._id);
    tooManyCriteria.criteria = Array.from({ length: 16 }, (_, index) => ({
      id: `criterion-${index}`,
      name: `Criterion ${index}`,
    }));
    await expect(
      diagnoseCreatorCriteriaWeighting({ userId, input: tooManyCriteria, httpClient: client })
    ).rejects.toMatchObject({ statusCode: 400, field: "criteria" });

    expect(client.post).not.toHaveBeenCalled();
    expect(await Issue.countDocuments()).toBe(0);
  });

  it("does not accept browser-provided identity, API route, or arbitrary model URL fields", async () => {
    const model = await createAHPModel();
    const input = {
      ...validCreatorInput(model._id),
      expert: { id: "someone-else", name: "Someone else" },
      apiEndpoint: "http://attacker.invalid",
    };
    const client = createDiagnosticHttpClient();

    await expect(
      diagnoseCreatorCriteriaWeighting({
        userId: new mongoose.Types.ObjectId().toString(),
        input,
        httpClient: client,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(client.post).not.toHaveBeenCalled();
  });
});

describe("AHP expert diagnostics in an active Issue", () => {
  const makeIssueContext = async ({
    invitationStatus = "accepted",
    active = true,
    currentStage = "criteriaWeighting",
    level = "leaf",
    modelOverrides = {},
    structureKey = "criteriaPairwiseAHP",
  } = {}) => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const model = await createAHPModel(modelOverrides);
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active,
      currentStage,
      criteriaWeightsStructureKey: structureKey,
      criteriaWeightingModel: model._id,
      criteriaWeightingApiModelKey: model.apiModelKey,
      criteriaWeightingApiEndpoint: model.apiEndpoint,
      criteriaWeightingParameters: {},
      criteriaWeightingLevel: level,
    });
    const expressionDomain = await createIssueExpressionDomainSnapshotFixture({
      issueId: issue._id,
    });
    let criteria;

    if (level === "parent") {
      const root = await Criterion.create({
        issue: issue._id,
        parentCriterion: null,
        name: "Criteria",
        type: "group",
        isLeaf: false,
        position: 0,
      });
      const parentQuality = await Criterion.create({
        issue: issue._id,
        parentCriterion: root._id,
        name: "Quality",
        type: "group",
        isLeaf: false,
        position: 0,
      });
      const parentCost = await Criterion.create({
        issue: issue._id,
        parentCriterion: root._id,
        name: "Cost",
        type: "group",
        isLeaf: false,
        position: 1,
      });
      await Criterion.create([
        { issue: issue._id, parentCriterion: parentQuality._id, name: "Durability", type: "benefit", isLeaf: true, position: 0, expressionDomain: expressionDomain._id },
        { issue: issue._id, parentCriterion: parentCost._id, name: "Price", type: "cost", isLeaf: true, position: 0, expressionDomain: expressionDomain._id },
      ]);
      criteria = [parentQuality, parentCost];
    } else {
      const created = await createIssueCriteriaFixture({
        issueId: issue._id,
        leafNames: ["Quality", "Cost", "Safety"],
        expressionDomainId: expressionDomain._id,
      });
      criteria = created.leafCriteria;
    }

    await createIssueAlternativesFixture({ issueId: issue._id });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus,
    });
    return { owner, expert, issue, model, criteria };
  };

  it("diagnoses only the authenticated participant's complete evaluation and honors configured leaf criteria", async () => {
    const { expert, issue, criteria } = await makeIssueContext();
    const client = createDiagnosticHttpClient();
    const result = await diagnoseIssueCriteriaWeighting({
      issueId: issue._id,
      userId: expert._id,
      payload: {
        comparisons: comparisonSet(criteria.map((criterion) => String(criterion._id))),
      },
      decisionModelsServiceBaseUrl: "http://dms.test",
      httpClient: client,
    });

    expect(result.expertKey).toBe(String(expert._id));
    expect(result.criteria).toEqual(
      criteria.map((criterion) => ({ id: String(criterion._id), name: criterion.name }))
    );
    const [url, request] = client.post.mock.calls[0];
    expect(url).toBe("http://dms.test/diagnostics/ahp_criteria_weights");
    expect(request.evaluations).toHaveLength(1);
    expect(request.evaluations[0].expert).toEqual({
      id: String(expert._id),
      name: expert.name,
      email: undefined,
    });
    expect(request.context.criteria).toEqual(
      criteria.map((criterion) => ({
        id: String(criterion._id),
        name: criterion.name,
        type: undefined,
      }))
    );
    expect(await IssueEvaluation.countDocuments()).toBe(0);
    expect(await IssueExecutionAttempt.countDocuments()).toBe(0);
    expect(await IssueEvent.countDocuments()).toBe(0);
    expect(await IssueStateSnapshot.countDocuments()).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
    expect((await Participation.findOne({ issue: issue._id, expert: expert._id })).weightsCompleted).toBe(false);
  });

  it("uses parent criteria IDs when parent weighting is configured", async () => {
    const { expert, issue, criteria } = await makeIssueContext({ level: "parent" });
    const client = createDiagnosticHttpClient();
    const result = await diagnoseIssueCriteriaWeighting({
      issueId: issue._id,
      userId: expert._id,
      payload: {
        comparisons: [{
          criterionId: String(criteria[0]._id),
          comparedCriterionId: String(criteria[1]._id),
          value: 5,
        }],
      },
      httpClient: client,
    });

    expect(result.criteria).toEqual(
      criteria.map((criterion) => ({ id: String(criterion._id), name: criterion.name }))
    );
    expect(client.post.mock.calls[0][1].context.criteria.map(({ id }) => id)).toEqual(
      criteria.map((criterion) => String(criterion._id))
    );
  });

  it("rejects missing, pending, and rejected participation before contacting DMS", async () => {
    const scenarios = ["pending", "declined", "absent"];
    for (const invitationStatus of scenarios) {
      const fixture = await makeIssueContext({
        invitationStatus: invitationStatus === "absent" ? "pending" : invitationStatus,
      });
      if (invitationStatus === "absent") {
        await Participation.deleteOne({ issue: fixture.issue._id, expert: fixture.expert._id });
      }
      const client = createDiagnosticHttpClient();

      await expect(
        diagnoseIssueCriteriaWeighting({
          issueId: fixture.issue._id,
          userId: fixture.expert._id,
          payload: { comparisons: comparisonSet(fixture.criteria.map(({ _id }) => String(_id))) },
          httpClient: client,
        })
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(client.post).not.toHaveBeenCalled();
    }
  });

  it("rejects nonexistent, inactive, wrong-stage, wrong-structure, and incompatible model configurations", async () => {
    const expert = await createConfirmedUser();
    const client = createDiagnosticHttpClient();
    await expect(
      diagnoseIssueCriteriaWeighting({
        issueId: new mongoose.Types.ObjectId(),
        userId: expert._id,
        payload: { comparisons: [] },
        httpClient: client,
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    const inactive = await makeIssueContext({ active: false });
    await expect(
      diagnoseIssueCriteriaWeighting({
        issueId: inactive.issue._id,
        userId: inactive.expert._id,
        payload: { comparisons: comparisonSet(inactive.criteria.map(({ _id }) => String(_id))) },
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "ISSUE_NOT_ACTIVE" });

    const wrongStage = await makeIssueContext({ currentStage: "alternativeEvaluation" });
    await expect(
      diagnoseIssueCriteriaWeighting({
        issueId: wrongStage.issue._id,
        userId: wrongStage.expert._id,
        payload: { comparisons: comparisonSet(wrongStage.criteria.map(({ _id }) => String(_id))) },
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "ISSUE_STAGE_NOT_ACCEPTING_EVALUATIONS" });

    const wrongStructure = await makeIssueContext({ structureKey: "manualCriteriaWeights" });
    await expect(
      diagnoseIssueCriteriaWeighting({
        issueId: wrongStructure.issue._id,
        userId: wrongStructure.expert._id,
        payload: { comparisons: [] },
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    const wrongModel = await makeIssueContext({
      modelOverrides: { apiModelKey: "other_model" },
    });
    await expect(
      diagnoseIssueCriteriaWeighting({
        issueId: wrongModel.issue._id,
        userId: wrongModel.expert._id,
        payload: { comparisons: comparisonSet(wrongModel.criteria.map(({ _id }) => String(_id))) },
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    const incompatible = await makeIssueContext({
      modelOverrides: { supportsExpertCriteriaWeighting: false },
    });
    await expect(
      diagnoseIssueCriteriaWeighting({
        issueId: incompatible.issue._id,
        userId: incompatible.expert._id,
        payload: { comparisons: comparisonSet(incompatible.criteria.map(({ _id }) => String(_id))) },
        httpClient: client,
      })
    ).rejects.toMatchObject({ code: "AHP_DIAGNOSTIC_NOT_SUPPORTED" });

    expect(client.post).not.toHaveBeenCalled();
  });
});

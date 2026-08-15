import { describe, expect, it, vi } from "vitest";

import {
  remapCriteriaWeightIdsToMongoCriteriaOrThrow,
  resolveCriteriaWeightingConfigOrThrow,
} from "../../../modules/issues/creation/initialCriteriaWeights/resolveInitialCriteriaWeights.js";
import { Issue } from "../../../models/Issues.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
  prepareAndPersistIssueCreation,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const leafCriteria = [
  { id: "criterion-cost", name: "Cost" },
  { id: "criterion-speed", name: "Speed" },
];

const criteriaWeightingModelDefaults = {
  modelKind: "criteriaWeighting",
  visibleInIssueCreation: false,
  visibleInCriteriaWeighting: true,
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: true,
  apiEndpoint: { method: "POST", path: "/criteria-weights" },
  parameters: [],
};

describe("criteria weighting structure resolution", () => {
  it("preserves creator-manual historical semantics without requiring an expert stage", async () => {
    const resolved = await resolveCriteriaWeightingConfigOrThrow({
      criteriaWeightingConfig: { mode: "creatorManual", payload: { weightsByCriterion: { "criterion-cost": 0.7, "criterion-speed": 0.3 } } },
      criteriaWeightingParameters: {}, criterionNames: leafCriteria.map((criterion) => criterion.name), leafCriteria, isSingleLeafCriterion: false,
      model: { usesCriteriaWeights: true, usesFuzzyCriteriaWeights: false },
    });
    expect(resolved).toMatchObject({ isCriteriaWeightingRequired: false, source: "creator", mode: "creatorManual", method: "manual", currentStage: "alternativeEvaluation", criteriaWeightsStructureKey: "manualCriteriaWeights" });
  });
  it("remaps the canonical deferred BWM payload without legacy fields", () => {
    const remapped = remapCriteriaWeightIdsToMongoCriteriaOrThrow({
      resolvedCriteriaWeighting: {
        criteriaWeightsStructureKey: "bestWorstCriteria",
        isDeferredApiCriteriaWeighting: true,
        modelWeights: null,
        deferredPayload: {
          bestCriterionId: "source-quality",
          worstCriterionId: "source-cost",
          bestToOthers: {
            "source-quality": 1,
            "source-cost": 5,
          },
          othersToWorst: {
            "source-quality": 5,
            "source-cost": 1,
          },
        },
      },
      sourceLeafCriteria: [
        { id: "source-quality" },
        { id: "source-cost" },
      ],
      persistedLeafCriteria: [
        { id: "persisted-quality" },
        { id: "persisted-cost" },
      ],
    });

    expect(remapped.deferredPayload).toEqual({
      bestCriterionId: "persisted-quality",
      worstCriterionId: "persisted-cost",
      bestToOthers: {
        "persisted-quality": 1,
        "persisted-cost": 5,
      },
      othersToWorst: {
        "persisted-quality": 5,
        "persisted-cost": 1,
      },
    });
  });

  it("keeps expert manual weighting on manualCriteriaWeights when its model has stale structure metadata", async () => {
    await createIssueModel({
      ...criteriaWeightingModelDefaults,
      apiModelKey: "manual_criteria_weights",
      evaluationStructureKey: "criteriaPairwise",
    });

    const resolved = await resolveCriteriaWeightingConfigOrThrow({
      criteriaWeightingConfig: {
        mode: "expertManual",
        source: "experts",
        method: "manual",
        structureKey: "manualCriteriaWeights",
        criteriaWeightingModelKey: "manual_criteria_weights",
        payload: {},
      },
      criteriaWeightingParameters: {},
      criterionNames: leafCriteria.map((criterion) => criterion.name),
      leafCriteria,
      isSingleLeafCriterion: false,
      model: {
        usesCriteriaWeights: true,
        usesFuzzyCriteriaWeights: false,
      },
    });

    expect(resolved.criteriaWeightsStructureKey).toBe("manualCriteriaWeights");
    expect(resolved.criteriaWeightingApiModelKey).toBe("manual_criteria_weights");
    expect(resolved.currentStage).toBe("criteriaWeighting");
    expect(resolved).toMatchObject({ isCriteriaWeightingRequired: true, source: "experts", mode: "expertManual", method: "manual" });
  });

  it("stores the canonical manual structure on a newly created issue", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const expert = await createConfirmedUser({ email: "expert@example.com" });
    const issueModel = await createIssueModel({
      usesCriteriaWeights: true,
    });
    const domain = await createExpressionDomainFixture({ userId: owner._id });
    await createIssueModel({
      ...criteriaWeightingModelDefaults,
      apiModelKey: "manual_criteria_weights",
      evaluationStructureKey: "criteriaPairwise",
    });

    const issueInfo = buildCreateIssueInfo({
      selectedModelId: issueModel._id,
      globalDomainId: domain._id,
      addedExperts: [expert.email],
      criteria: [
        {
          id: "criterion-impact",
          name: "Impact",
          type: "group",
          children: [
            {
              id: "criterion-cost",
              name: "Cost",
              type: "cost",
              children: [],
            },
            {
              id: "criterion-speed",
              name: "Speed",
              type: "benefit",
              children: [],
            },
          ],
        },
      ],
      criteriaWeightingConfig: {
        mode: "expertManual",
        source: "experts",
        method: "manual",
        structureKey: "manualCriteriaWeights",
        criteriaWeightingModelKey: "manual_criteria_weights",
        payload: {},
      },
    });

    await prepareAndPersistIssueCreation({
      issueInfo,
      ownerUserId: owner._id,
    });

    const issue = await Issue.findOne({ name: "Example issue" }).lean();
    expect(issue).toMatchObject({
      criteriaWeightsStructureKey: "manualCriteriaWeights",
      criteriaWeightingApiModelKey: "manual_criteria_weights",
      currentStage: "criteriaWeighting",
    });
    const snapshot = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean();
    expect(snapshot.state.criteriaWeighting).toMatchObject({ required: true, source: "experts", mode: "expertManual", method: "manual", structureKey: "manualCriteriaWeights", apiModelKey: "manual_criteria_weights" });
  });

  it("persists creator-manual weighting semantics and remapped effective weights in the creation snapshot", async () => {
    const owner = await createConfirmedUser({ email: "creator-manual-owner@example.com" });
    const expert = await createConfirmedUser({ email: "creator-manual-expert@example.com" });
    const issueModel = await createIssueModel({ usesCriteriaWeights: true });
    const domain = await createExpressionDomainFixture({ userId: owner._id });
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: issueModel._id, globalDomainId: domain._id, addedExperts: [expert.email],
      criteria: [{ id: "source-root", name: "Impact", type: "group", children: [{ id: "source-cost", name: "Cost", type: "cost", children: [] }, { id: "source-speed", name: "Speed", type: "benefit", children: [] }] }],
      criteriaWeightingConfig: { mode: "creatorManual", payload: { weightsByCriterion: { "source-cost": 0.7, "source-speed": 0.3 } } },
    });
    await prepareAndPersistIssueCreation({ issueInfo, ownerUserId: owner._id });
    const issue = await Issue.findOne({ name: "Example issue" }).lean();
    const leaves = await Criterion.find({ issue: issue._id, isLeaf: true }).sort({ position: 1 }).lean();
    const snapshot = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean();
    expect(issue.currentStage).toBe("alternativeEvaluation");
    expect(snapshot.state.criteriaWeighting).toMatchObject({ required: false, source: "creator", mode: "creatorManual", method: "manual", structureKey: "manualCriteriaWeights", model: null, apiModelKey: null });
    const weights = snapshot.state.criteriaWeighting.weightsByCriterionId;
    const costCriterion = leaves.find((criterion) => criterion.name === "Cost");
    const speedCriterion = leaves.find((criterion) => criterion.name === "Speed");
    expect(costCriterion).toBeDefined();
    expect(speedCriterion).toBeDefined();
    expect(Object.keys(weights).sort()).toEqual(leaves.map((leaf) => String(leaf._id)).sort());
    expect(Object.keys(weights)).not.toContain("source-cost");
    expect(Object.keys(weights)).not.toContain("source-speed");
    expect(Object.values(weights).sort()).toEqual([0.3, 0.7]);
    expect(weights[String(costCriterion._id)]).toBe(0.7);
    expect(weights[String(speedCriterion._id)]).toBe(0.3);
    expect(weights).toEqual(issue.modelParameters.weights);
    const original = structuredClone(snapshot.state.criteriaWeighting);
    await Issue.updateOne({ _id: issue._id }, { $set: { "modelParameters.weights": {} } });
    expect((await IssueStateSnapshot.findById(snapshot._id).lean()).state.criteriaWeighting).toEqual(original);
  });

  it("persists creator API weighting semantics, its frozen model contract, and remapped effective weights", async () => {
    const owner = await createConfirmedUser({ email: "creator-api-owner@example.com" });
    const expert = await createConfirmedUser({ email: "creator-api-expert@example.com" });
    const issueModel = await createIssueModel({
      usesCriteriaWeights: true,
      usesFuzzyCriteriaWeights: false,
    });
    const criteriaWeightingModel = await createIssueModel({
      ...criteriaWeightingModelDefaults,
      name: "Creator API criteria weights",
      apiModelKey: "creator_api_criteria_weights",
      apiEndpoint: { method: "POST", path: "/creator-api-criteria-weights" },
      evaluationStructureKey: "bestWorstCriteria",
      supportsCreatorCriteriaWeighting: true,
      supportsExpertCriteriaWeighting: false,
    });
    const domain = await createExpressionDomainFixture({ userId: owner._id });
    const httpClient = { post: vi.fn() };
    httpClient.post.mockImplementation(async (_url, payload) => ({
      status: 200,
      data: {
        success: true,
        data: {
          weightsByCriterion: Object.fromEntries(
            payload.context.criteria.map((criterion) => [
              criterion.id,
              criterion.name === "Cost" ? 2 : 3,
            ])
          ),
        },
      },
    }));
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: issueModel._id,
      globalDomainId: domain._id,
      addedExperts: [expert.email],
      criteria: [{ id: "source-root", name: "Impact", type: "group", children: [{ id: "source-cost", name: "Cost", type: "cost", children: [] }, { id: "source-speed", name: "Speed", type: "benefit", children: [] }] }],
      criteriaWeightingConfig: {
        mode: "creatorApiModel",
        criteriaWeightingModelId: String(criteriaWeightingModel._id),
        payload: {
          bestCriterionId: "source-speed",
          worstCriterionId: "source-cost",
          bestToOthers: { "source-cost": 3, "source-speed": 1 },
          othersToWorst: { "source-cost": 1, "source-speed": 3 },
        },
      },
    });

    await prepareAndPersistIssueCreation({
      issueInfo,
      ownerUserId: owner._id,
      decisionModelsServiceBaseUrl: "https://dms.example.test/",
      httpClient,
    });

    const issue = await Issue.findOne({ name: "Example issue" }).lean();
    const snapshot = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean();
    expect(snapshot).not.toBeNull();
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "creation" })).toBe(1);
    const leaves = await Criterion.find({ issue: issue._id, isLeaf: true }).lean();
    const costCriterion = leaves.find((criterion) => criterion.name === "Cost");
    const speedCriterion = leaves.find((criterion) => criterion.name === "Speed");

    expect(issue.currentStage).toBe("alternativeEvaluation");
    expect(snapshot.state.criteriaWeighting).toMatchObject({
      required: false,
      source: "creator",
      mode: "creatorApiModel",
      method: "apiModel",
      structureKey: "bestWorstCriteria",
      apiModelKey: "creator_api_criteria_weights",
      apiEndpoint: { method: "POST", path: "/creator-api-criteria-weights" },
      parameters: {},
      model: {
        id: String(criteriaWeightingModel._id),
        name: "Creator API criteria weights",
        apiModelKey: "creator_api_criteria_weights",
        evaluationStructureKey: "bestWorstCriteria",
        apiEndpoint: { method: "POST", path: "/creator-api-criteria-weights" },
        parameters: [],
      },
    });
    expect(costCriterion).toBeDefined();
    expect(speedCriterion).toBeDefined();
    const weights = snapshot.state.criteriaWeighting.weightsByCriterionId;
    expect(Object.keys(weights).sort()).toEqual(leaves.map((leaf) => String(leaf._id)).sort());
    expect(Object.keys(weights)).not.toContain("source-cost");
    expect(Object.keys(weights)).not.toContain("source-speed");
    expect(weights[String(costCriterion._id)]).toBe(0.4);
    expect(weights[String(speedCriterion._id)]).toBe(0.6);
    expect(weights).toEqual(issue.modelParameters.weights);
    expect(httpClient.post).toHaveBeenCalledTimes(1);
    expect(httpClient.post).toHaveBeenCalledWith(
      "https://dms.example.test/creator-api-criteria-weights",
      expect.objectContaining({
        context: expect.objectContaining({
          criteria: expect.arrayContaining([
            expect.objectContaining({ id: String(costCriterion._id), name: "Cost" }),
            expect.objectContaining({ id: String(speedCriterion._id), name: "Speed" }),
          ]),
        }),
      })
    );

    const original = structuredClone(snapshot.state.criteriaWeighting);
    await Issue.updateOne({ _id: issue._id }, { $set: { "modelParameters.weights": {} } });
    await criteriaWeightingModel.updateOne({ $set: { name: "Changed creator API model" } });
    expect((await IssueStateSnapshot.findById(snapshot._id).lean()).state.criteriaWeighting).toEqual(original);
  });

  it("persists creator fuzzy weighting semantics, remapped tuples, and the interpreting fuzzy domain", async () => {
    const owner = await createConfirmedUser({ email: "creator-fuzzy-owner@example.com" });
    const expert = await createConfirmedUser({ email: "creator-fuzzy-expert@example.com" });
    const issueModel = await createIssueModel({
      usesCriteriaWeights: true,
      usesFuzzyCriteriaWeights: true,
      isMultiCriteria: true,
      supportedExpressionDomains: [{ typeKey: "linguisticFuzzy", constraints: {} }],
    });
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
      type: "linguistic",
    });
    const httpClient = { post: vi.fn() };
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: issueModel._id,
      globalDomainId: domain._id,
      addedExperts: [expert.email],
      criteria: [{ id: "source-root", name: "Impact", type: "group", children: [{ id: "source-cost", name: "Cost", type: "cost", children: [] }, { id: "source-speed", name: "Speed", type: "benefit", children: [] }] }],
      criteriaWeightingConfig: {
        mode: "creatorFuzzy",
        payload: {
          weightsByCriterion: {
            "source-cost": [0.1, 0.2, 0.3],
            "source-speed": [0.5, 0.6, 0.8],
          },
        },
      },
    });

    await prepareAndPersistIssueCreation({ issueInfo, ownerUserId: owner._id, httpClient });

    const issue = await Issue.findOne({ name: "Example issue" }).lean();
    const snapshot = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean();
    expect(snapshot).not.toBeNull();
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "creation" })).toBe(1);
    const leaves = await Criterion.find({ issue: issue._id, isLeaf: true }).lean();
    const costCriterion = leaves.find((criterion) => criterion.name === "Cost");
    const speedCriterion = leaves.find((criterion) => criterion.name === "Speed");

    expect(issue.currentStage).toBe("alternativeEvaluation");
    expect(snapshot.state.criteriaWeighting).toMatchObject({
      required: false,
      source: "creator",
      mode: "creatorFuzzy",
      method: "fuzzy",
      structureKey: null,
      model: null,
      apiModelKey: null,
      apiEndpoint: null,
      parameters: {},
    });
    expect(costCriterion).toBeDefined();
    expect(speedCriterion).toBeDefined();
    const weights = snapshot.state.criteriaWeighting.weightsByCriterionId;
    expect(Object.keys(weights).sort()).toEqual(leaves.map((leaf) => String(leaf._id)).sort());
    expect(Object.keys(weights)).not.toContain("source-cost");
    expect(Object.keys(weights)).not.toContain("source-speed");
    expect(weights[String(costCriterion._id)]).toEqual([0.1, 0.2, 0.3]);
    expect(weights[String(speedCriterion._id)]).toEqual([0.5, 0.6, 0.8]);
    expect(Array.isArray(weights[String(costCriterion._id)])).toBe(true);
    expect(Array.isArray(weights[String(speedCriterion._id)])).toBe(true);
    expect(weights).toEqual(issue.modelParameters.weights);
    const snapshotDomain = snapshot.state.expressionDomains.find((entry) => entry.typeKey === "linguisticFuzzy");
    expect(snapshotDomain).toMatchObject({ typeKey: "linguisticFuzzy" });
    expect(snapshotDomain.definition.labels.every((label) => label.values.length === 3)).toBe(true);
    expect(httpClient.post).not.toHaveBeenCalled();

    const original = structuredClone(snapshot.state.criteriaWeighting);
    await Issue.updateOne({ _id: issue._id }, { $set: { "modelParameters.weights": {} } });
    expect((await IssueStateSnapshot.findById(snapshot._id).lean()).state.criteriaWeighting).toEqual(original);
  });

  it("continues using a generic expert API model's runtime-defined structure", async () => {
    await createIssueModel({
      ...criteriaWeightingModelDefaults,
      apiModelKey: "best_worst_criteria",
      evaluationStructureKey: "bestWorstCriteria",
    });

    const resolved = await resolveCriteriaWeightingConfigOrThrow({
      criteriaWeightingConfig: {
        mode: "expertApiModel",
        source: "experts",
        method: "apiModel",
        criteriaWeightingModelKey: "best_worst_criteria",
        payload: {},
      },
      criteriaWeightingParameters: {},
      criterionNames: leafCriteria.map((criterion) => criterion.name),
      leafCriteria,
      isSingleLeafCriterion: false,
      model: {
        usesCriteriaWeights: true,
        usesFuzzyCriteriaWeights: false,
      },
    });

    expect(resolved.criteriaWeightsStructureKey).toBe("bestWorstCriteria");
    expect(resolved).toMatchObject({ isCriteriaWeightingRequired: true, source: "experts", mode: "expertApiModel", method: "apiModel" });
  });
});

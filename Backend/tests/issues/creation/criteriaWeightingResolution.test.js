import { describe, expect, it } from "vitest";

import {
  remapCriteriaWeightIdsToMongoCriteriaOrThrow,
  resolveCriteriaWeightingConfigOrThrow,
} from "../../../modules/issues/creation/initialCriteriaWeights/resolveInitialCriteriaWeights.js";
import { Issue } from "../../../models/Issues.js";
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

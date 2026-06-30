import { describe, expect, it } from "vitest";

import {
  buildCreateIssueEqualManualWeights,
  buildDefaultCriteriaWeightingConfig,
  isCreateIssueCriteriaWeightingConfigOnDefault,
  resolveAssignedFuzzyValueCount,
  validateCreateIssueManualCriteriaWeighting,
} from "../../../src/features/createIssue/logic/createIssueCriteriaWeighting.js";
import {
  createIssueByCriterionExpressionDomainConfigFixture,
  createIssueFuzzyCriteriaWeightingConfigFixture,
  createIssueLeafCriteriaFixture,
  createIssueManualCriteriaWeightingConfigFixture,
  createIssueSingleLeafCriteriaFixture,
  criteriaWeightModelFixture,
  expressionLinguisticDomainFixture,
  expressionLinguisticDomainSevenFixture,
  fuzzyCriteriaWeightModelFixture,
  globalContinuousDomainFixture,
} from "../../mocks/fixtures/createIssue.fixtures.js";

describe("createIssueCriteriaWeighting", () => {
  const sixLeafCriteria = Array.from({ length: 6 }, (_, index) => ({
    id: `criterion-${index + 1}`,
    name: `Criterion ${index + 1}`,
    children: [],
  }));

  it("builds the default config for the selected model type", () => {
    expect(buildDefaultCriteriaWeightingConfig(null)).toBeNull();
    expect(buildDefaultCriteriaWeightingConfig(criteriaWeightModelFixture)).toEqual({
      mode: "expertManual",
      source: "experts",
      method: "manual",
      structureKey: "manualCriteriaWeights",
      payload: {},
    });
    expect(buildDefaultCriteriaWeightingConfig(fuzzyCriteriaWeightModelFixture)).toEqual({
      mode: "creatorFuzzy",
      source: "creator",
      method: "fuzzy",
      structureKey: null,
      payload: {},
    });
  });

  it("detects when a manual single-leaf config is still on default", () => {
    expect(
      isCreateIssueCriteriaWeightingConfigOnDefault({
        selectedModel: criteriaWeightModelFixture,
        criteriaWeightingConfig: {
          mode: "creatorManual",
          source: "creator",
          method: "manual",
          structureKey: "manualCriteriaWeights",
          payload: {
            weightsByCriterion: {
              "criterion-cost": 1,
            },
          },
        },
        leafCriteria: createIssueSingleLeafCriteriaFixture,
        fuzzyValueCount: null,
      })
    ).toBe(true);
  });

  it("detects when a fuzzy config matches the default weights for all leaves", () => {
    expect(
      isCreateIssueCriteriaWeightingConfigOnDefault({
        selectedModel: fuzzyCriteriaWeightModelFixture,
        criteriaWeightingConfig: createIssueFuzzyCriteriaWeightingConfigFixture,
        leafCriteria: createIssueLeafCriteriaFixture,
        fuzzyValueCount: 5,
      })
    ).toBe(true);

    expect(
      isCreateIssueCriteriaWeightingConfigOnDefault({
        selectedModel: fuzzyCriteriaWeightModelFixture,
        criteriaWeightingConfig: {
          ...createIssueFuzzyCriteriaWeightingConfigFixture,
          payload: {
            weightsByCriterion: {
              "criterion-cost": [0.1, 0.2, 0.3, 0.4, 0.5],
              "criterion-speed": [0.1, 0.2, 0.3, 0.4, 0.5],
            },
          },
        },
        leafCriteria: createIssueLeafCriteriaFixture,
        fuzzyValueCount: 5,
      })
    ).toBe(false);
  });

  it("returns false safely for malformed configs", () => {
    expect(
      isCreateIssueCriteriaWeightingConfigOnDefault({
        selectedModel: criteriaWeightModelFixture,
        criteriaWeightingConfig: [],
        leafCriteria: createIssueLeafCriteriaFixture,
        fuzzyValueCount: null,
      })
    ).toBe(false);
  });

  it("resolves the assigned fuzzy value count from the current domain assignments", () => {
    expect(
      resolveAssignedFuzzyValueCount({
        expressionDomainConfig: createIssueByCriterionExpressionDomainConfigFixture,
        leafCriteria: createIssueLeafCriteriaFixture,
        globalDomains: [],
        expressionDomains: [expressionLinguisticDomainFixture],
      })
    ).toBe(5);
  });

  it("returns null safely when assignments or domain definitions are missing or inconsistent", () => {
    expect(
      resolveAssignedFuzzyValueCount({
        expressionDomainConfig: { mode: "global", globalDomainId: "missing-domain" },
        leafCriteria: createIssueLeafCriteriaFixture,
        globalDomains: [globalContinuousDomainFixture],
        expressionDomains: [],
      })
    ).toBeNull();

    expect(
      resolveAssignedFuzzyValueCount({
        expressionDomainConfig: {
          mode: "byCriterion",
          domainsByCriterion: {
            Cost: expressionLinguisticDomainFixture._id,
            Speed: expressionLinguisticDomainSevenFixture._id,
          },
        },
        leafCriteria: createIssueLeafCriteriaFixture,
        globalDomains: [],
        expressionDomains: [
          expressionLinguisticDomainFixture,
          expressionLinguisticDomainSevenFixture,
        ],
      })
    ).toBeNull();
  });

  it("keeps current manual configs available for payload validation tests", () => {
    expect(createIssueManualCriteriaWeightingConfigFixture.payload.weightsByCriterion).toEqual({
      "criterion-cost": 0.6,
      "criterion-speed": 0.4,
    });
  });

  it("builds equal manual weights for six criteria that validate successfully", () => {
    const weightsByCriterion = buildCreateIssueEqualManualWeights(sixLeafCriteria);
    const total = Object.values(weightsByCriterion).reduce(
      (sum, value) => sum + Number(value),
      0
    );

    expect(weightsByCriterion).toEqual({
      "criterion-1": 0.166667,
      "criterion-2": 0.166667,
      "criterion-3": 0.166667,
      "criterion-4": 0.166667,
      "criterion-5": 0.166667,
      "criterion-6": 0.166665,
    });
    expect(total).toBe(1);
    expect(
      validateCreateIssueManualCriteriaWeighting({
        criteriaWeightingConfig: {
          mode: "creatorManual",
          payload: { weightsByCriterion },
        },
        leafCriteria: sixLeafCriteria,
      })
    ).toBeNull();
  });

  it("builds equal manual weights for three criteria that still validate", () => {
    const weightsByCriterion = buildCreateIssueEqualManualWeights(
      createIssueLeafCriteriaFixture.concat({
        id: "criterion-quality",
        name: "Quality",
        children: [],
      })
    );

    expect(
      validateCreateIssueManualCriteriaWeighting({
        criteriaWeightingConfig: {
          mode: "creatorManual",
          payload: { weightsByCriterion },
        },
        leafCriteria: createIssueLeafCriteriaFixture.concat({
          id: "criterion-quality",
          name: "Quality",
          children: [],
        }),
      })
    ).toBeNull();
  });

  it("still rejects invalid rounded manual weights when the stored total exceeds tolerance", () => {
    expect(
      validateCreateIssueManualCriteriaWeighting({
        criteriaWeightingConfig: {
          mode: "creatorManual",
          payload: {
            weightsByCriterion: {
              "criterion-1": 0.167,
              "criterion-2": 0.167,
              "criterion-3": 0.167,
              "criterion-4": 0.167,
              "criterion-5": 0.167,
              "criterion-6": 0.167,
            },
          },
        },
        leafCriteria: sixLeafCriteria,
      })
    ).toBe("Manual weights must sum to 1.");
  });
});

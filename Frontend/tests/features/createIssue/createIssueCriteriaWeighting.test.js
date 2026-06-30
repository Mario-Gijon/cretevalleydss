import { describe, expect, it } from "vitest";

import {
  buildDefaultCriteriaWeightingConfig,
  isCreateIssueCriteriaWeightingConfigOnDefault,
  resolveAssignedFuzzyValueCount,
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
});

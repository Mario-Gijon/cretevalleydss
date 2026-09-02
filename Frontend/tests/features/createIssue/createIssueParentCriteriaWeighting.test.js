import { describe, expect, it } from "vitest";

import {
  buildApiCriteriaWeightingConfig,
  buildConfigByMode,
  CRITERIA_WEIGHTING_MODES,
  normalizeCriteriaWeightingLevel,
} from "../../../src/features/createIssue/logic/createIssueCriteriaWeightingModes.js";
import { isParentCriteriaWeightingAvailable } from "../../../src/features/createIssue/logic/createIssueParentCriteriaWeighting.js";

describe("createIssueParentCriteriaWeighting", () => {
  const validHierarchy = [
    {
      id: "root",
      children: [
        { id: "c1", children: [{ id: "l1", children: [] }] },
        {
          id: "c2",
          children: [
            { id: "l2", children: [] },
            { id: "l3", children: [] },
          ],
        },
      ],
    },
  ];

  it("normalizes missing and explicit leaf levels to leaf", () => {
    expect(normalizeCriteriaWeightingLevel()).toBe("leaf");
    expect(normalizeCriteriaWeightingLevel("leaf")).toBe("leaf");
  });

  it("allows a coherent parent layer and rejects a mixed hierarchy", () => {
    expect(isParentCriteriaWeightingAvailable(validHierarchy)).toBe(true);
    expect(
      isParentCriteriaWeightingAvailable([
        {
          id: "root",
          children: [
            { id: "c1", children: [{ id: "l1", children: [] }] },
            {
              id: "c2",
              children: [
                { id: "group", children: [{ id: "l2", children: [] }] },
              ],
            },
          ],
        },
      ])
    ).toBe(false);
  });

  it("preserves parent for creator- and expert-side configurations", () => {
    expect(
      buildConfigByMode({
        mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
        leafCriteria: [],
        level: "parent",
      }).level
    ).toBe("parent");
    expect(
      buildConfigByMode({
        mode: CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL,
        leafCriteria: [],
        level: "parent",
      }).level
    ).toBe("parent");
    expect(
      buildApiCriteriaWeightingConfig({
        mode: CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL,
        leafCriteria: [],
        criteriaWeightingModel: { apiModelKey: "creator-test" },
        level: "parent",
      }).level
    ).toBe("parent");
    expect(
      buildApiCriteriaWeightingConfig({
        mode: CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
        leafCriteria: [],
        criteriaWeightingModel: { apiModelKey: "test" },
        level: "parent",
      }).level
    ).toBe("parent");
  });

  it("keeps MCC transitions independent from the parent-level choice", () => {
    expect(
      buildConfigByMode({
        mode: CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL,
        leafCriteria: [],
        level: "parent",
      }).level
    ).toBe("parent");
    expect(
      buildConfigByMode({
        mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
        leafCriteria: [],
      }).level
    ).toBe("leaf");
    expect(
      buildApiCriteriaWeightingConfig({
        mode: CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
        leafCriteria: [],
        criteriaWeightingModel: { apiModelKey: "other-expert-model" },
        level: "parent",
      }).level
    ).toBe("parent");
  });
});

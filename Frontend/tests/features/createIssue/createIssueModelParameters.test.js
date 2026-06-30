import { describe, expect, it } from "vitest";

import {
  setDefaults,
  updateParamValues,
} from "../../../src/features/createIssue/logic/createIssueModelParameters.js";
import {
  basicCreateIssueModelFixture,
  createIssueLeafCriteriaFixture,
  createIssueSingleLeafCriteriaFixture,
} from "../../mocks/fixtures/createIssue.fixtures.js";

describe("createIssueModelParameters", () => {
  it("creates default parameter values from the model definitions", () => {
    expect(
      setDefaults({
        selectedModel: basicCreateIssueModelFixture,
        criteria: createIssueLeafCriteriaFixture,
      })
    ).toEqual({
      threshold: 0.4,
      criterionScores: {
        "criterion-cost": 1,
        "criterion-speed": 1,
      },
    });
  });

  it("updates criterion-based parameter values when criteria change", () => {
    expect(
      updateParamValues(
        {
          threshold: 0.8,
          criterionScores: {
            "criterion-cost": 9,
          },
        },
        basicCreateIssueModelFixture,
        createIssueLeafCriteriaFixture
      )
    ).toEqual({
      threshold: 0.8,
      criterionScores: {
        "criterion-cost": 9,
        "criterion-speed": 1,
      },
    });

    expect(
      updateParamValues(
        {
          threshold: 0.8,
          criterionScores: {
            "criterion-cost": 9,
            "criterion-speed": 7,
          },
        },
        basicCreateIssueModelFixture,
        createIssueSingleLeafCriteriaFixture
      )
    ).toEqual({
      threshold: 0.8,
      criterionScores: {
        "criterion-cost": 9,
      },
    });
  });

  it("preserves unknown parameter keys according to current update behavior", () => {
    expect(
      updateParamValues(
        {
          staleKey: "keep",
        },
        basicCreateIssueModelFixture,
        createIssueSingleLeafCriteriaFixture
      )
    ).toEqual({
      staleKey: "keep",
      threshold: 0.4,
      criterionScores: {
        "criterion-cost": 1,
      },
    });
  });

  it("handles invalid model parameter definitions defensively", () => {
    expect(
      setDefaults({
        selectedModel: {
          ...basicCreateIssueModelFixture,
          parameters: null,
        },
        criteria: createIssueLeafCriteriaFixture,
      })
    ).toEqual({});

    expect(updateParamValues(null, null, createIssueLeafCriteriaFixture)).toEqual({});
  });
});

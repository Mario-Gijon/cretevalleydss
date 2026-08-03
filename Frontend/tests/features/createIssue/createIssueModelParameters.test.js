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
  it("preserves raw default parameter values from the model definitions", () => {
    expect(
      setDefaults({
        selectedModel: basicCreateIssueModelFixture,
        criteria: createIssueLeafCriteriaFixture,
      })
    ).toEqual({
      threshold: 0.4,
      criterionScores: 1,
    });
  });

  it("preserves plugin-owned parameter values without interpreting criteria", () => {
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
      criterionScores: { "criterion-cost": 9 },
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
        "criterion-speed": 7,
      },
    });
  });

  it("prunes parameters not declared by the selected model", () => {
    expect(
      updateParamValues(
        {
          staleKey: "keep",
        },
        basicCreateIssueModelFixture,
        createIssueSingleLeafCriteriaFixture
      )
    ).toEqual({
      threshold: 0.4,
      criterionScores: 1,
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

  it("preserves zero, integer defaults, and raw global numeric drafts", () => {
    const selectedModel = {
      parameters: [
        {
          key: "zero",
          label: "Zero",
          valueType: "number",
          parameterStructureKey: "numberGlobal",
          required: true,
          default: 0,
          restrictions: { min: null, max: null, allowed: null },
        },
        {
          key: "iterations",
          label: "Iterations",
          parameterStructureKey: "numberGlobal",
          valueType: "integer",
          required: true,
          default: 4,
          restrictions: { min: 1, max: null, allowed: null },
        },
      ],
    };

    expect(
      setDefaults({
        selectedModel,
        criteria: createIssueLeafCriteriaFixture,
      })
    ).toEqual({ zero: 0, iterations: 4 });

    expect(
      updateParamValues(
        { zero: "-0.123456", iterations: "4.5" },
        selectedModel,
        createIssueSingleLeafCriteriaFixture
      )
    ).toEqual({ zero: "-0.123456", iterations: "4.5" });
  });

  it("omits parameters without defaults until drafts are explicitly supplied", () => {
    const selectedModel = {
      parameters: [
        {
          key: "requiredAlpha",
          label: "Required alpha",
          parameterStructureKey: "numberGlobal",
          valueType: "number",
          required: true,
          restrictions: { min: null, max: null, allowed: null },
        },
        {
          key: "optionalIterations",
          label: "Optional iterations",
          parameterStructureKey: "numberGlobal",
          valueType: "integer",
          required: false,
          restrictions: { min: null, max: null, allowed: null },
        },
      ],
    };

    expect(
      setDefaults({ selectedModel, criteria: createIssueLeafCriteriaFixture })
    ).toEqual({});
    expect(
      updateParamValues(
        {
          requiredAlpha: "-0.125",
          optionalIterations: "",
        },
        selectedModel,
        createIssueLeafCriteriaFixture
      )
    ).toEqual({
      requiredAlpha: "-0.125",
      optionalIterations: "",
    });
  });
});

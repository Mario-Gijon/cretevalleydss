import { describe, expect, it } from "vitest";

import {
  buildParamsResolved,
  cleanParamsForSend,
  getScenarioParameterDefinitions,
} from "../../../src/features/finishedIssueDialog/logic/buildFinishedScenarioParameters";

const model = {
  parameterDefinitions: [
    { key: "zero", default: 0 },
    { key: "enabled", default: false },
    { key: "agreement", default: [0.3, 0.8] },
    { key: "metadata", default: { nested: ["value"] } },
    { key: "iterations" },
    {
      key: "requiredInterval",
      parameterStructureKey: "intervalGlobal",
      required: true,
      restrictions: { min: 0, max: 1, ordered: "strictIncreasing" },
    },
  ],
};

const twoTupleModel = {
  parameterDefinitions: [
    {
      key: "criteriaAggregation",
      parameterStructureKey: "twoTupleAggregation",
      default: { method: "weighted_average" },
      restrictions: {
        methods: [
          { key: "weighted_average", subparameters: [] },
          { key: "arithmetic_mean", subparameters: [] },
          { key: "l2towa", subparameters: [{ key: "quantifier" }] },
        ],
      },
    },
    {
      key: "expertAggregation",
      parameterStructureKey: "twoTupleAggregation",
      default: { method: "arithmetic_mean", options: null },
      restrictions: {
        methods: [
          { key: "arithmetic_mean", subparameters: [] },
          { key: "l2towa", subparameters: [{ key: "quantifier" }] },
        ],
      },
    },
    { key: "unrelated", default: { nested: ["value"] } },
  ],
};

describe("finished scenario parameter drafts", () => {
  it("copies only declared defaults without fabricating values from restrictions", () => {
    const resolved = buildParamsResolved({ model, leafCount: 0 });

    expect(resolved).toEqual({
      zero: 0,
      enabled: false,
      agreement: [0.3, 0.8],
      metadata: { nested: ["value"] },
    });
    expect(resolved).not.toHaveProperty("requiredInterval");
    expect(resolved.agreement).not.toBe(model.parameterDefinitions[2].default);
    expect(resolved.metadata).not.toBe(model.parameterDefinitions[3].default);
  });

  it("forwards owned raw overrides unchanged", () => {
    const values = {
      zero: 0,
      enabled: false,
      agreement: ["0.125", "0.987654"],
      requiredInterval: [0.8, 0.3],
      metadata: { criterionA: -0.123456789, criterionB: "draft" },
      iterations: "100",
    };

    expect(cleanParamsForSend({ model, values, leafCount: 0 })).toEqual(values);
  });

  it("canonicalizes parameterless two-tuple defaults and final values", () => {
    expect(buildParamsResolved({ model: twoTupleModel, leafCount: 0 })).toEqual({
      criteriaAggregation: { method: "weighted_average", options: {} },
      expertAggregation: { method: "arithmetic_mean", options: {} },
      unrelated: { nested: ["value"] },
    });

    expect(cleanParamsForSend({
      model: twoTupleModel,
      values: {
        criteriaAggregation: { method: "weighted_average" },
        expertAggregation: { method: "arithmetic_mean", options: null },
        unrelated: { nested: ["draft"] },
      },
      leafCount: 0,
    })).toEqual({
      criteriaAggregation: { method: "weighted_average", options: {} },
      expertAggregation: { method: "arithmetic_mean", options: {} },
      unrelated: { nested: ["draft"] },
    });
  });

  it("preserves valid options for configurable two-tuple methods", () => {
    const options = { quantifier: "most" };

    expect(cleanParamsForSend({
      model: twoTupleModel,
      values: {
        criteriaAggregation: { method: "l2towa", options },
      },
      leafCount: 0,
    })).toEqual({
      criteriaAggregation: { method: "l2towa", options },
    });
  });

  it("uses the registered numeric criteria-value structure for synthetic weights", () => {
    expect(
      getScenarioParameterDefinitions({
        capabilities: { usesCriteriaWeights: true },
      })
    ).toEqual([
      {
        key: "weights",
        label: "Criteria weights",
        parameterStructureKey: "numberCriterion",
        semanticRole: "criteriaWeights",
        required: true,
        default: "equal",
        restrictions: {
          min: 0,
          max: 1,
          ordered: null,
          length: "matchCriteria",
          allowed: null,
        },
      },
    ]);
  });
});

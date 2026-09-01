import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";

const methods = [
  { key: "arithmetic_mean", subparameters: [] },
  { key: "weighted_average", subparameters: [] },
  {
    key: "l2towa",
    subparameters: [
      {
        key: "quantifier",
        type: "select",
        required: true,
        options: [{ value: "most", label: "Most" }],
      },
    ],
  },
];

const model = {
  name: "2-Tuple Linguistic Model",
  parameters: [
    {
      key: "expertAggregation",
      parameterStructureKey: "twoTupleAggregation",
      required: true,
      default: { method: "arithmetic_mean", options: {} },
      restrictions: { methods },
    },
    {
      key: "criteriaAggregation",
      parameterStructureKey: "twoTupleAggregation",
      required: true,
      default: { method: "weighted_average", options: {} },
      restrictions: { methods },
    },
  ],
};

describe("twoTupleAggregation model parameters", () => {
  it("normalizes the default 2-Tuple configuration with object options", () => {
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model,
        paramValues: {
          expertAggregation: { method: "arithmetic_mean", options: {} },
          criteriaAggregation: { method: "weighted_average", options: {} },
        },
        criteriaNodes: [],
      })
    ).toEqual({
      expertAggregation: { method: "arithmetic_mean", options: {} },
      criteriaAggregation: { method: "weighted_average", options: {} },
    });
  });

  it("preserves options for configurable methods", () => {
    const configurableModel = {
      ...model,
      parameters: model.parameters.map((parameter) => ({
        ...parameter,
        default: { method: "l2towa", options: { quantifier: "most" } },
      })),
    };

    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: configurableModel,
        paramValues: {
          expertAggregation: { method: "l2towa", options: { quantifier: "most" } },
          criteriaAggregation: { method: "l2towa", options: { quantifier: "most" } },
        },
        criteriaNodes: [],
      })
    ).toMatchObject({
      expertAggregation: { options: { quantifier: "most" } },
      criteriaAggregation: { options: { quantifier: "most" } },
    });
  });
});

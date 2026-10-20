import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { resolveResultStructureParameterContextsOrThrow } from "../../../modules/decisionPlugins/modelParameters/resolveResultStructureParameterContexts.js";
import { validateAndNormalizeOrderedCategoriesParameter } from "../../../modules/decisionPlugins/modelParameters/structures/orderedCategories/validateAndNormalize.js";
import { validateOrderedCategoriesDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/orderedCategories/validateDefinition.js";

const categories = [
  { categoryId: "high", label: "Repeated label", order: 1 },
  { categoryId: "low", label: "Repeated label", order: 0 },
];

const buildParameter = (overrides = {}) => ({
  key: "categories",
  label: "Ordered categories",
  parameterStructureKey: "orderedCategories",
  required: true,
  ...overrides,
});

describe("orderedCategories model parameter structure", () => {
  it("accepts any category count and canonicalizes by explicit order", () => {
    expect(validateAndNormalizeOrderedCategoriesParameter({ value: [] })).toEqual({
      ok: true,
      value: [],
    });
    expect(
      validateAndNormalizeOrderedCategoriesParameter({
        value: [{ categoryId: "only", label: "Only", order: 0 }],
      })
    ).toEqual({
      ok: true,
      value: [{ categoryId: "only", label: "Only", order: 0 }],
    });
    expect(
      validateAndNormalizeOrderedCategoriesParameter({ value: categories })
    ).toEqual({
      ok: true,
      value: [
        { categoryId: "low", label: "Repeated label", order: 0 },
        { categoryId: "high", label: "Repeated label", order: 1 },
      ],
    });
  });

  it.each([
    ["not-an-array", "must be an array"],
    [[{ categoryId: "", label: "Empty id", order: 0 }], "non-empty categoryId"],
    [[{ categoryId: "a", label: " ", order: 0 }], "non-empty label"],
    [
      [
        { categoryId: "a", label: "A", order: 0 },
        { categoryId: "a", label: "B", order: 1 },
      ],
      "must be unique",
    ],
    [[{ categoryId: "a", label: "A", order: 1 }], "consecutive starting at zero"],
    [
      [
        { categoryId: "a", label: "A", order: 0 },
        { categoryId: "b", label: "B", order: 2 },
      ],
      "consecutive starting at zero",
    ],
    [
      [
        { categoryId: "a", label: "A", order: 0 },
        { categoryId: "b", label: "B", order: 0 },
      ],
      "order '0' must be unique",
    ],
    [[{ categoryId: "a", label: "A", order: -1 }], "non-negative integer"],
    [[{ categoryId: "a", label: "A", order: 0, value: 2 }], "unsupported field 'value'"],
    [[null], "must be an object"],
  ])("rejects invalid category definitions %p", (value, message) => {
    expect(validateAndNormalizeOrderedCategoriesParameter({ value })).toMatchObject({
      ok: false,
      message: expect.stringContaining(message),
    });
  });

  it("validates parameter defaults with the same rules as runtime values", () => {
    expect(validateOrderedCategoriesDefinition(buildParameter())).toBeNull();
    expect(
      validateOrderedCategoriesDefinition(buildParameter({ default: categories }))
    ).toBeNull();
    expect(
      validateOrderedCategoriesDefinition(
        buildParameter({ default: [{ categoryId: "a", label: "A", order: 2 }] })
      )
    ).toContain("consecutive starting at zero");
  });

  it("normalizes and persists a supplied or default category configuration as a model parameter", () => {
    const parameter = buildParameter({ default: categories });
    const model = { name: "Synthetic sorter", parameters: [parameter] };
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model,
        paramValues: {},
        criteriaNodes: [],
      })
    ).toEqual({
      categories: [
        { categoryId: "low", label: "Repeated label", order: 0 },
        { categoryId: "high", label: "Repeated label", order: 1 },
      ],
    });
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model,
        paramValues: { categories },
        criteriaNodes: [],
      }).categories
    ).toEqual([
      { categoryId: "low", label: "Repeated label", order: 0 },
      { categoryId: "high", label: "Repeated label", order: 1 },
    ]);
  });

  it("resolves result validation context from exactly one declared structure parameter", () => {
    expect(
      resolveResultStructureParameterContextsOrThrow({
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        parameterDefinitions: [buildParameter()],
        parameterValues: { categories },
      })
    ).toEqual({
      authorizedCategories: [
        { categoryId: "low", label: "Repeated label", order: 0 },
        { categoryId: "high", label: "Repeated label", order: 1 },
      ],
    });

    expect(() =>
      resolveResultStructureParameterContextsOrThrow({
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        parameterDefinitions: [],
        parameterValues: {},
      })
    ).toThrow("requires exactly one model parameter");
    expect(() =>
      resolveResultStructureParameterContextsOrThrow({
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        parameterDefinitions: [buildParameter(), buildParameter({ key: "otherCategories" })],
        parameterValues: { categories },
      })
    ).toThrow("requires exactly one model parameter");
    expect(() =>
      resolveResultStructureParameterContextsOrThrow({
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        parameterDefinitions: [buildParameter()],
        parameterValues: {},
      })
    ).toThrow("is missing from persisted model parameters");
  });

  it("does not impose context requirements on result structures that do not declare them", () => {
    expect(
      resolveResultStructureParameterContextsOrThrow({
        resultStructureKey: "ranking",
        resultStructureVersion: 1,
        parameterDefinitions: [],
        parameterValues: {},
      })
    ).toEqual({});
  });
});

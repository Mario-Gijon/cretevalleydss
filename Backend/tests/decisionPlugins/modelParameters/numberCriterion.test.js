import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { validateAndNormalizeNumberCriterion } from "../../../modules/decisionPlugins/modelParameters/structures/numberCriterion/validateAndNormalize.js";
import { validateNumberCriterionDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/numberCriterion/validateDefinition.js";

const rows = [
  { id: "cost", name: "Cost" },
  { id: "quality", name: "Quality" },
];

const buildParameter = (overrides = {}) => ({
  key: "threshold",
  label: "Threshold",
  parameterStructureKey: "numberCriterion",
  required: true,
  default: 0.05,
  restrictions: { min: 0, max: 1 },
  ...overrides,
});

describe("numberCriterion definition", () => {
  it("accepts a canonical definition without scope", () => {
    const parameter = buildParameter();
    expect(parameter).not.toHaveProperty("scope");
    expect(validateNumberCriterionDefinition(parameter)).toBeNull();
  });

  it.each([
    buildParameter(),
    buildParameter({ default: 0 }),
    buildParameter({ default: -1.25, restrictions: { min: -2, max: null } }),
    buildParameter({ default: 2.345678901, restrictions: { min: null, max: null } }),
  ])("accepts canonical numeric metadata", (parameter) => {
    expect(validateNumberCriterionDefinition(parameter)).toBeNull();
  });

  it("keeps default presence independent from required", () => {
    const required = buildParameter();
    delete required.default;
    const optional = buildParameter({ required: false });
    delete optional.default;
    expect(validateNumberCriterionDefinition(required)).toBeNull();
    expect(validateNumberCriterionDefinition(optional)).toBeNull();
  });

  it.each([
    { restrictions: null },
    { restrictions: { max: 1 } },
    { restrictions: { min: 0 } },
    { restrictions: { min: "0", max: 1 } },
    { restrictions: { min: false, max: 1 } },
    { restrictions: { min: Number.NaN, max: 1 } },
    { restrictions: { min: 0, max: Infinity } },
    { restrictions: { min: 2, max: 1 } },
    { default: "0.05" },
    { default: true },
    { default: Number.NaN },
    { default: Infinity },
    { default: 2 },
  ])("rejects invalid consumed metadata", (overrides) => {
    expect(validateNumberCriterionDefinition(buildParameter(overrides))).toEqual(expect.any(String));
  });
});

describe("numberCriterion runtime", () => {
  it.each([[0, 0], ["0", 0], [-1.25, -1.25], ["-1.25", -1.25], ["1e-3", 0.001], ["2.345678901", 2.345678901]])(
    "expands scalar %p to every canonical criterion id",
    (value, expected) => {
      expect(validateAndNormalizeNumberCriterion({ value, parameter: { restrictions: { min: null, max: null } }, context: { leafCriteria: rows } })).toEqual({ ok: true, value: { cost: expected, quality: expected } });
    }
  );

  it("normalizes complete maps without aliases or mutation", () => {
    const value = { cost: "0.05", quality: 0.1 };
    const context = { leafCriteria: rows };
    expect(validateAndNormalizeNumberCriterion({ value, parameter: { restrictions: { min: 0, max: 1 } }, context })).toEqual({ ok: true, value: { cost: 0.05, quality: 0.1 } });
    expect(value).toEqual({ cost: "0.05", quality: 0.1 });
    expect(context).toEqual({ leafCriteria: rows });
  });

  it.each([
    ["", { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [true, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [{ cost: 0.1 }, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [{ cost: 0.1, quality: 0.2, stale: 1 }, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [{ Cost: 0.1, quality: 0.2 }, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [{ cost: "", quality: 0.2 }, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [{ cost: -0.1, quality: 0.2 }, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: rows } }],
    [0.1, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: [] } }],
    [0.1, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: [{ name: "Cost" }] } }],
    [0.1, { restrictions: { min: 0, max: 1 }, context: { leafCriteria: [{ id: "cost" }, { id: "cost" }] } }],
  ])("rejects malformed runtime input %p", (value, input) => {
    expect(validateAndNormalizeNumberCriterion({ value, parameter: { restrictions: input.restrictions }, context: input.context })).toMatchObject({ ok: false });
  });
});

describe("numberCriterion generic resolver integration", () => {
  it("expands a scalar default and retains required or optional omission semantics", () => {
    const model = { name: "Demo", parameters: [buildParameter()] };
    expect(validateAndNormalizeModelParametersOrThrow({ model, paramValues: {}, criteriaNodes: rows })).toEqual({ threshold: { cost: 0.05, quality: 0.05 } });
    const negativeModel = {
      name: "Demo",
      parameters: [buildParameter({ restrictions: { min: -1, max: 1 } })],
    };
    expect(validateAndNormalizeModelParametersOrThrow({ model: negativeModel, paramValues: { threshold: { cost: "0", quality: "-0.5" } }, criteriaNodes: rows })).toEqual({ threshold: { cost: 0, quality: -0.5 } });

    const required = buildParameter();
    delete required.default;
    expect(() => validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [required] }, paramValues: {}, criteriaNodes: rows })).toThrow("threshold is required");
    const optional = buildParameter({ required: false });
    delete optional.default;
    expect(validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [optional] }, paramValues: {}, criteriaNodes: rows })).toEqual({});
  });
});

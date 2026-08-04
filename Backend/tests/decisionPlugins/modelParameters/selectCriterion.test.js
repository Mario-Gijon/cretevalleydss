import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { validateAndNormalizeSelectCriterion } from "../../../modules/decisionPlugins/modelParameters/structures/selectCriterion/validateAndNormalize.js";
import { validateSelectCriterionDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/selectCriterion/validateDefinition.js";

const rows = [
  { id: "cost", key: "costKey", _id: "costObject", name: "Cost" },
  { id: "quality", key: "qualityKey", _id: "qualityObject", name: "Quality" },
];

const criteriaNodes = [
  { id: "cost", name: "Cost" },
  { id: "quality", name: "Quality" },
];

const buildParameter = (overrides = {}) => ({
  key: "preference",
  label: "Preference",
  parameterStructureKey: "selectCriterion",
  valueType: "string",
  required: true,
  default: "t5",
  restrictions: { allowed: ["t3", "t5"] },
  ...overrides,
});

const runtime = ({ value, parameter = buildParameter(), context = { leafCriteria: rows } }) =>
  validateAndNormalizeSelectCriterion({ value, parameter, context });

describe("selectCriterion definition", () => {
  it.each([
    buildParameter(),
    buildParameter({ valueType: "number", default: -1, restrictions: { allowed: [-1, 0] } }),
    buildParameter({ valueType: "integer", default: 0, restrictions: { allowed: [-1, 0, 1] } }),
    buildParameter({ valueType: "boolean", default: false, restrictions: { allowed: [false, true] } }),
    (() => { const parameter = buildParameter(); delete parameter.default; return parameter; })(),
    (() => { const parameter = buildParameter({ required: false }); delete parameter.default; return parameter; })(),
  ])("accepts canonical typed metadata", (parameter) => {
    expect(validateSelectCriterionDefinition(parameter)).toBeNull();
  });

  it("accepts document-like metadata and ignores obsolete restriction metadata", () => {
    const parameter = Object.assign(Object.create({ persisted: true }), buildParameter({
      restrictions: { allowed: ["t3", "t5"], valueType: "enum", requiredForEachCriterion: false },
      unrelated: true,
    }));
    expect(validateSelectCriterionDefinition(parameter)).toBeNull();
  });

  it.each([
    ["null", null], ["undefined", undefined], ["array", []],
    ["unsupported type", buildParameter({ valueType: "enum" })],
    ["missing restrictions", buildParameter({ restrictions: undefined })],
    ["non-plain restrictions", buildParameter({ restrictions: [] })],
    ["missing allowed", buildParameter({ restrictions: {} })],
    ["empty allowed", buildParameter({ restrictions: { allowed: [] } })],
    ["mixed allowed", buildParameter({ restrictions: { allowed: ["t5", 1] } })],
    ["empty string", buildParameter({ restrictions: { allowed: [" "] } })],
    ["numeric string", buildParameter({ valueType: "number", restrictions: { allowed: ["1"] } })],
    ["decimal integer", buildParameter({ valueType: "integer", restrictions: { allowed: [1.5] } })],
    ["non-boolean", buildParameter({ valueType: "boolean", restrictions: { allowed: ["false"] } })],
    ["NaN", buildParameter({ valueType: "number", restrictions: { allowed: [Number.NaN] } })],
    ["infinity", buildParameter({ valueType: "number", restrictions: { allowed: [Infinity] } })],
    ["duplicates", buildParameter({ restrictions: { allowed: ["t5", "t5"] } })],
    ["undefined default", buildParameter({ default: undefined })],
    ["wrong default type", buildParameter({ default: 5 })],
    ["default not allowed", buildParameter({ default: "t1" })],
  ])("rejects %s", (_label, parameter) => {
    expect(validateSelectCriterionDefinition(parameter)).toEqual(expect.any(String));
  });
});

describe("selectCriterion runtime", () => {
  it.each([
    ["string", buildParameter(), "t5", { cost: "t5", quality: "t5" }],
    ["number string", buildParameter({ valueType: "number", restrictions: { allowed: [-1, 0] }, default: 0 }), "-1", { cost: -1, quality: -1 }],
    ["integer string", buildParameter({ valueType: "integer", restrictions: { allowed: [0, 1] }, default: 0 }), "0", { cost: 0, quality: 0 }],
    ["boolean string", buildParameter({ valueType: "boolean", restrictions: { allowed: [false, true] }, default: false }), " TRUE ", { cost: true, quality: true }],
    ["false", buildParameter({ valueType: "boolean", restrictions: { allowed: [false, true] }, default: false }), false, { cost: false, quality: false }],
  ])("expands scalar %s values", (_label, parameter, value, expected) => {
    expect(runtime({ value, parameter })).toEqual({ ok: true, value: expected });
  });

  it("normalizes a complete map without mutation", () => {
    const parameter = buildParameter({ valueType: "number", restrictions: { allowed: [-1, 0, 1] }, default: 0 });
    const value = { cost: "-1", quality: 0 };
    const context = { leafCriteria: rows };
    expect(runtime({ value, parameter, context })).toEqual({ ok: true, value: { cost: -1, quality: 0 } });
    expect(value).toEqual({ cost: "-1", quality: 0 });
    expect(parameter).toEqual(buildParameter({ valueType: "number", restrictions: { allowed: [-1, 0, 1] }, default: 0 }));
    expect(context).toEqual({ leafCriteria: rows });
  });

  it.each([
    ["invalid string", "t1", buildParameter()],
    ["empty string", "", buildParameter()],
    ["non-numeric", "x", buildParameter({ valueType: "number", restrictions: { allowed: [0] }, default: 0 })],
    ["integer decimal", "1.5", buildParameter({ valueType: "integer", restrictions: { allowed: [1] }, default: 1 })],
    ["boolean string", "yes", buildParameter({ valueType: "boolean", restrictions: { allowed: [false, true] }, default: false })],
    ["unsupported type", "t5", buildParameter({ valueType: "enum" })],
    ["malformed allowed", "t5", buildParameter({ restrictions: { allowed: [] } })],
    ["duplicate allowed", "t5", buildParameter({ restrictions: { allowed: ["t5", "t5"] } })],
    ["missing map row", { cost: "t5" }, buildParameter()],
    ["stale map row", { cost: "t5", quality: "t5", stale: "t5" }, buildParameter()],
    ["name alias", { Cost: "t5", quality: "t5" }, buildParameter()],
    ["key alias", { costKey: "t5", quality: "t5" }, buildParameter()],
    ["object id alias", { costObject: "t5", quality: "t5" }, buildParameter()],
    ["empty key", { "": "t5", quality: "t5" }, buildParameter()],
    ["invalid row", { cost: "t1", quality: "t5" }, buildParameter()],
  ])("rejects %s", (_label, value, parameter) => {
    expect(runtime({ value, parameter })).toMatchObject({ ok: false });
  });

  it.each([
    undefined,
    {},
    { leafCriteria: [] },
    { leafCriteria: [{ name: "Cost" }] },
    { leafCriteria: [{ id: " " }] },
    { leafCriteria: [{ id: "cost" }, { id: "cost" }] },
  ])("rejects malformed context %p", (context) => {
    expect(runtime({ value: "t5", context })).toMatchObject({ ok: false });
  });
});

describe("selectCriterion generic resolver integration", () => {
  it("expands scalar defaults and preserves optional omission", () => {
    const model = { name: "Demo", parameters: [buildParameter()] };
    expect(validateAndNormalizeModelParametersOrThrow({ model, paramValues: {}, criteriaNodes })).toEqual({ preference: { cost: "t5", quality: "t5" } });

    const required = buildParameter(); delete required.default;
    expect(() => validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [required] }, paramValues: {}, criteriaNodes })).toThrow("preference is required");
    const optional = buildParameter({ required: false }); delete optional.default;
    expect(validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [optional] }, paramValues: {}, criteriaNodes })).toEqual({});
  });

  it("preserves false and zero defaults and rejects incomplete maps", () => {
    const boolean = buildParameter({ valueType: "boolean", default: false, restrictions: { allowed: [false, true] } });
    const numeric = buildParameter({ valueType: "number", default: 0, restrictions: { allowed: [-1, 0] } });
    expect(validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [boolean] }, paramValues: {}, criteriaNodes })).toEqual({ preference: { cost: false, quality: false } });
    expect(validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [numeric] }, paramValues: { preference: { cost: "-1", quality: "0" } }, criteriaNodes })).toEqual({ preference: { cost: -1, quality: 0 } });
    expect(() => validateAndNormalizeModelParametersOrThrow({ model: { name: "Demo", parameters: [numeric] }, paramValues: { preference: { cost: 0 } }, criteriaNodes })).toThrow();
  });
});

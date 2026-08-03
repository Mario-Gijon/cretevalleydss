import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/decisionPlugins/modelParameters/validateAndNormalizeModelParameters.js";
import { validateAndNormalizeNumberGlobal } from "../../../modules/decisionPlugins/modelParameters/structures/numberGlobal/operations/validateAndNormalize.js";
import { validateNumberGlobalMetadata } from "../../../modules/decisionPlugins/modelParameters/structures/numberGlobal/operations/validateMetadata.js";

const buildParameter = (overrides = {}) => ({
  key: "alpha",
  label: "Alpha",
  scope: "global",
  parameterStructureKey: "numberGlobal",
  valueType: "number",
  required: true,
  default: 0,
  restrictions: {
    min: null,
    max: null,
    allowed: null,
  },
  ...overrides,
});

describe("numberGlobal parameter structure", () => {
  it.each([
    [0, 0],
    [-3, -3],
    [2.75, 2.75],
    ["0", 0],
    ["-3", -3],
    ["0.125", 0.125],
  ])("normalizes the valid value %p to %p", (value, expected) => {
    expect(
      validateAndNormalizeNumberGlobal({
        value,
        parameter: buildParameter(),
      })
    ).toEqual({ ok: true, value: expected });
  });

  it("accepts inclusive range boundaries and applies allowed values afterward", () => {
    const parameter = buildParameter({
      default: 0.5,
      restrictions: {
        min: 0,
        max: 1,
        allowed: [0, 0.5, 1],
      },
    });

    expect(
      validateAndNormalizeNumberGlobal({ value: "0", parameter })
    ).toEqual({ ok: true, value: 0 });
    expect(
      validateAndNormalizeNumberGlobal({ value: "1", parameter })
    ).toEqual({ ok: true, value: 1 });
    expect(
      validateAndNormalizeNumberGlobal({ value: "0.25", parameter })
    ).toMatchObject({ ok: false });
  });

  it.each([
    "",
    "   ",
    true,
    false,
    null,
    undefined,
    [],
    {},
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "1x",
  ])("rejects the invalid value %p", (value) => {
    expect(
      validateAndNormalizeNumberGlobal({
        value,
        parameter: buildParameter(),
      })
    ).toMatchObject({ ok: false });
  });

  it("rejects values below or above the inclusive range", () => {
    const parameter = buildParameter({
      restrictions: { min: -1, max: 1, allowed: null },
    });

    expect(
      validateAndNormalizeNumberGlobal({ value: -1.01, parameter })
    ).toMatchObject({ ok: false });
    expect(
      validateAndNormalizeNumberGlobal({ value: 1.01, parameter })
    ).toMatchObject({ ok: false });
  });

  it("accepts integer numbers and strings without truncating decimals", () => {
    const parameter = buildParameter({
      valueType: "integer",
      default: 4,
      restrictions: { min: 1, max: 10, allowed: null },
    });

    expect(
      validateAndNormalizeNumberGlobal({ value: 4, parameter })
    ).toEqual({ ok: true, value: 4 });
    expect(
      validateAndNormalizeNumberGlobal({ value: "4", parameter })
    ).toEqual({ ok: true, value: 4 });
    expect(
      validateAndNormalizeNumberGlobal({ value: 4.5, parameter })
    ).toMatchObject({ ok: false, value: 4.5 });
    expect(
      validateAndNormalizeNumberGlobal({ value: "4.5", parameter })
    ).toMatchObject({ ok: false, value: "4.5" });
  });
});

describe("numberGlobal metadata", () => {
  it("accepts canonical number and integer metadata", () => {
    expect(validateNumberGlobalMetadata(buildParameter())).toBeNull();
    expect(
      validateNumberGlobalMetadata(
        buildParameter({
          valueType: "integer",
          default: 2,
          restrictions: { min: 1, max: 3, allowed: [1, 2, 3] },
        })
      )
    ).toBeNull();

    const optionalWithoutDefault = buildParameter({ required: false });
    delete optionalWithoutDefault.default;
    expect(validateNumberGlobalMetadata(optionalWithoutDefault)).toBeNull();

    const requiredWithoutDefault = buildParameter({ required: true });
    delete requiredWithoutDefault.default;
    expect(validateNumberGlobalMetadata(requiredWithoutDefault)).toBeNull();
  });

  it.each([
    ["non-object metadata", null],
    ["wrong scope", { scope: "perCriterion" }],
    ["wrong structure", { parameterStructureKey: "numberCriterion" }],
    ["missing valueType", { valueType: undefined }],
    ["unsupported valueType", { valueType: "decimal" }],
    ["present undefined default", { default: undefined }],
    ["non-object restrictions", { restrictions: [] }],
    [
      "incomplete restrictions",
      { restrictions: { min: 0, max: 1 } },
    ],
    [
      "invalid min",
      { restrictions: { min: "0", max: 1, allowed: null } },
    ],
    [
      "invalid max",
      { restrictions: { min: 0, max: Number.POSITIVE_INFINITY, allowed: null } },
    ],
    [
      "reversed range",
      { restrictions: { min: 2, max: 1, allowed: null } },
    ],
    [
      "invalid allowed value",
      { restrictions: { min: 0, max: 1, allowed: [true] } },
    ],
    [
      "duplicate allowed values",
      { restrictions: { min: 0, max: 1, allowed: [0.5, 0.5] } },
    ],
    [
      "allowed outside range",
      { restrictions: { min: 0, max: 1, allowed: [2] } },
    ],
    [
      "default outside range",
      {
        default: 2,
        restrictions: { min: 0, max: 1, allowed: null },
      },
    ],
    [
      "default outside allowed",
      {
        default: 0.5,
        restrictions: { min: 0, max: 1, allowed: [0, 1] },
      },
    ],
  ])("rejects %s", (_label, overrides) => {
    const parameter = overrides === null ? null : buildParameter(overrides);
    expect(validateNumberGlobalMetadata(parameter)).toEqual(
      expect.any(String)
    );
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["numeric string", "0.5"],
    ["boolean", true],
    ["false boolean", false],
    ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
    ["array", []],
    ["object", {}],
  ])("rejects a present %s default", (_label, defaultValue) => {
    expect(
      validateNumberGlobalMetadata(buildParameter({ default: defaultValue }))
    ).toEqual(expect.any(String));
  });

  it.each([
    ["isInteger", { isInteger: true }],
    ["numericType", { numericType: "integer" }],
    ["type", { type: "integer" }],
    ["minimum", { minimum: 0 }],
    ["maximum", { maximum: 1 }],
    ["options", { options: [0, 1] }],
    [
      "restrictions.valueType",
      {
        restrictions: {
          min: null,
          max: null,
          allowed: null,
          valueType: "integer",
        },
      },
    ],
    [
      "restrictions.minimum",
      {
        restrictions: {
          min: null,
          max: null,
          allowed: null,
          minimum: 0,
        },
      },
    ],
    [
      "restrictions.maximum",
      {
        restrictions: {
          min: null,
          max: null,
          allowed: null,
          maximum: 1,
        },
      },
    ],
    [
      "restrictions.options",
      {
        restrictions: {
          min: null,
          max: null,
          allowed: null,
          options: [0, 1],
        },
      },
    ],
    [
      "unknown restriction",
      {
        restrictions: {
          min: null,
          max: null,
          allowed: null,
          extra: true,
        },
      },
    ],
  ])("rejects the unsupported metadata field %s", (_label, overrides) => {
    expect(validateNumberGlobalMetadata(buildParameter(overrides))).toEqual(
      expect.any(String)
    );
  });

  it.each([
    ["string", ["0.5"]],
    ["NaN", [Number.NaN]],
    ["infinity", [Number.POSITIVE_INFINITY]],
    ["array", [[0.5]]],
    ["object", [{ value: 0.5 }]],
  ])("rejects an allowed array containing a %s", (_label, allowed) => {
    expect(
      validateNumberGlobalMetadata(
        buildParameter({
          restrictions: { min: 0, max: 1, allowed },
        })
      )
    ).toEqual(expect.any(String));
  });

  it.each([
    ["decimal default", { default: 1.5 }],
    [
      "decimal min",
      { restrictions: { min: 0.5, max: 3, allowed: null } },
    ],
    [
      "decimal max",
      { restrictions: { min: 0, max: 3.5, allowed: null } },
    ],
    [
      "decimal allowed",
      { restrictions: { min: 0, max: 3, allowed: [1.5] } },
    ],
  ])("rejects integer metadata with a %s", (_label, overrides) => {
    expect(
      validateNumberGlobalMetadata(
        buildParameter({
          valueType: "integer",
          default: 1,
          restrictions: { min: 0, max: 3, allowed: null },
          ...overrides,
        })
      )
    ).toEqual(expect.any(String));
  });

  it("accepts persisted document-like metadata while keeping restrictions plain", () => {
    const parameter = Object.assign(Object.create({ persisted: true }), buildParameter());

    expect(validateNumberGlobalMetadata(parameter)).toBeNull();
  });
});

describe("numberGlobal generic resolver integration", () => {
  const buildModel = (parameter = buildParameter()) => ({
    name: "Demo",
    parameters: [parameter],
  });

  it("selects defaults before dispatch and preserves zero", () => {
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(),
        paramValues: {},
        criteriaNodes: [],
      })
    ).toEqual({ alpha: 0 });
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(),
        paramValues: { alpha: "0" },
        criteriaNodes: [],
      })
    ).toEqual({ alpha: 0 });
  });

  it("normalizes a supplied numeric string in final model parameters", () => {
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(),
        paramValues: { alpha: "-0.125" },
        criteriaNodes: [],
      })
    ).toEqual({ alpha: -0.125 });
  });

  it("keeps required, optional, and unknown-key behavior generic", () => {
    const requiredWithoutDefault = buildParameter();
    delete requiredWithoutDefault.default;
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(requiredWithoutDefault),
        paramValues: { alpha: "0.25" },
        criteriaNodes: [],
      })
    ).toEqual({ alpha: 0.25 });

    expect(() =>
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(requiredWithoutDefault),
        paramValues: {},
        criteriaNodes: [],
      })
    ).toThrow("alpha is required");

    const optionalWithoutDefault = buildParameter({ required: false });
    delete optionalWithoutDefault.default;
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(optionalWithoutDefault),
        paramValues: {},
        criteriaNodes: [],
      })
    ).toEqual({});

    expect(() =>
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(optionalWithoutDefault),
        paramValues: { alpha: "" },
        criteriaNodes: [],
      })
    ).toThrow("alpha cannot be empty");

    expect(() =>
      validateAndNormalizeModelParametersOrThrow({
        model: buildModel(),
        paramValues: { unknown: 1 },
        criteriaNodes: [],
      })
    ).toThrow("Unknown model parameters");
  });
});

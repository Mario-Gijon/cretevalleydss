import { describe, expect, it } from "vitest";

import { validateAndNormalizeSelectGlobal } from "../../../modules/decisionPlugins/modelParameters/structures/selectGlobal/validateAndNormalize.js";
import { validateSelectGlobalDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/selectGlobal/validateDefinition.js";

const buildParameter = (overrides = {}) => ({
  valueType: "number",
  restrictions: { allowed: [0, 0.5, 1] },
  default: 0,
  ...overrides,
});

describe("selectGlobal definition", () => {
  it.each([
    buildParameter(),
    buildParameter({ valueType: "integer", restrictions: { allowed: [0, 1] }, default: 0 }),
    buildParameter({ valueType: "boolean", restrictions: { allowed: [false, true] }, default: false }),
    buildParameter({ valueType: "string", restrictions: { allowed: ["1", "two"] }, default: "1" }),
  ])("accepts canonical definitions", (parameter) => {
    expect(validateSelectGlobalDefinition(parameter)).toBeNull();
  });

  it.each([
    { valueType: "enum" },
    { restrictions: null },
    { restrictions: {} },
    { restrictions: { allowed: [] } },
    { restrictions: { allowed: ["0"] } },
    { valueType: "integer", restrictions: { allowed: [0.5] } },
    { valueType: "string", restrictions: { allowed: [""] } },
    { default: "0" },
    { default: 2 },
  ])("rejects invalid consumed definition fields", (overrides) => {
    expect(validateSelectGlobalDefinition(buildParameter(overrides))).toEqual(expect.any(String));
  });

  it("allows required definitions without defaults", () => {
    const parameter = buildParameter({ required: true });
    delete parameter.default;
    expect(validateSelectGlobalDefinition(parameter)).toBeNull();
  });
});

describe("selectGlobal runtime", () => {
  it.each([
    ["number", [0, "0.5", "1e0"], [0, 0.5, 1]],
    ["integer", [4, "4"], [4, 4]],
    ["boolean", [false, " TRUE "], [false, true]],
    ["string", ["1", "exact value"], ["1", "exact value"]],
  ])("normalizes %s values", (valueType, values, expected) => {
    const allowed = expected;
    values.forEach((value, index) => {
      expect(
        validateAndNormalizeSelectGlobal({ value, parameter: { valueType, restrictions: { allowed } } })
      ).toEqual({ ok: true, value: expected[index] });
    });
  });

  it("rejects invalid, outside, and unsupported runtime values", () => {
    expect(validateAndNormalizeSelectGlobal({ value: "", parameter: { valueType: "number", restrictions: { allowed: [0] } } })).toMatchObject({ ok: false });
    expect(validateAndNormalizeSelectGlobal({ value: "4.5", parameter: { valueType: "integer", restrictions: { allowed: [4] } } })).toMatchObject({ ok: false });
    expect(validateAndNormalizeSelectGlobal({ value: "yes", parameter: { valueType: "boolean", restrictions: { allowed: [true] } } })).toMatchObject({ ok: false });
    expect(validateAndNormalizeSelectGlobal({ value: "other", parameter: { valueType: "string", restrictions: { allowed: ["exact"] } } })).toMatchObject({ ok: false });
    expect(validateAndNormalizeSelectGlobal({ value: "x", parameter: { valueType: "unknown", restrictions: { allowed: ["x"] } } })).toMatchObject({ ok: false });
  });
});

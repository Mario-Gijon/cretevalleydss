import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { validateAndNormalizeIntervalGlobal } from "../../../modules/decisionPlugins/modelParameters/structures/intervalGlobal/validateAndNormalize.js";
import { validateIntervalGlobalDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/intervalGlobal/validateDefinition.js";

const buildParameter = (overrides = {}) => ({
  restrictions: { min: 0, max: 1, ordered: "strictIncreasing" },
  default: [0.3, 0.8],
  ...overrides,
});

describe("intervalGlobal definition", () => {
  it.each([
    buildParameter(),
    buildParameter({ restrictions: { min: 0, max: 1, ordered: "nonDecreasing" }, default: [0.5, 0.5] }),
  ])("accepts canonical definitions", (parameter) => {
    expect(validateIntervalGlobalDefinition(parameter)).toBeNull();
  });

  it.each([
    { restrictions: null },
    { restrictions: { max: 1, ordered: "strictIncreasing" } },
    { restrictions: { min: 0, ordered: "strictIncreasing" } },
    { restrictions: { min: 0, max: 1 } },
    { restrictions: { min: 2, max: 1, ordered: "strictIncreasing" } },
    { restrictions: { min: 0, max: 1, ordered: "ascending" } },
    { default: [0.8, 0.3] },
    { default: [0.3] },
    { default: ["0.3", 0.8] },
  ])("rejects invalid consumed metadata", (overrides) => {
    expect(validateIntervalGlobalDefinition(buildParameter(overrides))).toEqual(expect.any(String));
  });

  it("allows required definitions without defaults", () => {
    const parameter = buildParameter({ required: true });
    delete parameter.default;
    expect(validateIntervalGlobalDefinition(parameter)).toBeNull();
  });
});

describe("intervalGlobal runtime", () => {
  it("normalizes numeric endpoint strings without requiring generic metadata", () => {
    expect(
      validateAndNormalizeIntervalGlobal({ value: ["1e-3", "0.999999"], parameter: { restrictions: { min: 0, max: 1, ordered: "strictIncreasing" } } })
    ).toEqual({ ok: true, value: [0.001, 0.999999] });
  });

  it.each([null, undefined, 1, {}, [], [1], [1, 2, 3], ["", 1], [true, 1], [0.8, 0.3]])(
    "rejects invalid runtime value %p",
    (value) => {
      expect(validateAndNormalizeIntervalGlobal({ value, parameter: buildParameter() })).toMatchObject({ ok: false });
    }
  );

  it("accepts equal endpoints only for non-decreasing intervals", () => {
    expect(validateAndNormalizeIntervalGlobal({ value: [0.5, 0.5], parameter: buildParameter() })).toMatchObject({ ok: false });
    expect(validateAndNormalizeIntervalGlobal({ value: [0.5, 0.5], parameter: buildParameter({ restrictions: { min: 0, max: 1, ordered: "nonDecreasing" } }) })).toEqual({ ok: true, value: [0.5, 0.5] });
  });
});

describe("intervalGlobal generic resolver integration", () => {
  it("dispatches the interval value through the registered runtime capability", () => {
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: {
          name: "Demo",
          parameters: [
            buildParameter({
              key: "agreement",
              parameterStructureKey: "intervalGlobal",
            }),
          ],
        },
        paramValues: { agreement: ["0.3", "0.8"] },
        criteriaNodes: [],
      })
    ).toEqual({ agreement: [0.3, 0.8] });
  });
});

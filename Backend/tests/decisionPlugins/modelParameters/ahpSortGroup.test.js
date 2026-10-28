import { describe, expect, it } from "vitest";

import { normalizeAHPSortGroupConfiguration } from "../../../modules/decisionPlugins/shared/ahpSortGroup.js";
import { ahpSortGroupParameterStructure } from "../../../modules/decisionPlugins/modelParameters/structures/ahpSortGroup/index.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { MODEL_PARAMETER_STRUCTURE_REGISTRY } from "../../../modules/decisionPlugins/modelParameters/parameterStructureRegistry.js";

const parameter = {
  key: "ahpSortGroup",
  label: "Group tie policy",
  parameterStructureKey: "ahpSortGroup",
  required: false,
};

describe("AHPSort I group parameter", () => {
  it("registers its own object structure, distinct from central-profile policy", () => {
    expect(MODEL_PARAMETER_STRUCTURE_REGISTRY.get("ahpSortGroup")).toBe(
      ahpSortGroupParameterStructure
    );
    expect(normalizeAHPSortGroupConfiguration({ tiePolicy: "optimistic" })).toEqual({
      value: { tiePolicy: "optimistic" },
    });
  });

  it.each(["optimistic", "pessimistic"])("accepts the %s policy through model parameter validation", (tiePolicy) => {
    expect(validateAndNormalizeModelParametersOrThrow({
      model: { name: "AHPSort I", parameters: [parameter] },
      paramValues: { ahpSortGroup: { tiePolicy } },
      criteriaNodes: [],
      alternatives: [],
    })).toEqual({ ahpSortGroup: { tiePolicy } });
  });

  it.each([
    null,
    [],
    { tiePolicy: "unknown" },
    { tiePolicy: "optimistic", extra: true },
    { tiePolicy: "pessimistic", tieBreak: "other" },
  ])("rejects invalid group policy values: %j", (value) => {
    expect(() => validateAndNormalizeModelParametersOrThrow({
      model: { name: "AHPSort I", parameters: [parameter] },
      paramValues: { ahpSortGroup: value },
      criteriaNodes: [],
      alternatives: [],
    })).toThrow(/ahpSortGroup/);
  });

  it("keeps group policy optional and forbids a silent default", () => {
    expect(ahpSortGroupParameterStructure.validateDefinition(parameter)).toBeNull();
    expect(ahpSortGroupParameterStructure.validateDefinition({
      ...parameter,
      default: { tiePolicy: "optimistic" },
    })).toMatch(/must not define a default/);
    expect(ahpSortGroupParameterStructure.validateDefinition({
      ...parameter,
      required: true,
    })).toMatch(/must be optional/);
  });
});

import { describe, expect, it } from "vitest";

import {
  MODEL_PARAMETER_STRUCTURE_REGISTRY,
} from "../../../modules/decisionPlugins/modelParameters/parameterStructureRegistry.js";

describe("model parameter structure registry", () => {
  it("keeps complete structure objects and supports optional definition validators", () => {
    const numberGlobal = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("numberGlobal");
    const selectGlobal = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("selectGlobal");
    const intervalGlobal = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("intervalGlobal");
    const numberCriterion = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("numberCriterion");
    const selectCriterion = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("selectCriterion");

    expect(numberGlobal).toMatchObject({
      key: "numberGlobal",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(selectGlobal).toMatchObject({
      key: "selectGlobal",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(intervalGlobal).toMatchObject({
      key: "intervalGlobal",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(numberCriterion).toMatchObject({
      key: "numberCriterion",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(selectCriterion).toMatchObject({
      key: "selectCriterion",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
  });
});

import { describe, expect, it } from "vitest";

import { remapCriterionKeyedParameterValueOrThrow } from "../../../modules/decisionPlugins/modelParameters/criterionParameterRemapping.js";
import { remapModelParametersCriterionIdsOrThrow } from "../../../modules/modelParameters/remapModelParametersCriterionIds.js";

const criterionParameters = [
  {
    key: "threshold",
    parameterStructureKey: "numberCriterion",
    required: true,
    restrictions: { min: 0, max: 1 },
  },
  {
    key: "preference",
    parameterStructureKey: "selectCriterion",
    valueType: "string",
    required: true,
    restrictions: { allowed: ["t1", "t2"] },
  },
  {
    key: "iterations",
    parameterStructureKey: "numberGlobal",
    valueType: "integer",
    required: true,
    restrictions: { min: 1, max: null, allowed: null },
  },
];

const criterionIdMappings = [
  { sourceCriterionId: "temporary-quality", persistedCriterionId: "mongo-quality" },
  { sourceCriterionId: "temporary-cost", persistedCriterionId: "mongo-cost" },
];

const persistedLeafCriteria = [
  { _id: "mongo-cost", name: "Cost" },
  { _id: "mongo-quality", name: "Quality" },
];

describe("criterion-keyed model parameter remapping", () => {
  it("uses structure-declared remappers and preserves non-reference parameters", () => {
    const normalized = remapModelParametersCriterionIdsOrThrow({
      model: { name: "Demo", parameters: criterionParameters },
      modelParameters: {
        threshold: { "temporary-quality": 0.2, "temporary-cost": 0.1 },
        preference: { "temporary-quality": "t2", "temporary-cost": "t1" },
        iterations: 5,
      },
      criterionIdMappings,
      persistedLeafCriteria,
    });

    expect(normalized).toEqual({
      threshold: { "mongo-quality": 0.2, "mongo-cost": 0.1 },
      preference: { "mongo-quality": "t2", "mongo-cost": "t1" },
      iterations: 5,
    });
  });

  it("rejects duplicate source identities before remapping", () => {
    expect(() => remapModelParametersCriterionIdsOrThrow({
      model: { name: "Demo", parameters: criterionParameters.slice(0, 1) },
      modelParameters: { threshold: { "temporary-quality": 0.2, "temporary-cost": 0.1 } },
      criterionIdMappings: [
        ...criterionIdMappings,
        { sourceCriterionId: "temporary-quality", persistedCriterionId: "mongo-duplicate" },
      ],
      persistedLeafCriteria,
    })).toThrow("is duplicated and cannot be remapped");
  });

  it("rejects unknown, duplicate, and missing criterion references", () => {
    const criterionIdMap = new Map(criterionIdMappings.map(({ sourceCriterionId, persistedCriterionId }) => [sourceCriterionId, persistedCriterionId]));
    const parameter = { key: "threshold" };

    expect(() => remapCriterionKeyedParameterValueOrThrow({
      value: { "removed-criterion": 0.1 },
      criterionIdMap,
      parameter,
    })).toThrow("unknown or unremappable criterion");

    expect(() => remapCriterionKeyedParameterValueOrThrow({
      value: { "temporary-quality": 0.1, " temporary-quality ": 0.2 },
      criterionIdMap,
      parameter,
    })).toThrow("duplicate criterion references");

    expect(() => remapModelParametersCriterionIdsOrThrow({
      model: { name: "Demo", parameters: criterionParameters.slice(0, 1) },
      modelParameters: { threshold: { "temporary-cost": 0.1 } },
      criterionIdMappings,
      persistedLeafCriteria,
    })).toThrow("is missing value for criterion 'mongo-quality'");
  });

  it("rejects a reference when its criterion has no client identity to map", () => {
    expect(() => remapModelParametersCriterionIdsOrThrow({
      model: { name: "Demo", parameters: criterionParameters.slice(0, 1) },
      modelParameters: { threshold: { "temporary-quality": 0.1 } },
      criterionIdMappings: [
        { sourceCriterionId: null, persistedCriterionId: "mongo-quality" },
      ],
      persistedLeafCriteria: [{ _id: "mongo-quality", name: "Quality" }],
    })).toThrow("unknown or unremappable criterion");
  });
});

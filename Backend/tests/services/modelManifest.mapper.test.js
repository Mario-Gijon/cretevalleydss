import { describe, expect, it } from "vitest";

import {
  normalizeParameter,
  validateSyncableManifestModel,
} from "../../services/modelApi/modelManifest.mapper.js";

const buildManifest = (parameters) => ({
  apiModelKey: "demo_model",
  displayName: "Demo model",
  apiEndpoint: { path: "/models/demo" },
  modelKind: "issue",
  evaluationStructureKey: "alternativeCriteriaMatrix",
  implementationStatus: "ready",
  publicUsable: true,
  isMultiCriteria: true,
  usesCriteriaWeights: false,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  supportsConsensusSimulation: false,
  parameters,
});

const buildNumberGlobal = (overrides = {}) => ({
  key: "alpha",
  label: "Alpha",
  parameterStructureKey: "numberGlobal",
  required: true,
  scope: "global",
  valueType: "number",
  restrictions: { min: 0, max: 1, allowed: null },
  default: 0.5,
  ...overrides,
});

describe("model manifest parameter mapping", () => {
  it("preserves every canonical numberGlobal metadata field", () => {
    expect(
      normalizeParameter({
        key: "iterations",
        label: "Iterations",
        valueType: "integer",
        scope: "global",
        parameterStructureKey: "numberGlobal",
        required: true,
        default: 1000,
        restrictions: {
          min: 1,
          max: null,
          allowed: null,
        },
      })
    ).toMatchObject({
      key: "iterations",
      label: "Iterations",
      valueType: "integer",
      scope: "global",
      parameterStructureKey: "numberGlobal",
      required: true,
      default: 1000,
      restrictions: {
        min: 1,
        max: null,
        allowed: null,
      },
    });
  });

  it("preserves default omission independently of parameter structure", () => {
    const normalized = normalizeParameter({
      key: "optionalAlpha",
      label: "Optional alpha",
      valueType: "number",
      scope: "global",
      parameterStructureKey: "selectGlobal",
      required: false,
      restrictions: {
        min: null,
        max: null,
        allowed: null,
      },
    });

    expect(normalized).not.toHaveProperty("default");
  });

  it("omits an undefined source default while preserving JSON-compatible values", () => {
    expect(
      normalizeParameter({
        key: "alpha",
        label: "Alpha",
        parameterStructureKey: "selectGlobal",
        default: undefined,
      })
    ).not.toHaveProperty("default");

    expect(
      normalizeParameter({
        key: "choice",
        label: "Choice",
        parameterStructureKey: "selectGlobal",
        default: null,
      })
    ).toHaveProperty("default", null);
  });
});

describe("syncable manifest parameter definitions", () => {
  it("accepts canonical numberGlobal definitions, including required defaults omitted", () => {
    const withoutDefault = buildNumberGlobal();
    delete withoutDefault.default;

    expect(validateSyncableManifestModel(buildManifest([withoutDefault]))).toEqual([]);
  });

  it.each([
    ["number", [0, 1], 0],
    ["integer", [0, 1], 0],
    ["boolean", [false, true], false],
    ["string", ["1", "two"], "1"],
  ])("validates canonical selectGlobal %s definitions", (valueType, allowed, defaultValue) => {
    expect(
      validateSyncableManifestModel(
        buildManifest([
          {
            key: "choice",
            label: "Choice",
            parameterStructureKey: "selectGlobal",
            required: true,
            scope: "global",
            valueType,
            default: defaultValue,
            restrictions: { allowed },
          },
        ])
      )
    ).toEqual([]);
  });

  it.each([
    ["invalid valueType", { valueType: "decimal" }],
    ["invalid restrictions", { restrictions: { min: "0", max: 1, allowed: null } }],
    ["reversed range", { restrictions: { min: 2, max: 1, allowed: null } }],
    [
      "invalid integer restriction",
      { valueType: "integer", restrictions: { min: 0.5, max: 1, allowed: null } },
    ],
    ["invalid default", { default: "0.5" }],
  ])("rejects %s at the manifest boundary", (_label, overrides) => {
    expect(
      validateSyncableManifestModel(buildManifest([buildNumberGlobal(overrides)]))
    ).toEqual([expect.stringContaining("parameters[0] (alpha):")]);
  });

  it("reports generic parameter errors and unknown structures", () => {
    expect(
      validateSyncableManifestModel(
        buildManifest([
          buildNumberGlobal({ key: "", label: "", required: "yes" }),
          buildNumberGlobal({ parameterStructureKey: "missingStructure" }),
          buildNumberGlobal(),
        ])
      )
    ).toEqual(
      expect.arrayContaining([
        "parameters[0].key",
        "parameters[0].label",
        "parameters[0].required",
        "parameters[1] (alpha).parameterStructureKey (unknown: missingStructure)",
        "parameters[2].key (duplicate: alpha)",
      ])
    );
  });
});

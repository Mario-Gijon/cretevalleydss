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
  valueType: "number",
  restrictions: { min: 0, max: 1, allowed: null },
  default: 0.5,
  ...overrides,
});

const buildIntervalGlobal = (overrides = {}) => ({
  key: "agreement",
  label: "Agreement interval",
  parameterStructureKey: "intervalGlobal",
  required: true,
  default: [0.3, 0.8],
  restrictions: { min: 0, max: 1, ordered: "strictIncreasing" },
  ...overrides,
});

const buildNumberCriterion = (overrides = {}) => ({
  key: "threshold",
  label: "Threshold",
  parameterStructureKey: "numberCriterion",
  required: true,
  default: 0,
  restrictions: { min: 0, max: 1 },
  ...overrides,
});

describe("model manifest parameter mapping", () => {
  it("preserves every canonical numberGlobal metadata field", () => {
    expect(
      normalizeParameter({
        key: "iterations",
        label: "Iterations",
        valueType: "integer",
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

  it("dispatches intervalGlobal metadata through the registered definition validator", () => {
    expect(
      validateSyncableManifestModel(buildManifest([buildIntervalGlobal()]))
    ).toEqual([]);
    expect(
      validateSyncableManifestModel(
        buildManifest([buildIntervalGlobal({ default: [0.8, 0.3] })])
      )
    ).toEqual([
      expect.stringContaining("parameters[0] (agreement): default must satisfy ordered rule"),
    ]);
  });

  it.each([
    buildNumberCriterion(),
    buildNumberCriterion({ default: -0.125, restrictions: { min: -1, max: null } }),
    (() => {
      const parameter = buildNumberCriterion();
      delete parameter.default;
      return parameter;
    })(),
  ])("dispatches canonical numberCriterion metadata", (parameter) => {
    expect(validateSyncableManifestModel(buildManifest([parameter]))).toEqual([]);
  });

  it.each([
    { restrictions: { max: 1 } },
    { restrictions: { min: 0 } },
    { restrictions: { min: "0", max: 1 } },
    { restrictions: { min: 2, max: 1 } },
    { default: "0" },
    { default: 2 },
  ])("rejects invalid numberCriterion consumed metadata", (overrides) => {
    expect(
      validateSyncableManifestModel(buildManifest([buildNumberCriterion(overrides)]))
    ).toEqual([expect.stringContaining("parameters[0] (threshold):")]);
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

  it("rejects obsolete scope metadata and does not project it", () => {
    expect(normalizeParameter({ key: "alpha", scope: "global" })).not.toHaveProperty("scope");
    expect(
      validateSyncableManifestModel(
        buildManifest([buildNumberGlobal({ scope: "global" })])
      )
    ).toEqual([
      "parameters[0] (alpha): scope is not supported; parameterStructureKey defines the parameter structure",
    ]);
  });
});

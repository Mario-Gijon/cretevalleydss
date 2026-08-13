import { describe, expect, it } from "vitest";

import {
  buildParameterRowPayloadOrThrow,
  buildNewParameterStructureRequestsOrThrow,
  buildConstraintTemplateObjectOrThrow,
  buildSupportedExpressionDomainsPayloadOrThrow,
  getParameterStructureSelectionError,
  PARAMETER_STRUCTURE_MODES,
} from "../../../src/features/admin/modelForge/scaffoldPayloadHelpers.js";

describe("numberGlobal Model Forge parameter payload", () => {
  const buildRow = (overrides = {}) => ({
    key: "iterations",
    label: "Iterations",
    parameterStructureKey: "numberGlobal",
    valueType: "integer",
    required: true,
    defaultMode: "literal",
    defaultLiteralText: "10",
    restrictionsMode: "minMax",
    restrictionsMinText: "1",
    restrictionsMaxText: "100",
    advancedJsonText: "",
    ...overrides,
  });

  it("emits explicit canonical numberGlobal metadata", () => {
    expect(buildParameterRowPayloadOrThrow(buildRow(), 0)).toEqual({
      key: "iterations",
      label: "Iterations",
      parameterStructureKey: "numberGlobal",
      valueType: "integer",
      required: true,
      default: 10,
      restrictions: {
        min: 1,
        max: 100,
        allowed: null,
      },
    });
  });

  it("rejects decimal integer defaults without truncating them", () => {
    expect(() =>
      buildParameterRowPayloadOrThrow(
        buildRow({ defaultLiteralText: "4.5" }),
        0
      )
    ).toThrow("integer default must be an integer");
  });

  it.each([
    ["required number", { valueType: "number", required: true }],
    ["required integer", { valueType: "integer", required: true }],
    ["optional number", { valueType: "number", required: false }],
  ])("omits the default for a %s when no default is selected", (_label, overrides) => {
    const payload = buildParameterRowPayloadOrThrow(
      buildRow({ defaultMode: "null", ...overrides }),
      0
    );

    expect(payload).not.toHaveProperty("default");
  });

  it("omits a blank numberGlobal default input", () => {
    const payload = buildParameterRowPayloadOrThrow(
      buildRow({ defaultLiteralText: "   " }),
      0
    );

    expect(payload).not.toHaveProperty("default");
  });
});

describe("selectGlobal Model Forge parameter payload", () => {
  const buildRow = (overrides = {}) => ({
    key: "choice",
    label: "Choice",
    parameterStructureKey: "selectGlobal",
    valueType: "boolean",
    required: true,
    defaultMode: "literal",
    defaultLiteralText: "false",
    restrictionsOptionsText: "true, false",
    ...overrides,
  });

  it("preserves typed allowed values and false defaults", () => {
    expect(buildParameterRowPayloadOrThrow(buildRow(), 0)).toEqual({
      key: "choice",
      label: "Choice",
      parameterStructureKey: "selectGlobal",
      required: true,
      valueType: "boolean",
      default: false,
      restrictions: { allowed: [true, false] },
    });
  });

  it("preserves numeric-looking string options and omits blank defaults", () => {
    const payload = buildParameterRowPayloadOrThrow(
      buildRow({
        valueType: "string",
        defaultLiteralText: "",
        restrictionsOptionsText: "1, 0.5",
      }),
      0
    );

    expect(payload).toMatchObject({ restrictions: { allowed: ["1", "0.5"] } });
    expect(payload).not.toHaveProperty("default");
  });
});

describe("parameter structure selection", () => {
  const catalog = [
    { key: "selectGlobal", status: "ready", implementationStatus: "ready", available: true },
    { key: "scaffoldStructure", status: "ready", implementationStatus: "scaffold", available: false },
    { key: "partialStructure", status: "partial", implementationStatus: "ready", available: false },
    { key: "invalidStructure", status: "ready", implementationStatus: "invalid", available: false },
  ];
  const row = (overrides = {}) => ({
    parameterStructureMode: PARAMETER_STRUCTURE_MODES.EXISTING,
    parameterStructureKey: "selectGlobal",
    ...overrides,
  });

  it("accepts only runtime-ready existing structures", () => {
    expect(getParameterStructureSelectionError(row(), catalog)).toBe("");
    expect(getParameterStructureSelectionError(row({ parameterStructureKey: "unknown" }), catalog)).toContain("does not exist");
    expect(getParameterStructureSelectionError(row({ parameterStructureKey: "scaffoldStructure" }), catalog)).toContain("not runtime-ready");
    expect(getParameterStructureSelectionError(row({ parameterStructureKey: "partialStructure" }), catalog)).toContain("not runtime-ready");
    expect(getParameterStructureSelectionError(row({ parameterStructureKey: "invalidStructure" }), catalog)).toContain("not runtime-ready");
  });

  it("allows new non-conflicting keys and rejects every catalog collision", () => {
    expect(getParameterStructureSelectionError(row({ parameterStructureMode: "new", parameterStructureKey: "numberAlternative" }), catalog)).toBe("");
    ["selectGlobal", "scaffoldStructure", "partialStructure"].forEach((key) => {
      expect(getParameterStructureSelectionError(row({ parameterStructureMode: "new", parameterStructureKey: key }), catalog)).toContain("already exists");
    });
  });

  it("builds requests only for deduplicated new structure selections", () => {
    expect(buildNewParameterStructureRequestsOrThrow([
      row({ parameterStructureKey: "selectGlobal" }),
      row({ parameterStructureMode: "new", parameterStructureKey: "numberAlternative" }),
      row({ parameterStructureMode: "new", parameterStructureKey: "numberAlternative" }),
    ], catalog)).toEqual([{ parameterStructureKey: "numberAlternative" }]);
  });
});

describe("buildSupportedExpressionDomainsPayloadOrThrow", () => {
  it("emits empty restrictions for empty numeric controls", () => {
    expect(
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "numericContinuous",
          compatibilityConstraints: {
            min: "",
            max: "",
          },
        },
      ])
    ).toEqual([
      {
        typeKey: "numericContinuous",
        constraints: {},
      },
    ]);
  });

  it("normalizes numeric and discrete compatibility restrictions", () => {
    expect(
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "numericDiscrete",
          compatibilityConstraints: { min: "1", max: "5.5", step: "0.5" },
        },
      ])
    ).toEqual([
      {
        typeKey: "numericDiscrete",
        constraints: {
          min: 1,
          max: 5.5,
          step: 0.5,
        },
      },
    ]);
  });

  it("rejects invalid numeric ranges and discrete steps", () => {
    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "numericContinuous",
          compatibilityConstraints: { min: "2", max: "2" },
        },
      ])
    ).toThrow("Minimum must be strictly less than Maximum");

    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "numericDiscrete",
          compatibilityConstraints: { step: "0" },
        },
      ])
    ).toThrow("Step must be greater than 0");
  });

  it("normalizes linguistic lists and membership-function selections", () => {
    expect(
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguisticOrdinal",
          compatibilityConstraints: { labelCount: "3, 5, 3" },
        },
        {
          typeKey: "linguisticFuzzy",
          compatibilityConstraints: {
            membershipFunction: ["triangular", "triangular", "hexagonal"],
            labelCount: "5, 7",
          },
        },
      ])
    ).toEqual([
      { typeKey: "linguisticOrdinal", constraints: { labelCount: [3, 5] } },
      {
        typeKey: "linguisticFuzzy",
        constraints: {
          membershipFunction: ["triangular", "hexagonal"],
          labelCount: [5, 7],
        },
      },
    ]);
  });

  it("rejects invalid linguistic list tokens and 2-tuple counts", () => {
    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguisticOrdinal",
          compatibilityConstraints: { labelCount: "3, nope" },
        },
      ])
    ).toThrow("Allowed label counts must be a comma-separated list of integers");

    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguistic2Tuple",
          compatibilityConstraints: { labelCount: "2, 4" },
        },
      ])
    ).toThrow("Allowed label counts values must be at least 3");

    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguistic2Tuple",
          compatibilityConstraints: { labelCount: "4" },
        },
      ])
    ).toThrow("Allowed label counts values must be odd");
  });
});

describe("buildConstraintTemplateObjectOrThrow", () => {
  it("builds nested null-template objects", () => {
    expect(
      buildConstraintTemplateObjectOrThrow([
        {
          id: "label-count",
          key: "labelCount",
          children: [],
        },
        {
          id: "alpha-range",
          key: "alphaRange",
          children: [
            {
              id: "alpha-min",
              key: "min",
              children: [],
            },
            {
              id: "alpha-max",
              key: "max",
              children: [],
            },
          ],
        },
      ])
    ).toEqual({
      labelCount: null,
      alphaRange: {
        min: null,
        max: null,
      },
    });
  });
});

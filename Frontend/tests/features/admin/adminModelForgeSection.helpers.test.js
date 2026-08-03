import { describe, expect, it } from "vitest";

import { stripNullConstraintPlaceholders } from "../../../src/features/admin/modelForge/constraintTemplates.js";
import {
  buildParameterRowPayloadOrThrow,
  buildConstraintTemplateObjectOrThrow,
  buildSupportedExpressionDomainsPayloadOrThrow,
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

describe("stripNullConstraintPlaceholders", () => {
  it("strips top-level null placeholders", () => {
    expect(
      stripNullConstraintPlaceholders({
        labelCount: null,
      })
    ).toEqual({});
  });

  it("strips nested null placeholders", () => {
    expect(
      stripNullConstraintPlaceholders({
        alphaRange: {
          min: null,
          max: null,
        },
      })
    ).toEqual({});
  });

  it("preserves filled nested values while dropping null siblings", () => {
    expect(
      stripNullConstraintPlaceholders({
        labelCount: null,
        alphaRange: {
          min: -0.5,
          max: 0.5,
        },
      })
    ).toEqual({
      alphaRange: {
        min: -0.5,
        max: 0.5,
      },
    });
  });

  it("returns an empty object when every nested value is omitted", () => {
    expect(
      stripNullConstraintPlaceholders({
        outer: {
          inner: null,
        },
      })
    ).toEqual({});
  });
});

describe("buildSupportedExpressionDomainsPayloadOrThrow", () => {
  it("strips null placeholders from supported expression domain constraints", () => {
    expect(
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguisticTwoTupleScale",
          constraintsJsonText: JSON.stringify({
            labelCount: null,
          }),
        },
      ])
    ).toEqual([
      {
        typeKey: "linguisticTwoTupleScale",
        constraints: {},
      },
    ]);
  });

  it("preserves nested filled constraints while dropping null placeholders", () => {
    expect(
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguisticTwoTupleScale",
          constraintsJsonText: JSON.stringify({
            labelCount: null,
            alphaRange: {
              min: -0.5,
              max: 0.5,
            },
          }),
        },
      ])
    ).toEqual([
      {
        typeKey: "linguisticTwoTupleScale",
        constraints: {
          alphaRange: {
            min: -0.5,
            max: 0.5,
          },
        },
      },
    ]);
  });

  it("throws when constraints JSON is invalid", () => {
    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguisticTwoTupleScale",
          constraintsJsonText: "{bad json}",
        },
      ])
    ).toThrow("linguisticTwoTupleScale constraints must be valid JSON");
  });

  it("throws when constraints JSON is not an object", () => {
    expect(() =>
      buildSupportedExpressionDomainsPayloadOrThrow([
        {
          typeKey: "linguisticTwoTupleScale",
          constraintsJsonText: "[]",
        },
      ])
    ).toThrow("linguisticTwoTupleScale constraints must be a JSON object");
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

import { describe, expect, it } from "vitest";

import { stripNullConstraintPlaceholders } from "../../../src/features/admin/modelForge/constraintTemplates.js";
import {
  buildConstraintTemplateObjectOrThrow,
  buildSupportedExpressionDomainsPayloadOrThrow,
} from "../../../src/features/admin/modelForge/scaffoldPayloadHelpers.js";

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

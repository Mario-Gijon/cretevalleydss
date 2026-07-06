import { describe, expect, it } from "vitest";

import { stripNullConstraintPlaceholders } from "../../../src/features/admin/modelForge/constraintTemplates.js";

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

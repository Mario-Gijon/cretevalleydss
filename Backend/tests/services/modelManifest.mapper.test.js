import { describe, expect, it } from "vitest";

import { normalizeParameter } from "../../services/modelApi/modelManifest.mapper.js";

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

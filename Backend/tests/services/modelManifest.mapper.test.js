import { describe, expect, it } from "vitest";

import { normalizeParameter } from "../../services/modelApi/modelManifest.mapper.js";

describe("model manifest numberGlobal mapping", () => {
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

  it("preserves omission of a genuinely optional default", () => {
    const normalized = normalizeParameter({
      key: "optionalAlpha",
      label: "Optional alpha",
      valueType: "number",
      scope: "global",
      parameterStructureKey: "numberGlobal",
      required: false,
      restrictions: {
        min: null,
        max: null,
        allowed: null,
      },
    });

    expect(normalized).not.toHaveProperty("default");
  });
});

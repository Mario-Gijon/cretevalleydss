import { describe, expect, it } from "vitest";

import {
  PARAMETER_FIELD_REGISTRY,
  resolveParameterField,
  resolveParameterFieldEntry,
} from "../../../src/features/decisionPlugins/modelParameters";

describe("model-parameter Decision Plugin public registry", () => {
  it("exposes every discovered field through the public resolver", () => {
    const registeredEntries = Object.entries(PARAMETER_FIELD_REGISTRY);

    expect(Object.isFrozen(PARAMETER_FIELD_REGISTRY)).toBe(true);
    expect(registeredEntries.length).toBeGreaterThan(0);

    registeredEntries.forEach(([key, entry]) => {
      const parameter = {
        key: `parameter-${key}`,
        parameterStructureKey: key,
      };

      expect(entry.key).toBe(key);
      expect(entry.FieldComponent).toBeTruthy();
      expect(entry.ReadOnlyComponent).toBeTruthy();
      expect(resolveParameterFieldEntry(parameter)).toBe(entry);
      expect(resolveParameterField(parameter)).toBe(entry.FieldComponent);
    });
  });

  it("rejects missing and unknown parameter structures at the registry boundary", () => {
    expect(() => resolveParameterFieldEntry({ key: "alpha" })).toThrow(
      'Missing parameterStructureKey for parameter "alpha".'
    );
    expect(() =>
      resolveParameterFieldEntry({
        key: "alpha",
        parameterStructureKey: "future-unregistered-field",
      })
    ).toThrow(
      'Unsupported parameterStructureKey "future-unregistered-field" for parameter "alpha".'
    );
  });
});

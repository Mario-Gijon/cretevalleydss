import { describe, expect, it } from "vitest";

import {
  PARAMETER_FIELD_REGISTRY,
  resolveParameterFieldEntry,
} from "../../../src/features/decisionPlugins/modelParameters";
import {
  buildParameterFieldRegistry,
  resolveParameterFieldEntryFromRegistry,
} from "../../../src/features/decisionPlugins/modelParameters/modelParameterRegistry.js";

describe("model-parameter Decision Plugin public registry", () => {
  const FieldComponent = () => null;
  const ReadOnlyComponent = () => null;
  const buildModules = (entries) =>
    Object.fromEntries(
      entries.map(({ folderName, entry }) => [
        `./fields/${folderName}/index.js`,
        { entry },
      ])
    );

  it("exposes every discovered field through the public entry resolver", () => {
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

  it("dispatches numberGlobal through its canonical registry entry", () => {
    const entry = resolveParameterFieldEntry({
      key: "alpha",
      parameterStructureKey: "numberGlobal",
    });

    expect(entry).toBe(PARAMETER_FIELD_REGISTRY.numberGlobal);
    expect(entry.FieldComponent).toBeTruthy();
    expect(entry.ReadOnlyComponent).toBeTruthy();
  });

  it("dispatches selectGlobal through its canonical registry entry", () => {
    const entry = resolveParameterFieldEntry({
      key: "choice",
      parameterStructureKey: "selectGlobal",
    });

    expect(entry).toBe(PARAMETER_FIELD_REGISTRY.selectGlobal);
    expect(entry.FieldComponent).toBeTruthy();
    expect(entry.ReadOnlyComponent).toBeTruthy();
  });

  it("registers legacy and ready entries but omits scaffold entries", () => {
    const registry = buildParameterFieldRegistry(
      buildModules([
        {
          folderName: "legacy",
          entry: { key: "legacy", FieldComponent, ReadOnlyComponent },
        },
        {
          folderName: "ready",
          entry: {
            key: "ready",
            implementationStatus: "ready",
            FieldComponent,
            ReadOnlyComponent,
          },
        },
        {
          folderName: "scaffold",
          entry: {
            key: "scaffold",
            implementationStatus: "scaffold",
            FieldComponent,
            ReadOnlyComponent,
          },
        },
      ])
    );

    expect(registry.legacy).toBeDefined();
    expect(registry.ready).toBeDefined();
    expect(registry.scaffold).toBeUndefined();
    expect(() =>
      resolveParameterFieldEntryFromRegistry(registry, {
        key: "alpha",
        parameterStructureKey: "scaffold",
      })
    ).toThrow('Unsupported parameterStructureKey "scaffold" for parameter "alpha".');
  });

  it("rejects unknown statuses, malformed scaffolds, and folder-name mismatches", () => {
    expect(() =>
      buildParameterFieldRegistry(
        buildModules([
          {
            folderName: "invalid",
            entry: {
              key: "invalid",
              implementationStatus: "done",
              FieldComponent,
              ReadOnlyComponent,
            },
          },
        ])
      )
    ).toThrow('implementationStatus must be "ready" or "scaffold" when provided');

    expect(() =>
      buildParameterFieldRegistry(
        buildModules([
          {
            folderName: "malformedScaffold",
            entry: {
              key: "malformedScaffold",
              implementationStatus: "scaffold",
              FieldComponent,
            },
          },
        ])
      )
    ).toThrow("must export exactly one valid parameter field entry");

    expect(() =>
      buildParameterFieldRegistry(
        buildModules([
          {
            folderName: "folderName",
            entry: {
              key: "differentKey",
              implementationStatus: "ready",
              FieldComponent,
              ReadOnlyComponent,
            },
          },
        ])
      )
    ).toThrow("must match folder name");
  });
});

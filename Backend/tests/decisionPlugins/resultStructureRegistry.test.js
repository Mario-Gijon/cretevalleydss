import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  RESULT_STRUCTURE_REGISTRY,
  buildResultStructureRegistry,
  getResultStructureOrThrow,
  isResultStructureCapabilityEnabled,
  loadResultStructures,
} from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { resolveResultStructureMetadata } from "../../modules/decisionPlugins/resultStructureMetadata.js";

const temporaryRoots = [];

const createTemporaryStructuresRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crete-result-structures-"));
  temporaryRoots.push(root);
  return root;
};

const pluginSource = ({
  key,
  version,
  status,
  exportName = "resultStructure",
  includeNormalizer = true,
}) => {
  const normalizer = includeNormalizer
    ? ", validateAndNormalize: () => ({ accepted: true })"
    : "";
  const implementationStatus =
    status === undefined
      ? ""
      : `, implementationStatus: ${JSON.stringify(status)}`;

  return `export const ${exportName} = { key: ${JSON.stringify(key)}, version: ${JSON.stringify(version)}${normalizer}${implementationStatus} };\n`;
};

const writeResultStructure = ({
  root,
  keyFolder,
  versionFolder,
  ...plugin
}) => {
  const directory = path.join(root, keyFolder, versionFolder);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "index.js"),
    pluginSource(plugin),
    "utf8"
  );
};

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) =>
    fs.rmSync(root, { recursive: true, force: true })
  );
});

describe("result structure registry", () => {
  it("discovers ranking by key and version", () => {
    const ranking = getResultStructureOrThrow("ranking", 1);

    expect(RESULT_STRUCTURE_REGISTRY.get("ranking").get(1)).toBe(ranking);
    expect(ranking).toMatchObject({
      key: "ranking",
      version: 1,
      implementationStatus: "ready",
      validateAndNormalize: expect.any(Function),
    });
  });

  it("defaults capabilities for existing structures and honors explicit plugin restrictions", () => {
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      capability: "issueExecution",
    })).toBe(true);
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "issueExecution",
    })).toBe(true);
    expect(isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "consensus",
    })).toBe(false);
  });

  it("supports multiple registered versions for a key", async () => {
    const root = createTemporaryStructuresRoot();
    writeResultStructure({
      root,
      keyFolder: "ranking",
      versionFolder: "1",
      key: "ranking",
      version: 1,
    });
    writeResultStructure({
      root,
      keyFolder: "ranking",
      versionFolder: "2",
      key: "ranking",
      version: 2,
    });

    const registry = await loadResultStructures({ structuresRoot: root });

    expect(registry.get("ranking").get(1)).toBeDefined();
    expect(registry.get("ranking").get(2)).toBeDefined();
  });

  it("rejects duplicate key and version registrations", () => {
    const plugin = {
      key: "ranking",
      version: 1,
      validateAndNormalize: () => ({}),
    };

    expect(() => buildResultStructureRegistry([plugin, plugin])).toThrow(
      "Duplicate result structure key/version detected: ranking@1"
    );
  });

  it.each([0, -1, 1.5, true, "1"])(
    "rejects invalid plugin version %j",
    (version) => {
      expect(() =>
        buildResultStructureRegistry([
          { key: "ranking", version, validateAndNormalize: () => ({}) },
        ])
      ).toThrow("positive integer version");
    }
  );

  it("omits well-formed scaffolds from lookup", () => {
    const registry = buildResultStructureRegistry([
      {
        key: "sorting",
        version: 1,
        implementationStatus: "scaffold",
        validateAndNormalize: () => ({ ok: true }),
      },
    ]);

    expect(registry.has("sorting")).toBe(false);
  });

  it("rejects incomplete plugins, including incomplete scaffolds", () => {
    expect(() =>
      buildResultStructureRegistry([
        {
          key: "sorting",
          version: 1,
          implementationStatus: "scaffold",
        },
      ])
    ).toThrow("validateAndNormalize function");
  });

  it("rejects malformed status, key and version folder mismatches", async () => {
    const badStatusRoot = createTemporaryStructuresRoot();
    writeResultStructure({
      root: badStatusRoot,
      keyFolder: "ranking",
      versionFolder: "1",
      key: "ranking",
      version: 1,
      status: "draft",
    });
    await expect(
      loadResultStructures({ structuresRoot: badStatusRoot })
    ).rejects.toThrow('implementationStatus must be "ready" or "scaffold"');

    const badKeyRoot = createTemporaryStructuresRoot();
    writeResultStructure({
      root: badKeyRoot,
      keyFolder: "ranking",
      versionFolder: "1",
      key: "sorting",
      version: 1,
    });
    await expect(
      loadResultStructures({ structuresRoot: badKeyRoot })
    ).rejects.toThrow("must match folder name 'ranking'");

    const badVersionRoot = createTemporaryStructuresRoot();
    writeResultStructure({
      root: badVersionRoot,
      keyFolder: "ranking",
      versionFolder: "1",
      key: "ranking",
      version: 2,
    });
    await expect(
      loadResultStructures({ structuresRoot: badVersionRoot })
    ).rejects.toThrow("must match positive integer folder name '1'");
  });

  it("resolves historical fallback and rejects unknown or incompatible metadata", () => {
    expect(resolveResultStructureMetadata()).toEqual({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
    });
    expect(resolveResultStructureMetadata({})).toEqual({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
    });
    expect(resolveResultStructureMetadata({
      resultStructureKey: null,
      resultStructureVersion: null,
    })).toEqual({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
    });
    expect(() =>
      resolveResultStructureMetadata({ resultStructureKey: "ranking" })
    ).toThrow("must be provided together");
    expect(() =>
      resolveResultStructureMetadata({
        resultStructureKey: "unknown-structure",
        resultStructureVersion: 1,
      })
    ).toThrow("Unsupported resultStructureKey 'unknown-structure'");
    expect(() =>
      resolveResultStructureMetadata({
        resultStructureKey: "ranking",
        resultStructureVersion: 2,
      })
    ).toThrow("Unsupported resultStructureVersion '2'");
    expect(() => getResultStructureOrThrow("ranking", 0)).toThrow(
      "resultStructureVersion must be a positive integer"
    );
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  EVALUATION_STRUCTURE_REGISTRY,
  loadEvaluationStructures,
} from "../../modules/decisionPlugins/evaluations/evaluationStructureRegistry.js";

const temporaryRoots = [];

const createTemporaryStructuresRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crete-evaluation-registry-"));
  temporaryRoots.push(root);
  return root;
};

const writeEvaluationStructure = ({ root, folderName, key = folderName, status }) => {
  const directory = path.join(root, folderName);
  fs.mkdirSync(directory, { recursive: true });
  const statusSource = status === undefined ? "" : `, implementationStatus: ${JSON.stringify(status)}`;
  fs.writeFileSync(
    path.join(directory, "index.js"),
    `export const structure = { key: ${JSON.stringify(key)}, stage: "alternativeEvaluation", get: async () => ({}), save: async () => ({})${statusSource} };\n`,
    "utf8"
  );
};

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
});

describe("evaluation structure registry", () => {
  it("accepts structures without the optional criterion-id remapping operation", () => {
    expect(
      EVALUATION_STRUCTURE_REGISTRY.manualCriteriaWeights.remapCriterionIds
    ).toBeUndefined();
  });

  it("keeps an optional criterion-id remapping operation when it is a function", () => {
    expect(
      EVALUATION_STRUCTURE_REGISTRY.bestWorstCriteria.remapCriterionIds
    ).toEqual(expect.any(Function));
  });

  it("registers legacy and explicitly ready structures but omits scaffold structures", async () => {
    const root = createTemporaryStructuresRoot();
    writeEvaluationStructure({ root, folderName: "legacy" });
    writeEvaluationStructure({ root, folderName: "ready", status: "ready" });
    writeEvaluationStructure({ root, folderName: "scaffold", status: "scaffold" });

    const registry = await loadEvaluationStructures({ structuresRoot: root });

    expect(registry.legacy).toBeDefined();
    expect(registry.ready).toBeDefined();
    expect(registry.scaffold).toBeUndefined();
  });

  it("rejects unknown statuses and malformed scaffold structures", async () => {
    const invalidStatusRoot = createTemporaryStructuresRoot();
    writeEvaluationStructure({
      root: invalidStatusRoot,
      folderName: "invalidStatus",
      status: "development",
    });

    await expect(
      loadEvaluationStructures({ structuresRoot: invalidStatusRoot })
    ).rejects.toThrow('implementationStatus must be "ready" or "scaffold" when provided');

    const malformedRoot = createTemporaryStructuresRoot();
    const malformedDirectory = path.join(malformedRoot, "malformed");
    fs.mkdirSync(malformedDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(malformedDirectory, "index.js"),
      'export const structure = { key: "malformed", stage: "alternativeEvaluation", implementationStatus: "scaffold", get: async () => ({}) };\n',
      "utf8"
    );

    await expect(
      loadEvaluationStructures({ structuresRoot: malformedRoot })
    ).rejects.toThrow("must export exactly one valid evaluation structure object");
  });
});

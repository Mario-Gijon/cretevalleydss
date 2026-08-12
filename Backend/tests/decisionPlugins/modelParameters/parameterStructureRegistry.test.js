import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  MODEL_PARAMETER_STRUCTURE_REGISTRY,
  loadParameterStructures,
} from "../../../modules/decisionPlugins/modelParameters/parameterStructureRegistry.js";

const temporaryRoots = [];

const createTemporaryStructuresRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crete-parameter-registry-"));
  temporaryRoots.push(root);
  return root;
};

const writeParameterStructure = ({ root, folderName, key = folderName, status }) => {
  const directory = path.join(root, folderName);
  fs.mkdirSync(directory, { recursive: true });
  const statusSource = status === undefined ? "" : `, implementationStatus: ${JSON.stringify(status)}`;
  fs.writeFileSync(
    path.join(directory, "index.js"),
    `export const structure = { key: ${JSON.stringify(key)}, validateAndNormalize: () => ({ ok: true })${statusSource} };\n`,
    "utf8"
  );
};

afterEach(() => {
  temporaryRoots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
});

describe("model parameter structure registry", () => {
  it("keeps complete structure objects and supports optional definition validators", () => {
    const numberGlobal = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("numberGlobal");
    const selectGlobal = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("selectGlobal");
    const intervalGlobal = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("intervalGlobal");
    const numberCriterion = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("numberCriterion");
    const selectCriterion = MODEL_PARAMETER_STRUCTURE_REGISTRY.get("selectCriterion");

    expect(numberGlobal).toMatchObject({
      key: "numberGlobal",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(selectGlobal).toMatchObject({
      key: "selectGlobal",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(intervalGlobal).toMatchObject({
      key: "intervalGlobal",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(numberCriterion).toMatchObject({
      key: "numberCriterion",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
    expect(selectCriterion).toMatchObject({
      key: "selectCriterion",
      validateAndNormalize: expect.any(Function),
      validateDefinition: expect.any(Function),
    });
  });

  it("registers legacy and ready structures but omits scaffold structures", async () => {
    const root = createTemporaryStructuresRoot();
    writeParameterStructure({ root, folderName: "legacy" });
    writeParameterStructure({ root, folderName: "ready", status: "ready" });
    writeParameterStructure({ root, folderName: "scaffold", status: "scaffold" });

    const registry = await loadParameterStructures({ structuresRoot: root });

    expect(registry.get("legacy")).toBeDefined();
    expect(registry.get("ready")).toBeDefined();
    expect(registry.has("scaffold")).toBe(false);
  });

  it("rejects unknown statuses and malformed scaffold structures", async () => {
    const invalidStatusRoot = createTemporaryStructuresRoot();
    writeParameterStructure({
      root: invalidStatusRoot,
      folderName: "invalidStatus",
      status: "done",
    });

    await expect(
      loadParameterStructures({ structuresRoot: invalidStatusRoot })
    ).rejects.toThrow('implementationStatus must be "ready" or "scaffold" when provided');

    const malformedRoot = createTemporaryStructuresRoot();
    const malformedDirectory = path.join(malformedRoot, "malformed");
    fs.mkdirSync(malformedDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(malformedDirectory, "index.js"),
      'export const structure = { key: "malformed", implementationStatus: "scaffold" };\n',
      "utf8"
    );

    await expect(
      loadParameterStructures({ structuresRoot: malformedRoot })
    ).rejects.toThrow("must export exactly one valid parameter structure object");
  });
});

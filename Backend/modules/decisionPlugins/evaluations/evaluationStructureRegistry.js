import { createBadRequestError } from "../../../utils/common/errors.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STRUCTURES_ROOT = path.join(__dirname, "structures");

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isValidEvaluationStructure = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  isNonEmptyString(value.stage) &&
  typeof value.get === "function" &&
  typeof value.save === "function";

const assertValidEvaluationStructure = ({ structure, modulePath }) => {
  if (!isValidEvaluationStructure(structure)) {
    throw new Error(
      `${modulePath} must export exactly one valid evaluation structure object`
    );
  }
};

const extractEvaluationStructureFromModule = ({ moduleExports, modulePath }) => {
  const structures = Object.entries(moduleExports)
    .filter(([, value]) => isValidEvaluationStructure(value));

  if (structures.length === 0) {
    throw new Error(`${modulePath} must export exactly one valid evaluation structure object`);
  }

  if (structures.length > 1) {
    throw new Error(
      `${modulePath} exports multiple valid evaluation structure objects`
    );
  }

  return structures[0][1];
};

const loadEvaluationStructures = async () => {
  const entries = fs.readdirSync(STRUCTURES_ROOT, { withFileTypes: true });
  const structureDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const registry = {};

  for (const folderName of structureDirs) {
    const modulePath = path.join(STRUCTURES_ROOT, folderName, "index.js");

    if (!fs.existsSync(modulePath)) {
      throw new Error(
        `Evaluation structure folder '${folderName}' must contain index.js`
      );
    }

    const moduleExports = await import(pathToFileURL(modulePath).href);
    const structure = extractEvaluationStructureFromModule({
      moduleExports,
      modulePath,
    });

    assertValidEvaluationStructure({ structure, modulePath });

    if (structure.key !== folderName) {
      throw new Error(
        `${modulePath} structure key '${structure.key}' must match folder name '${folderName}'`
      );
    }

    if (Object.hasOwn(registry, structure.key)) {
      throw new Error(
        `Duplicate evaluation structure key detected: ${structure.key}`
      );
    }

    registry[structure.key] = structure;
  }

  return Object.freeze(registry);
};

export const EVALUATION_STRUCTURE_REGISTRY = await loadEvaluationStructures();

export const getEvaluationStructureOrThrow = (structureKey) => {
  const structure = EVALUATION_STRUCTURE_REGISTRY[structureKey];

  if (!structure) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${structureKey}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "structureKey",
      }
    );
  }

  return structure;
};

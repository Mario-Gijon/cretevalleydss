import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { normalizeNonEmptyString } from "./parameterValues.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STRUCTURES_ROOT = path.join(__dirname, "structures");

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isValidParameterStructure = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  typeof value.validateAndNormalize === "function";

const extractParameterStructureFromModule = ({ moduleExports, modulePath }) => {
  const structures = Object.entries(moduleExports).filter(([, value]) =>
    isValidParameterStructure(value)
  );

  if (structures.length === 0) {
    throw new Error(
      `${modulePath} must export exactly one valid parameter structure object`
    );
  }

  if (structures.length > 1) {
    throw new Error(
      `${modulePath} exports multiple valid parameter structure objects`
    );
  }

  return structures[0][1];
};

const loadParameterStructures = async () => {
  const entries = fs.readdirSync(STRUCTURES_ROOT, { withFileTypes: true });
  const structureDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const registry = new Map();

  for (const folderName of structureDirs) {
    const modulePath = path.join(STRUCTURES_ROOT, folderName, "index.js");

    if (!fs.existsSync(modulePath)) {
      throw new Error(
        `Parameter structure folder '${folderName}' must contain index.js`
      );
    }

    const moduleExports = await import(pathToFileURL(modulePath).href);
    const structure = extractParameterStructureFromModule({
      moduleExports,
      modulePath,
    });

    if (structure.key !== folderName) {
      throw new Error(
        `${modulePath} structure key '${structure.key}' must match folder name '${folderName}'`
      );
    }

    if (registry.has(structure.key)) {
      throw new Error(
        `Duplicate parameter structure key detected: ${structure.key}`
      );
    }

    registry.set(structure.key, structure.validateAndNormalize);
  }

  return registry;
};

export const MODEL_PARAMETER_STRUCTURE_REGISTRY = await loadParameterStructures();

export const resolveParameterStructureKey = (parameter) => {
  return normalizeNonEmptyString(parameter?.parameterStructureKey);
};

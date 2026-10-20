import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createBadRequestError } from "../../../utils/common/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STRUCTURES_ROOT = path.join(__dirname, "structures");

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isPositiveInteger = (value) =>
  Number.isInteger(value) && value > 0;
const RESULT_PROJECTION_TARGETS = new Set([
  "stagePersistence",
  "executionResponse",
  "scenarioInput",
  "stateSnapshot",
  "activeIssueResponse",
]);

const isValidResultStructure = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  isPositiveInteger(value.version) &&
  typeof value.validateAndNormalize === "function";

const validateImplementationStatus = ({ structure, modulePath }) => {
  if (!Object.hasOwn(structure, "implementationStatus")) return;

  if (
    structure.implementationStatus !== "ready" &&
    structure.implementationStatus !== "scaffold"
  ) {
    throw new Error(
      `${modulePath} implementationStatus must be "ready" or "scaffold" when provided`
    );
  }
};

const assertValidResultStructure = ({ structure, modulePath }) => {
  if (!isValidResultStructure(structure)) {
    throw new Error(
      `${modulePath} must export exactly one valid result structure object with a positive integer version and validateAndNormalize function`
    );
  }
};

const extractResultStructureFromModule = ({ moduleExports, modulePath }) => {
  const structures = Object.entries(moduleExports).filter(([, value]) =>
    isValidResultStructure(value)
  );

  if (structures.length === 0) {
    throw new Error(
      `${modulePath} must export exactly one valid result structure object`
    );
  }

  if (structures.length > 1) {
    throw new Error(
      `${modulePath} exports multiple valid result structure objects`
    );
  }

  return structures[0][1];
};

export const buildResultStructureRegistry = (structures) => {
  if (!Array.isArray(structures)) {
    throw new TypeError("Result structures must be provided as an array");
  }

  const registry = new Map();

  for (const structure of structures) {
    assertValidResultStructure({
      structure,
      modulePath: "Result structure registration",
    });
    validateImplementationStatus({
      structure,
      modulePath: "Result structure registration",
    });

    if (structure.implementationStatus === "scaffold") continue;

    let versions = registry.get(structure.key);
    if (!versions) {
      versions = new Map();
      registry.set(structure.key, versions);
    }

    if (versions.has(structure.version)) {
      throw new Error(
        `Duplicate result structure key/version detected: ${structure.key}@${structure.version}`
      );
    }

    versions.set(structure.version, structure);
  }

  return registry;
};

export const loadResultStructures = async ({
  structuresRoot = STRUCTURES_ROOT,
} = {}) => {
  const keyEntries = fs.readdirSync(structuresRoot, { withFileTypes: true });
  const structures = [];

  for (const keyEntry of keyEntries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const keyDirectory = path.join(structuresRoot, keyEntry.name);
    const versionEntries = fs.readdirSync(keyDirectory, { withFileTypes: true });
    const versionDirectories = versionEntries
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    if (versionDirectories.length === 0) {
      throw new Error(
        `Result structure folder '${keyEntry.name}' must contain version folders`
      );
    }

    for (const versionEntry of versionDirectories) {
      const versionFolderMatch = versionEntry.name.match(/^v?(\d+)$/);
      const folderVersion = versionFolderMatch
        ? Number(versionFolderMatch[1])
        : null;
      const modulePath = path.join(
        keyDirectory,
        versionEntry.name,
        "index.js"
      );

      if (!fs.existsSync(modulePath)) {
        throw new Error(
          `${modulePath} must exist for result structure '${keyEntry.name}' version '${versionEntry.name}'`
        );
      }

      const moduleExports = await import(pathToFileURL(modulePath).href);
      const structure = extractResultStructureFromModule({
        moduleExports,
        modulePath,
      });

      assertValidResultStructure({ structure, modulePath });
      validateImplementationStatus({ structure, modulePath });

      if (structure.key !== keyEntry.name) {
        throw new Error(
          `${modulePath} result structure key '${structure.key}' must match folder name '${keyEntry.name}'`
        );
      }

      if (
        !isPositiveInteger(folderVersion) ||
        structure.version !== folderVersion
      ) {
        throw new Error(
          `${modulePath} result structure version '${structure.version}' must match positive integer folder name '${versionEntry.name}'`
        );
      }

      structures.push(structure);
    }
  }

  return buildResultStructureRegistry(structures);
};

export const RESULT_STRUCTURE_REGISTRY = await loadResultStructures();

export const getResultStructureOrThrow = (
  structureKey,
  structureVersion,
  registry = RESULT_STRUCTURE_REGISTRY
) => {
  if (!isNonEmptyString(structureKey)) {
    throw createBadRequestError(
      "resultStructureKey must be a non-empty string",
      {
        code: "INVALID_RESULT_STRUCTURE_KEY",
        field: "resultStructureKey",
      }
    );
  }

  if (!isPositiveInteger(structureVersion)) {
    throw createBadRequestError(
      "resultStructureVersion must be a positive integer",
      {
        code: "INVALID_RESULT_STRUCTURE_VERSION",
        field: "resultStructureVersion",
      }
    );
  }

  const versions = registry.get(structureKey);
  if (!versions) {
    const registeredKeys = [...registry.keys()].sort((left, right) =>
      left.localeCompare(right)
    );
    const supportedKeysMessage =
      registeredKeys.length === 1
        ? `Only '${registeredKeys[0]}' is currently supported.`
        : registeredKeys.length > 1
          ? `Registered keys are: ${registeredKeys.join(", ")}.`
          : "No result structures are currently registered.";
    throw createBadRequestError(
      `Unsupported resultStructureKey '${structureKey}'. ${supportedKeysMessage}`,
      {
        code: "UNSUPPORTED_RESULT_STRUCTURE",
        field: "resultStructureKey",
      }
    );
  }

  const structure = versions.get(structureVersion);
  if (!structure) {
    throw createBadRequestError(
      `Unsupported resultStructureVersion '${structureVersion}' for resultStructureKey '${structureKey}'.`,
      {
        code: "UNSUPPORTED_RESULT_STRUCTURE_VERSION",
        field: "resultStructureVersion",
      }
    );
  }

  return structure;
};

export const normalizeResultStructureOrThrow = ({
  resultStructureKey,
  resultStructureVersion,
  result,
  messages,
  options,
  context,
  registry = RESULT_STRUCTURE_REGISTRY,
}) => {
  const structure = getResultStructureOrThrow(
    resultStructureKey,
    resultStructureVersion,
    registry
  );

  return structure.validateAndNormalize({ result, messages, options, context });
};

/**
 * Projects normalized data at a named persistence or compatibility boundary:
 * stagePersistence, executionResponse, scenarioInput, stateSnapshot, or
 * activeIssueResponse.
 * Structures without family-specific projections preserve the normalized object.
 */
export const projectNormalizedResultOrThrow = ({
  resultStructureKey,
  resultStructureVersion,
  result,
  target,
  context = {},
  registry = RESULT_STRUCTURE_REGISTRY,
}) => {
  if (!RESULT_PROJECTION_TARGETS.has(target)) {
    throw new TypeError(`Unsupported result projection target '${target}'`);
  }

  const structure = getResultStructureOrThrow(
    resultStructureKey,
    resultStructureVersion,
    registry
  );
  const projectedResult = structure.projectNormalizedResult
    ? structure.projectNormalizedResult({ result, target, context })
    : result;

  if (
    projectedResult === null ||
    typeof projectedResult !== "object" ||
    Array.isArray(projectedResult) ||
    Object.getPrototypeOf(projectedResult) !== Object.prototype
  ) {
    throw new TypeError(
      `Result structure '${resultStructureKey}@${resultStructureVersion}' must project '${target}' to a plain object`
    );
  }

  return projectedResult;
};

import {
  getResultStructureOrThrow,
  RESULT_STRUCTURE_REGISTRY,
} from "./resultStructures/resultStructureRegistry.js";

export const DEFAULT_RESULT_STRUCTURE_KEY = "ranking";
export const DEFAULT_RESULT_STRUCTURE_VERSION = 1;

export const resolveResultStructureMetadata = ({
  resultStructureKey,
  resultStructureVersion,
} = {}, { registry = RESULT_STRUCTURE_REGISTRY } = {}) => {
  const keyIsMissing = resultStructureKey === undefined;
  const versionIsMissing = resultStructureVersion === undefined;

  if (
    (keyIsMissing && versionIsMissing) ||
    (resultStructureKey === null && resultStructureVersion === null)
  ) {
    return {
      resultStructureKey: DEFAULT_RESULT_STRUCTURE_KEY,
      resultStructureVersion: DEFAULT_RESULT_STRUCTURE_VERSION,
    };
  }

  if (
    keyIsMissing ||
    versionIsMissing ||
    resultStructureKey === null ||
    resultStructureVersion === null
  ) {
    throw new TypeError(
      "resultStructureKey and resultStructureVersion must be provided together"
    );
  }

  if (typeof resultStructureKey !== "string" || !resultStructureKey.trim()) {
    throw new TypeError("resultStructureKey must be a non-empty string");
  }

  if (!Number.isInteger(resultStructureVersion) || resultStructureVersion <= 0) {
    throw new TypeError("resultStructureVersion must be a positive integer");
  }

  getResultStructureOrThrow(resultStructureKey, resultStructureVersion, registry);

  return { resultStructureKey, resultStructureVersion };
};

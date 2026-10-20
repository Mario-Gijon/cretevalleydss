export const DEFAULT_RESULT_STRUCTURE_KEY = "ranking";
export const DEFAULT_RESULT_STRUCTURE_VERSION = 1;

export const resolveResultStructureMetadata = ({
  resultStructureKey,
  resultStructureVersion,
} = {}) => {
  const keyIsMissing = resultStructureKey === undefined;
  const versionIsMissing = resultStructureVersion === undefined;

  if (keyIsMissing && versionIsMissing) {
    return {
      resultStructureKey: DEFAULT_RESULT_STRUCTURE_KEY,
      resultStructureVersion: DEFAULT_RESULT_STRUCTURE_VERSION,
    };
  }

  if (keyIsMissing || versionIsMissing) {
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

  if (resultStructureKey !== DEFAULT_RESULT_STRUCTURE_KEY) {
    throw new TypeError(
      `Unsupported resultStructureKey '${resultStructureKey}'. Only 'ranking' is currently supported.`
    );
  }

  if (resultStructureVersion !== DEFAULT_RESULT_STRUCTURE_VERSION) {
    throw new TypeError(
      `Unsupported resultStructureVersion '${resultStructureVersion}' for resultStructureKey 'ranking'.`
    );
  }

  return { resultStructureKey, resultStructureVersion };
};

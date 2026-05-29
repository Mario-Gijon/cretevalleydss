import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "./issueCreation.model.js";

const MODE_CONFIGS = Object.freeze({
  creatorManual: Object.freeze({
    source: "creator",
    method: "manual",
    structureKey: "manualCriteriaWeights",
  }),
  expertManual: Object.freeze({
    source: "experts",
    method: "manual",
    structureKey: "manualCriteriaWeights",
  }),
  creatorApiModel: Object.freeze({
    source: "creator",
    method: "apiModel",
    structureKey: null,
  }),
  expertApiModel: Object.freeze({
    source: "experts",
    method: "apiModel",
    structureKey: null,
  }),
  creatorFuzzy: Object.freeze({
    source: "creator",
    method: "fuzzy",
    structureKey: null,
  }),
});

export const resolveCriteriaWeightingModeConfigOrThrow = (rawConfig) => {
  if (!isPlainObject(rawConfig)) {
    throw createBadRequestError("criteriaWeightingConfig is required", {
      field: "criteriaWeightingConfig",
    });
  }

  const mode = normalizeNonEmptyString(rawConfig.mode);
  if (!mode) {
    throw createBadRequestError("criteriaWeightingConfig.mode is required", {
      field: "criteriaWeightingConfig.mode",
    });
  }

  const modeConfig = MODE_CONFIGS[mode];
  if (!modeConfig) {
    throw createBadRequestError(`Unsupported criteria weighting mode: ${mode}`, {
      field: "criteriaWeightingConfig.mode",
    });
  }

  const source = normalizeNonEmptyString(rawConfig.source);
  const method = normalizeNonEmptyString(rawConfig.method);
  const structureKey = normalizeNonEmptyString(rawConfig.structureKey);

  if (source && source !== modeConfig.source) {
    throw createBadRequestError(
      `criteriaWeightingConfig.source must be '${modeConfig.source}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.source",
      }
    );
  }

  if (method && method !== modeConfig.method) {
    throw createBadRequestError(
      `criteriaWeightingConfig.method must be '${modeConfig.method}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.method",
      }
    );
  }

  if (
    structureKey &&
    modeConfig.structureKey &&
    structureKey !== modeConfig.structureKey
  ) {
    throw createBadRequestError(
      `criteriaWeightingConfig.structureKey must be '${modeConfig.structureKey}' for mode '${mode}'`,
      {
        field: "criteriaWeightingConfig.structureKey",
      }
    );
  }

  return {
    mode,
    source: modeConfig.source,
    method: modeConfig.method,
    structureKey: modeConfig.structureKey,
    payload: isPlainObject(rawConfig.payload) ? rawConfig.payload : {},
    criteriaWeightingModelKey: normalizeNonEmptyString(
      rawConfig.criteriaWeightingModelKey
    ),
    criteriaWeightingModelId: normalizeNonEmptyString(
      rawConfig.criteriaWeightingModelId
    ),
  };
};

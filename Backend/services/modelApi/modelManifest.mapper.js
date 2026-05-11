import { EVALUATION_STRUCTURES } from "../../modules/issues/issue.evaluationStructure.js";
import { isSupportedLifecycleKind } from "../../modules/issues/issue.lifecycleKind.js";

export const MANIFEST_SYNC_SOURCE = "ApiModels";

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

export const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

export const toIdString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

export const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toPlainValue = (value) => {
  if (value && typeof value.toObject === "function") {
    return value.toObject({
      depopulate: true,
      getters: false,
      minimize: false,
      virtuals: false,
    });
  }

  return value;
};

const normalizeDynamicObject = (value) => {
  const plainValue = toPlainValue(value);

  if (plainValue === null || plainValue === undefined) {
    return null;
  }

  if (Array.isArray(plainValue)) {
    return plainValue.map((item) => normalizeDynamicObject(item));
  }

  if (plainValue && typeof plainValue === "object") {
    return Object.keys(plainValue)
      .filter((key) => plainValue[key] !== undefined)
      .reduce((normalized, key) => {
        normalized[key] = normalizeDynamicObject(plainValue[key]);
        return normalized;
      }, {});
  }

  return plainValue;
};

const normalizeStringList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueValues = new Set(
    value
      .map((item) => normalizeNonEmptyString(item))
      .filter(Boolean)
  );

  return [...uniqueValues];
};

export const normalizeEndpoint = (apiEndpoint, { emptyValue = null } = {}) => {
  if (!apiEndpoint || typeof apiEndpoint !== "object") {
    return emptyValue;
  }

  const rawPath = normalizeNonEmptyString(apiEndpoint.path);
  const path = rawPath ? `/${rawPath.replace(/^\/+/, "")}` : null;

  if (!path) {
    return emptyValue;
  }

  return {
    method: normalizeNonEmptyString(apiEndpoint.method),
    path,
    operationId: normalizeNonEmptyString(apiEndpoint.operationId),
  };
};

export const normalizeParameter = (parameter = {}) => {
  const key = normalizeNonEmptyString(parameter?.key);

  return {
    key,
    name: key,
    label: normalizeNonEmptyString(parameter?.label),
    description: normalizeNonEmptyString(parameter?.description),
    type: normalizeNonEmptyString(parameter?.type),
    scope: normalizeNonEmptyString(parameter?.scope),
    semanticRole: normalizeNonEmptyString(parameter?.semanticRole),
    required: parameter?.required === true,
    default: hasOwn(parameter, "default") ? parameter.default : null,
    restrictions: normalizeDynamicObject(parameter?.restrictions),
    ui: normalizeDynamicObject(parameter?.ui),
  };
};

export const normalizeParameters = (parameters) => {
  if (!Array.isArray(parameters)) {
    return [];
  }

  return parameters
    .map(normalizeParameter)
    .sort((left, right) => String(left.key).localeCompare(String(right.key)));
};

export const normalizeSupportedDomains = (supportedDomains) => {
  if (!supportedDomains || typeof supportedDomains !== "object") {
    return {
      numeric: {
        continuous: false,
        discrete: false,
      },
      linguistic: [],
    };
  }

  return {
    numeric: {
      continuous: supportedDomains?.numeric?.continuous === true,
      discrete: supportedDomains?.numeric?.discrete === true,
    },
    linguistic: normalizeStringList(supportedDomains?.linguistic).map((item) =>
      item.toLowerCase()
    ),
  };
};

export const normalizeCriterionTypes = (criterionTypes) =>
  normalizeStringList(criterionTypes);

export const getSyncBlockerReason = (manifestModel) => {
  if (manifestModel?.isIssueModel !== true) {
    return "Model is not marked as issue model";
  }

  return null;
};

export const buildSkippedManifestModel = (manifestModel, reason) => ({
  apiModelKey: manifestModel?.apiModelKey ?? null,
  displayName: manifestModel?.displayName ?? null,
  isIssueModel: manifestModel?.isIssueModel === true,
  reason,
});

const validateManifestParameters = (manifestModel) => {
  const errors = [];
  const parameters = Array.isArray(manifestModel?.parameters)
    ? manifestModel.parameters
    : [];
  const seenKeys = new Set();

  parameters.forEach((parameter, index) => {
    const parameterPath = `parameters[${index}]`;
    const key = normalizeNonEmptyString(parameter?.key);
    const type = normalizeNonEmptyString(parameter?.type);

    if (!key) {
      errors.push(`${parameterPath}.key`);
      return;
    }

    if (seenKeys.has(key)) {
      errors.push(`${parameterPath}.key (duplicate: ${key})`);
    }
    seenKeys.add(key);

    if (!type) {
      errors.push(`${parameterPath}.type`);
    }
  });

  return errors;
};

export const validateSyncableManifestModel = (manifestModel) => {
  const missingFields = [];

  const apiModelKey = normalizeNonEmptyString(manifestModel?.apiModelKey);
  const displayName = normalizeNonEmptyString(manifestModel?.displayName);
  const endpointPath = normalizeNonEmptyString(manifestModel?.apiEndpoint?.path);
  const evaluationStructure = normalizeNonEmptyString(
    manifestModel?.evaluationStructure
  );
  const lifecycleKind = normalizeNonEmptyString(manifestModel?.lifecycleKind);
  const apiInputFormat = normalizeNonEmptyString(manifestModel?.apiInputFormat);
  const apiOutputFormat = normalizeNonEmptyString(manifestModel?.apiOutputFormat);
  const modelFamilyKey = normalizeNonEmptyString(manifestModel?.modelFamilyKey);
  const modelVersion = normalizeNonEmptyString(manifestModel?.modelVersion);
  const versionLabel = normalizeNonEmptyString(manifestModel?.versionLabel);

  if (!apiModelKey) missingFields.push("apiModelKey");
  if (!displayName) missingFields.push("displayName");
  if (!endpointPath) missingFields.push("apiEndpoint.path");
  if (!modelFamilyKey) missingFields.push("modelFamilyKey");
  if (!modelVersion) missingFields.push("modelVersion");
  if (!versionLabel) missingFields.push("versionLabel");

  if (!evaluationStructure) {
    missingFields.push("evaluationStructure");
  } else if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    missingFields.push(
      `evaluationStructure (unsupported: ${evaluationStructure})`
    );
  }

  if (!lifecycleKind) {
    missingFields.push("lifecycleKind");
  } else if (!isSupportedLifecycleKind(lifecycleKind)) {
    missingFields.push(`lifecycleKind (unsupported: ${lifecycleKind})`);
  }

  if (!apiInputFormat) {
    missingFields.push("apiInputFormat");
  }

  if (!apiOutputFormat) {
    missingFields.push("apiOutputFormat");
  }

  if (typeof manifestModel?.isMultiCriteria !== "boolean") {
    missingFields.push("isMultiCriteria");
  }

  missingFields.push(...validateManifestParameters(manifestModel));

  return missingFields;
};

export const buildManifestTechnicalProjection = (manifestModel) => ({
  apiModelKey: normalizeNonEmptyString(manifestModel?.apiModelKey),
  displayName: normalizeNonEmptyString(manifestModel?.displayName),
  modelFamilyKey: normalizeNonEmptyString(manifestModel?.modelFamilyKey),
  modelVersion: normalizeNonEmptyString(manifestModel?.modelVersion),
  versionLabel: normalizeNonEmptyString(manifestModel?.versionLabel),
  isIssueModel: manifestModel?.isIssueModel === true,
  apiEndpoint: normalizeEndpoint(manifestModel?.apiEndpoint, {
    emptyValue: null,
  }),
  smallDescription: normalizeNonEmptyString(manifestModel?.smallDescription),
  extendDescription: normalizeNonEmptyString(manifestModel?.extendDescription),
  moreInfoUrl: normalizeNonEmptyString(manifestModel?.moreInfoUrl),
  evaluationStructure: normalizeNonEmptyString(manifestModel?.evaluationStructure),
  lifecycleKind: normalizeNonEmptyString(manifestModel?.lifecycleKind),
  apiInputFormat: normalizeNonEmptyString(manifestModel?.apiInputFormat),
  apiOutputFormat: normalizeNonEmptyString(manifestModel?.apiOutputFormat),
  isMultiCriteria: manifestModel?.isMultiCriteria === true,
  supportedDomains: normalizeSupportedDomains(manifestModel?.supportedDomains),
  criterionTypes: normalizeCriterionTypes(manifestModel?.criterionTypes),
  parameters: normalizeParameters(manifestModel?.parameters),
  modelInputFields: normalizeStringList(manifestModel?.modelInputFields),
  modelOutputFields: normalizeStringList(manifestModel?.modelOutputFields),
  request: normalizeDynamicObject(manifestModel?.request),
  response: normalizeDynamicObject(manifestModel?.response),
});

export const buildTechnicalPayload = ({ manifest, manifestModel, now }) => {
  const { displayName, ...manifestTechnicalProjection } =
    buildManifestTechnicalProjection(manifestModel);

  return {
    ...manifestTechnicalProjection,
    name: displayName,
    manifestSync: {
      source: MANIFEST_SYNC_SOURCE,
      manifestVersion: manifest?.manifestVersion ?? null,
      apiVersion: manifest?.apiVersion ?? null,
      lastSyncedAt: now,
      lastSeenAt: now,
      isStale: false,
    },
  };
};

export const normalizeForStableStringify = (value) => {
  const plainValue = toPlainValue(value);

  if (plainValue === undefined) {
    return null;
  }

  if (plainValue instanceof Date) {
    return plainValue.toISOString();
  }

  if (Array.isArray(plainValue)) {
    return plainValue.map(normalizeForStableStringify);
  }

  if (plainValue && typeof plainValue === "object") {
    return Object.keys(plainValue)
      .filter((key) => plainValue[key] !== undefined && key !== "_id" && key !== "__v")
      .sort()
      .reduce((normalized, key) => {
        normalized[key] = normalizeForStableStringify(plainValue[key]);
        return normalized;
      }, {});
  }

  return plainValue;
};

export const stableStringify = (value) => {
  return JSON.stringify(normalizeForStableStringify(value));
};

export const normalizeComparableFieldValue = (field, value) => {
  const plainValue = toPlainValue(value);

  if (field === "apiEndpoint") {
    return normalizeEndpoint(plainValue, { emptyValue: null });
  }

  if (field === "parameters") {
    return normalizeParameters(plainValue);
  }

  if (field === "supportedDomains") {
    return normalizeSupportedDomains(plainValue);
  }

  if (field === "criterionTypes") {
    return normalizeCriterionTypes(plainValue);
  }

  if (field === "modelInputFields" || field === "modelOutputFields") {
    return normalizeStringList(plainValue);
  }

  return normalizeForStableStringify(plainValue);
};

export const isValueEqual = (field, left, right) => {
  return (
    stableStringify(normalizeComparableFieldValue(field, left)) ===
    stableStringify(normalizeComparableFieldValue(field, right))
  );
};

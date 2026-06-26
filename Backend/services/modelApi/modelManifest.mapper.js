import { hasOwnKey } from "../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../utils/common/strings.js";

export const MANIFEST_SYNC_SOURCE = "DecisionModelsService";

export const toIdString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
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
  };
};

export const normalizeParameter = (parameter = {}) => {
  const key = normalizeNonEmptyString(parameter?.key);

  return {
    key,
    name: key,
    label: normalizeNonEmptyString(parameter?.label),
    description: normalizeNonEmptyString(parameter?.description),
    valueType: normalizeNonEmptyString(parameter?.valueType),
    scope: normalizeNonEmptyString(parameter?.scope),
    parameterStructureKey: normalizeNonEmptyString(parameter?.parameterStructureKey),
    required: parameter?.required === true,
    default: hasOwnKey(parameter || {}, "default") ? parameter.default : null,
    restrictions: normalizeDynamicObject(parameter?.restrictions),
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

export const normalizeModelKind = (value) => {
  const modelKind = normalizeNonEmptyString(value);

  if (modelKind === "issue" || modelKind === "criteriaWeighting") {
    return modelKind;
  }

  return null;
};

export const getSyncBlockerReason = (manifestModel) => {
  if (!normalizeModelKind(manifestModel?.modelKind)) {
    return "Model has invalid modelKind";
  }

  return null;
};

export const buildSkippedManifestModel = (manifestModel, reason) => ({
  apiModelKey: manifestModel?.apiModelKey ?? null,
  displayName: manifestModel?.displayName ?? null,
  modelKind: normalizeModelKind(manifestModel?.modelKind),
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
    const parameterStructureKey = normalizeNonEmptyString(parameter?.parameterStructureKey);

    if (!key) {
      errors.push(`${parameterPath}.key`);
      return;
    }

    if (seenKeys.has(key)) {
      errors.push(`${parameterPath}.key (duplicate: ${key})`);
    }
    seenKeys.add(key);

    if (!parameterStructureKey) {
      errors.push(`${parameterPath}.parameterStructureKey`);
    }
  });

  return errors;
};

export const validateSyncableManifestModel = (manifestModel) => {
  const missingFields = [];

  const apiModelKey = normalizeNonEmptyString(manifestModel?.apiModelKey);
  const displayName = normalizeNonEmptyString(manifestModel?.displayName);
  const endpointPath = normalizeNonEmptyString(manifestModel?.apiEndpoint?.path);
  const modelKind = normalizeModelKind(manifestModel?.modelKind);
  const evaluationStructureKey = normalizeNonEmptyString(
    manifestModel?.evaluationStructureKey
  );
  const implementationStatus = normalizeNonEmptyString(
    manifestModel?.implementationStatus
  );
  const publicUsable = manifestModel?.publicUsable;
  const supportsCreatorCriteriaWeighting =
    manifestModel?.supportsCreatorCriteriaWeighting;
  const supportsExpertCriteriaWeighting =
    manifestModel?.supportsExpertCriteriaWeighting;

  if (!apiModelKey) missingFields.push("apiModelKey");
  if (!displayName) missingFields.push("displayName");
  if (!endpointPath) missingFields.push("apiEndpoint.path");
  if (!modelKind) {
    missingFields.push("modelKind");
  }
  if (!evaluationStructureKey) {
    missingFields.push("evaluationStructureKey");
  }
  if (!implementationStatus) {
    missingFields.push("implementationStatus");
  } else if (!["ready", "scaffold"].includes(implementationStatus)) {
    missingFields.push("implementationStatus (must be ready or scaffold)");
  }
  if (typeof publicUsable !== "boolean") {
    missingFields.push("publicUsable");
  }
  if (modelKind === "criteriaWeighting") {
    if (typeof supportsCreatorCriteriaWeighting !== "boolean") {
      missingFields.push("supportsCreatorCriteriaWeighting");
    }
    if (typeof supportsExpertCriteriaWeighting !== "boolean") {
      missingFields.push("supportsExpertCriteriaWeighting");
    }
    if (
      typeof supportsCreatorCriteriaWeighting === "boolean" &&
      typeof supportsExpertCriteriaWeighting === "boolean" &&
      supportsCreatorCriteriaWeighting !== true &&
      supportsExpertCriteriaWeighting !== true
    ) {
      missingFields.push(
        "supportsCreatorCriteriaWeighting/supportsExpertCriteriaWeighting (at least one must be true)"
      );
    }
  }

  if (typeof manifestModel?.isMultiCriteria !== "boolean") {
    missingFields.push("isMultiCriteria");
  }
  if (typeof manifestModel?.usesCriteriaWeights !== "boolean") {
    missingFields.push("usesCriteriaWeights");
  }
  if (typeof manifestModel?.usesExpertWeights !== "boolean") {
    missingFields.push("usesExpertWeights");
  }
  if (typeof manifestModel?.usesFuzzyCriteriaWeights !== "boolean") {
    missingFields.push("usesFuzzyCriteriaWeights");
  }
  if (typeof manifestModel?.usesCriterionTypes !== "boolean") {
    missingFields.push("usesCriterionTypes");
  }
  if (typeof manifestModel?.supportsConsensusSimulation !== "boolean") {
    missingFields.push("supportsConsensusSimulation");
  }

  missingFields.push(...validateManifestParameters(manifestModel));

  return missingFields;
};

export const buildManifestTechnicalProjection = (manifestModel) => {
  const modelKind = normalizeModelKind(manifestModel?.modelKind);
  const implementationStatus =
    normalizeNonEmptyString(manifestModel?.implementationStatus) || "ready";
  const isScaffold = implementationStatus === "scaffold";

  return {
    apiModelKey: normalizeNonEmptyString(manifestModel?.apiModelKey),
    displayName: normalizeNonEmptyString(manifestModel?.displayName),
    modelKind,
    implementationStatus,
    publicUsable: manifestModel?.publicUsable === true,
    supportsCreatorCriteriaWeighting:
      modelKind === "criteriaWeighting" &&
      manifestModel?.supportsCreatorCriteriaWeighting === true,
    supportsExpertCriteriaWeighting:
      modelKind === "criteriaWeighting" &&
      manifestModel?.supportsExpertCriteriaWeighting === true,
    visibleInIssueCreation: modelKind === "issue" && !isScaffold,
    visibleInCriteriaWeighting:
      modelKind === "criteriaWeighting" && !isScaffold,
    apiEndpoint: normalizeEndpoint(manifestModel?.apiEndpoint, {
      emptyValue: null,
    }),
    smallDescription: normalizeNonEmptyString(manifestModel?.smallDescription),
    extendDescription: normalizeNonEmptyString(
      manifestModel?.extendedDescription ?? manifestModel?.extendDescription
    ),
    moreInfoUrl: normalizeNonEmptyString(manifestModel?.moreInfoUrl),
    evaluationStructureKey: normalizeNonEmptyString(
      manifestModel?.evaluationStructureKey
    ),
    supportsConsensus: manifestModel?.supportsConsensus === true,
    supportsConsensusSimulation:
      manifestModel?.supportsConsensusSimulation === true,
    isMultiCriteria: manifestModel?.isMultiCriteria === true,
    usesCriteriaWeights: manifestModel?.usesCriteriaWeights === true,
    usesExpertWeights: manifestModel?.usesExpertWeights === true,
    usesFuzzyCriteriaWeights: manifestModel?.usesFuzzyCriteriaWeights === true,
    usesCriterionTypes: manifestModel?.usesCriterionTypes === true,
    supportedDomains: normalizeSupportedDomains(manifestModel?.supportedDomains),
    parameters: normalizeParameters(manifestModel?.parameters),
    request: normalizeDynamicObject(manifestModel?.request),
    response: normalizeDynamicObject(manifestModel?.response),
  };
};

export const buildTechnicalPayload = ({ manifest, manifestModel, now }) => {
  const { displayName, ...manifestTechnicalProjection } =
    buildManifestTechnicalProjection(manifestModel);

  return {
    ...manifestTechnicalProjection,
    name: displayName,
    manifestSync: {
      source: MANIFEST_SYNC_SOURCE,
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

  return normalizeForStableStringify(plainValue);
};

export const isValueEqual = (field, left, right) => {
  return (
    stableStringify(normalizeComparableFieldValue(field, left)) ===
    stableStringify(normalizeComparableFieldValue(field, right))
  );
};

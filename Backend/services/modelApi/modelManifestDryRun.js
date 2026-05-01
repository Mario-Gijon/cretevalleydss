import { IssueModel } from "../../models/IssueModels.js";
import { fetchModelManifest } from "./modelManifestClient.js";
import { EVALUATION_STRUCTURES } from "../../modules/issues/issue.evaluationStructure.js";
import { isSupportedLifecycleKind } from "../../modules/issues/issue.lifecycleKind.js";

const TECHNICAL_FIELDS = [
  "apiModelKey",
  "modelFamilyKey",
  "modelVersion",
  "versionLabel",
  "apiEndpoint",
  "evaluationStructure",
  "lifecycleKind",
  "inputKind",
  "outputKind",
  "isConsensus",
  "isMultiCriteria",
  "parameters",
  "supportedDomains",
  "role",
  "status",
  "supportsScenarios",
];

const LOCAL_CONFIGURATION_FIELDS = ["publicInIssueCatalog"];

const PRESERVED_EDITORIAL_FIELDS = [
  "smallDescription",
  "extendDescription",
  "moreInfoUrl",
];

const SUPPORTED_EVALUATION_STRUCTURES = new Set(
  Object.values(EVALUATION_STRUCTURES)
);

const SUPPORTED_INPUT_KINDS = new Set([
  "directCrispMatrix",
  "directFuzzyMatrix",
  "pairwisePreferenceMatrix",
]);

const SUPPORTED_OUTPUT_KINDS = new Set([
  "ranking",
  "consensusRanking",
]);

const SUPPORTED_PARAMETER_TYPES = new Set([
  "number",
  "integer",
  "boolean",
  "string",
  "enum",
  "array",
  "interval",
  "tuple",
  "fuzzyNumber",
  "fuzzyArray",
]);

const SUPPORTED_PARAMETER_RESTRICTIONS = new Set([
  "min",
  "max",
  "allowed",
  "length",
  "itemType",
  "tupleLength",
  "sum",
  "normalize",
  "ordered",
]);

const SUPPORTED_ORDERED_RULES = new Set([
  "strictIncreasing",
  "nonDecreasing",
]);

const SUPPORTED_DYNAMIC_LENGTHS = new Set([
  "matchCriteria",
  "matchAlternatives",
]);

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const toIdString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeParameter = (parameter = {}) => {
  const restrictions = parameter?.restrictions || {};
  const key = normalizeNonEmptyString(parameter?.key) || normalizeNonEmptyString(parameter?.name);

  return {
    key: key ?? null,
    name: key ?? null,
    label: normalizeNonEmptyString(parameter?.label) ?? null,
    description: normalizeNonEmptyString(parameter?.description) ?? null,
    type: parameter?.type ?? null,
    required: parameter?.required === true,
    default: parameter?.default ?? null,
    restrictions: {
      min: restrictions.min ?? null,
      max: restrictions.max ?? null,
      allowed: restrictions.allowed ?? null,
      length: restrictions.length ?? null,
      itemType: restrictions.itemType ?? null,
      tupleLength: restrictions.tupleLength ?? null,
      sum: restrictions.sum ?? null,
      normalize: restrictions.normalize === true,
      ordered: restrictions.ordered ?? null,
    },
    ui:
      parameter?.ui && typeof parameter.ui === "object"
        ? { ...parameter.ui }
        : null,
  };
};

const normalizeParameters = (parameters) => {
  if (!Array.isArray(parameters)) {
    return [];
  }

  return parameters
    .map(normalizeParameter)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
};

const normalizeSupportedDomains = (supportedDomains) => {
  if (!supportedDomains || typeof supportedDomains !== "object") {
    return null;
  }

  const numeric = supportedDomains.numeric || null;
  const linguistic = supportedDomains.linguistic || null;

  return {
    numeric: numeric
      ? {
          enabled: Boolean(numeric.enabled),
          range: {
            min: numeric.range?.min ?? null,
            max: numeric.range?.max ?? null,
          },
        }
      : null,
    linguistic: linguistic
      ? {
          enabled: Boolean(linguistic.enabled),
          minLabels: linguistic.minLabels ?? null,
          maxLabels: linguistic.maxLabels ?? null,
          oddOnly: Boolean(linguistic.oddOnly),
        }
      : null,
  };
};

const normalizeEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== "object") {
    return null;
  }

  const rawPath = normalizeNonEmptyString(endpoint.path);
  const path = rawPath ? `/${rawPath.replace(/^\/+/, "")}` : null;

  if (!path) {
    return null;
  }

  return {
    method: normalizeNonEmptyString(endpoint.method),
    path,
    operationId: normalizeNonEmptyString(endpoint.operationId),
  };
};

const validateManifestTechnicalFields = (manifestModel) => {
  const errors = [];
  const capabilities = manifestModel?.capabilities || {};

  const key = normalizeNonEmptyString(manifestModel?.key);
  const endpointPath = normalizeNonEmptyString(manifestModel?.endpoint?.path);
  const evaluationStructure = normalizeNonEmptyString(
    capabilities.evaluationStructure
  );
  const modelFamilyKey = normalizeNonEmptyString(manifestModel?.modelFamilyKey);
  const modelVersion = normalizeNonEmptyString(manifestModel?.modelVersion);
  const versionLabel = normalizeNonEmptyString(manifestModel?.versionLabel);
  const lifecycleKind = normalizeNonEmptyString(capabilities.lifecycleKind);
  const inputKind = normalizeNonEmptyString(capabilities.inputKind);
  const outputKind = normalizeNonEmptyString(capabilities.outputKind);

  if (!key) {
    errors.push("key");
  }

  if (!endpointPath) {
    errors.push("endpoint.path");
  }
  if (!modelFamilyKey) {
    errors.push("modelFamilyKey");
  }
  if (!modelVersion) {
    errors.push("modelVersion");
  }
  if (!versionLabel) {
    errors.push("versionLabel");
  }

  if (!evaluationStructure) {
    errors.push("capabilities.evaluationStructure");
  } else if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    errors.push(
      `capabilities.evaluationStructure (unsupported: ${evaluationStructure})`
    );
  }

  if (!lifecycleKind) {
    errors.push("capabilities.lifecycleKind");
  } else if (!isSupportedLifecycleKind(lifecycleKind)) {
    errors.push(
      `capabilities.lifecycleKind (unsupported: ${lifecycleKind})`
    );
  }

  if (!inputKind) {
    errors.push("capabilities.inputKind");
  } else if (!SUPPORTED_INPUT_KINDS.has(inputKind)) {
    errors.push(`capabilities.inputKind (unsupported: ${inputKind})`);
  }

  if (!outputKind) {
    errors.push("capabilities.outputKind");
  } else if (!SUPPORTED_OUTPUT_KINDS.has(outputKind)) {
    errors.push(`capabilities.outputKind (unsupported: ${outputKind})`);
  }

  if (typeof capabilities.isConsensus !== "boolean") {
    errors.push("capabilities.isConsensus");
  }

  const parameters = Array.isArray(manifestModel?.parameters)
    ? manifestModel.parameters
    : [];
  const seenKeys = new Set();

  parameters.forEach((parameter, index) => {
    const parameterPath = `parameters[${index}]`;
    const key =
      normalizeNonEmptyString(parameter?.key) ||
      normalizeNonEmptyString(parameter?.name);
    const type = normalizeNonEmptyString(parameter?.type);
    const restrictions =
      parameter?.restrictions && typeof parameter.restrictions === "object"
        ? parameter.restrictions
        : {};

    if (!key) {
      errors.push(`${parameterPath}.key`);
      return;
    }

    if (seenKeys.has(key)) {
      errors.push(`${parameterPath}.key (duplicate: ${key})`);
    }
    seenKeys.add(key);

    if (!type || !SUPPORTED_PARAMETER_TYPES.has(type)) {
      errors.push(`${parameterPath}.type (unsupported: ${type || "unknown"})`);
    }

    Object.keys(restrictions).forEach((restrictionKey) => {
      if (!SUPPORTED_PARAMETER_RESTRICTIONS.has(restrictionKey)) {
        errors.push(`${parameterPath}.restrictions.${restrictionKey} (unsupported)`);
      }
    });

    if (
      restrictions.length !== undefined &&
      restrictions.length !== null &&
      !(Number.isInteger(restrictions.length) || SUPPORTED_DYNAMIC_LENGTHS.has(restrictions.length))
    ) {
      errors.push(`${parameterPath}.restrictions.length (invalid)`);
    }

    if (
      restrictions.ordered !== undefined &&
      restrictions.ordered !== null &&
      !SUPPORTED_ORDERED_RULES.has(restrictions.ordered)
    ) {
      errors.push(`${parameterPath}.restrictions.ordered (invalid)`);
    }

    if (type === "enum" && (!Array.isArray(restrictions.allowed) || restrictions.allowed.length === 0)) {
      errors.push(`${parameterPath}.restrictions.allowed (required for enum)`);
    }
  });

  return errors;
};

const removeStorageFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeStorageFields);
  }

  if (!value || typeof value !== "object") {
    return value ?? null;
  }

  return Object.keys(value)
    .filter((key) => key !== "_id" && key !== "__v")
    .sort()
    .reduce((result, key) => {
      result[key] = removeStorageFields(value[key]);
      return result;
    }, {});
};

const normalizeTechnicalValue = (field, value) => {
  if (field === "apiEndpoint") {
    return normalizeEndpoint(value);
  }

  if (field === "parameters") {
    return normalizeParameters(value);
  }

  if (field === "supportedDomains") {
    return normalizeSupportedDomains(value);
  }

  return removeStorageFields(value);
};

const getManifestTechnicalValue = (manifestModel, field) => {
  if (field === "apiModelKey") {
    return normalizeNonEmptyString(manifestModel?.key);
  }

  if (field === "apiEndpoint") {
    return normalizeEndpoint(manifestModel?.endpoint);
  }

  if (field === "modelFamilyKey") {
    return normalizeNonEmptyString(manifestModel?.modelFamilyKey);
  }

  if (field === "modelVersion") {
    return normalizeNonEmptyString(manifestModel?.modelVersion);
  }

  if (field === "versionLabel") {
    return normalizeNonEmptyString(manifestModel?.versionLabel);
  }

  if (field === "inputKind" || field === "outputKind") {
    return manifestModel?.capabilities?.[field] ?? null;
  }

  if (
    field === "evaluationStructure" ||
    field === "lifecycleKind" ||
    field === "isConsensus" ||
    field === "isMultiCriteria" ||
    field === "supportedDomains" ||
    field === "supportsScenarios"
  ) {
    return manifestModel?.capabilities?.[field] ?? null;
  }

  if (field === "parameters") {
    return manifestModel?.parameters ?? [];
  }

  return manifestModel?.[field] ?? null;
};

const getMongoTechnicalValue = (mongoModel, field) => {
  if (field === "role") {
    return mongoModel?.modelRole ?? null;
  }

  if (field === "status") {
    return mongoModel?.modelStatus ?? null;
  }

  if (!hasOwn(mongoModel, field)) {
    return null;
  }

  return mongoModel[field] ?? null;
};

const areValuesEqual = (left, right) => {
  return JSON.stringify(left) === JSON.stringify(right);
};

const compareTechnicalFields = (manifestModel, mongoModel) => {
  const differences = [];

  for (const field of TECHNICAL_FIELDS) {
    const manifestValue = normalizeTechnicalValue(
      field,
      getManifestTechnicalValue(manifestModel, field)
    );
    const mongoValue = normalizeTechnicalValue(
      field,
      getMongoTechnicalValue(mongoModel, field)
    );
    const mongoFieldPresent = hasOwn(mongoModel, field);

    if (areValuesEqual(manifestValue, mongoValue)) {
      continue;
    }

    differences.push({
      field,
      manifestValue,
      mongoValue,
      mongoFieldPresent,
      reason: mongoFieldPresent
        ? "Values differ"
        : "Field is not stored in Mongo IssueModel",
    });
  }

  return differences;
};

const compareLocalConfigurationFields = (manifestModel, mongoModel) => {
  const differences = [];

  for (const field of LOCAL_CONFIGURATION_FIELDS) {
    const manifestValue = normalizeTechnicalValue(
      field,
      getManifestTechnicalValue(manifestModel, field)
    );
    const mongoValue = normalizeTechnicalValue(
      field,
      getMongoTechnicalValue(mongoModel, field)
    );

    if (areValuesEqual(manifestValue, mongoValue)) {
      continue;
    }

    differences.push({
      field,
      manifestValue,
      mongoValue,
      reason: "Local Admin catalog visibility overrides manifest value",
    });
  }

  return differences;
};

const buildMongoEntries = (issueModels) => {
  return issueModels.map((model, index) => ({
    model,
    index,
    matched: false,
    apiModelKey: String(model?.apiModelKey || "").trim(),
  }));
};

const findMongoMatch = (manifestModel, mongoEntries) => {
  const manifestKey = normalizeNonEmptyString(manifestModel?.key);
  const keyMatches = mongoEntries.filter(
    (entry) =>
      !entry.matched &&
      entry.apiModelKey &&
      entry.apiModelKey === manifestKey
  );

  if (keyMatches.length > 1) {
    return {
      kind: "ambiguous",
      candidates: keyMatches,
      reason: `Multiple Mongo IssueModels already use apiModelKey ${manifestKey}`,
    };
  }

  if (keyMatches.length === 1) {
    return {
      kind: "matched",
      entry: keyMatches[0],
      matchedBy: "apiModelKey",
    };
  }
  return { kind: "missing" };
};

const buildNotSyncableModels = (manifestModels) => {
  return manifestModels
    .filter((model) => model?.publicInIssueCatalog !== true)
    .map((model) => ({
      key: model?.key ?? null,
      role: model?.role ?? null,
      status: model?.status ?? null,
      reason: "Model is not public in issue catalog",
      safeToCreateIssueModel: model?.sync?.safeToCreateIssueModel === true,
    }));
};

const buildManifestSummary = (manifest, manifestModels, publicManifestModels) => {
  return {
    manifestVersion: manifest?.manifestVersion ?? null,
    apiVersion: manifest?.apiVersion ?? null,
    totalModels: manifestModels.length,
    publicIssueModels: publicManifestModels.length,
    nonIssueModels: manifestModels.length - publicManifestModels.length,
  };
};

const getNotSyncableReason = (manifestModel) => {
  if (manifestModel?.publicInIssueCatalog !== true) {
    return "Model is not public in issue catalog";
  }

  if (manifestModel?.sync?.safeToCreateIssueModel !== true) {
    return "Model is not safe to create IssueModel";
  }

  if (manifestModel?.role !== "issueModel") {
    return `Model role ${manifestModel?.role || "unknown"} is not issueModel`;
  }

  return null;
};

const buildModelRow = ({
  manifestModel = null,
  mongoModel = null,
  matched = false,
  matchedBy = null,
  syncState,
  differences = [],
  reason = null,
}) => {
  const capabilities = manifestModel?.capabilities || {};

  return {
    apiModelKey: manifestModel?.key ?? mongoModel?.apiModelKey ?? null,
    displayName: manifestModel?.displayName ?? null,
    mongoName: mongoModel?.name ?? null,
    mongoId: toIdString(mongoModel?._id),
    role: manifestModel?.role ?? mongoModel?.modelRole ?? null,
    status: manifestModel?.status ?? mongoModel?.modelStatus ?? null,
    publicInIssueCatalog:
      mongoModel?.publicInIssueCatalog ?? manifestModel?.publicInIssueCatalog ?? null,
    safeToCreateIssueModel:
      manifestModel?.sync?.safeToCreateIssueModel ?? null,
    evaluationStructure:
      capabilities.evaluationStructure ?? mongoModel?.evaluationStructure ?? null,
    lifecycleKind:
      capabilities.lifecycleKind ?? mongoModel?.lifecycleKind ?? null,
    modelFamilyKey:
      manifestModel?.modelFamilyKey ?? mongoModel?.modelFamilyKey ?? null,
    modelVersion:
      manifestModel?.modelVersion ?? mongoModel?.modelVersion ?? null,
    versionLabel:
      manifestModel?.versionLabel ?? mongoModel?.versionLabel ?? null,
    inputKind: capabilities.inputKind ?? mongoModel?.inputKind ?? null,
    outputKind: capabilities.outputKind ?? mongoModel?.outputKind ?? null,
    isConsensus:
      capabilities.isConsensus ?? mongoModel?.isConsensus ?? null,
    isMultiCriteria:
      capabilities.isMultiCriteria ?? mongoModel?.isMultiCriteria ?? null,
    supportsScenarios:
      capabilities.supportsScenarios ?? mongoModel?.supportsScenarios ?? null,
    supportedDomains:
      normalizeSupportedDomains(capabilities.supportedDomains) ??
      normalizeSupportedDomains(mongoModel?.supportedDomains),
    endpoint:
      normalizeEndpoint(manifestModel?.endpoint) ??
      normalizeEndpoint(mongoModel?.apiEndpoint),
    parameters: normalizeParameters(manifestModel?.parameters ?? mongoModel?.parameters),
    syncState,
    matched,
    matchedBy,
    differences,
    reason,
    manifestSync: mongoModel?.manifestSync ?? null,
  };
};

/**
 * Builds a read-only dry-run report comparing ApiModels manifest data to Mongo IssueModels.
 *
 * @param {Object} params Report input.
 * @param {Object} params.manifest Manifest data returned by ApiModels.
 * @param {Array<Object>} params.issueModels Current Mongo IssueModel documents.
 * @returns {Object}
 */
export const buildModelManifestDryRunReport = ({
  manifest,
  issueModels = [],
}) => {
  const manifestModels = Array.isArray(manifest?.models) ? manifest.models : [];
  const publicManifestModels = manifestModels.filter(
    (model) => model?.publicInIssueCatalog === true
  );
  const mongoModels = Array.isArray(issueModels) ? issueModels : [];
  const mongoEntries = buildMongoEntries(mongoModels);
  const matches = [];
  const modelRows = [];
  const missingInMongo = [];
  const invalidManifestTechnicalFields = [];
  const technicalDifferences = [];
  const localConfigurationDifferences = [];
  const warnings = [];
  const recommendations = [];

  if (mongoModels.length === 0) {
    warnings.push("No IssueModel documents found in MongoDB.");
  }

  for (const manifestModel of publicManifestModels) {
    const technicalValidationErrors = validateManifestTechnicalFields(
      manifestModel
    );

    if (technicalValidationErrors.length > 0) {
      invalidManifestTechnicalFields.push({
        key: manifestModel?.key ?? null,
        displayName: manifestModel?.displayName ?? null,
        errors: technicalValidationErrors,
      });
      warnings.push(
        `Public manifest model ${manifestModel?.key || "unknown"} has invalid required technical fields: ${technicalValidationErrors.join(", ")}`
      );
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Invalid technical config",
          reason:
            "Manifest model is missing or has invalid required technical fields",
          differences: technicalValidationErrors.map((field) => ({
            field,
            manifestValue: null,
            mongoValue: null,
            reason: "Invalid manifest technical field",
          })),
        })
      );
      continue;
    }

    const match = findMongoMatch(manifestModel, mongoEntries);

    if (match.kind === "missing") {
      missingInMongo.push({
        key: manifestModel?.key ?? null,
        displayName: manifestModel?.displayName ?? null,
        reason: "Public manifest model was not found in Mongo IssueModels",
      });
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Missing in Mongo",
          reason: "Public manifest model was not found in Mongo IssueModels",
        })
      );
      continue;
    }

    if (match.kind === "ambiguous") {
      warnings.push(match.reason);
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Ambiguous in Mongo",
          reason: match.reason,
        })
      );
      continue;
    }

    match.entry.matched = true;

    const differences = compareTechnicalFields(manifestModel, match.entry.model);
    const configurationDifferences = compareLocalConfigurationFields(
      manifestModel,
      match.entry.model
    );
    const syncState =
      differences.length > 0 ? "Has differences" : "Synced";
    const matchReport = {
      manifestKey: manifestModel?.key ?? null,
      manifestDisplayName: manifestModel?.displayName ?? null,
      mongoName: match.entry.model?.name ?? null,
      mongoId: toIdString(match.entry.model?._id),
      status: "matched",
      matchedBy: match.matchedBy,
      differences,
    };

    matches.push(matchReport);
    modelRows.push(
      buildModelRow({
        manifestModel,
        mongoModel: match.entry.model,
        matched: true,
        matchedBy: match.matchedBy,
        syncState,
        differences,
      })
    );

    if (differences.length > 0) {
      technicalDifferences.push({
        manifestKey: matchReport.manifestKey,
        mongoName: matchReport.mongoName,
        mongoId: matchReport.mongoId,
        differences,
      });
    }

    if (configurationDifferences.length > 0) {
      localConfigurationDifferences.push({
        manifestKey: matchReport.manifestKey,
        mongoName: matchReport.mongoName,
        mongoId: matchReport.mongoId,
        differences: configurationDifferences,
      });
    }
  }

  const missingInManifest = mongoEntries
    .filter((entry) => !entry.matched)
    .map((entry) => ({
      mongoName: entry.model?.name ?? null,
      mongoId: toIdString(entry.model?._id),
      reason: "Mongo IssueModel is not present in public manifest models",
    }));

  mongoEntries
    .filter((entry) => !entry.matched)
    .forEach((entry) => {
      modelRows.push(
        buildModelRow({
          mongoModel: entry.model,
          syncState:
            entry.model?.modelStatus === "stale"
              ? "Stale"
              : "Missing in manifest",
          reason: "Mongo IssueModel is not present in public manifest models",
        })
      );
    });

  for (const missingModel of missingInMongo) {
    warnings.push(
      `Public manifest model ${missingModel.key} was not found in Mongo IssueModels.`
    );
  }

  for (const missingModel of missingInManifest) {
    warnings.push(
      `Mongo IssueModel ${missingModel.mongoName} is not present in public manifest models.`
    );
  }

  if (technicalDifferences.length > 0) {
    warnings.push("Technical differences were detected in matched models.");
    recommendations.push(
      "Review technical differences before enabling any write synchronization."
    );
  }

  if (invalidManifestTechnicalFields.length > 0) {
    recommendations.push(
      "Fix invalid required technical fields in public manifest models before synchronization."
    );
  }

  if (localConfigurationDifferences.length > 0) {
    recommendations.push(
      "Review local catalog visibility overrides; sync preserves Admin visibility choices."
    );
  }

  if (missingInMongo.length > 0) {
    recommendations.push(
      "Review missing public manifest models before enabling model creation."
    );
  }

  if (missingInManifest.length > 0) {
    recommendations.push(
      "Review Mongo IssueModels that are not present in the public manifest."
    );
  }

  const notSyncable = buildNotSyncableModels(manifestModels);

  manifestModels
    .filter((model) => model?.publicInIssueCatalog !== true)
    .forEach((manifestModel) => {
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Not syncable",
          reason: getNotSyncableReason(manifestModel),
        })
      );
    });

  if (notSyncable.length > 0) {
    recommendations.push(
      "Keep non-public manifest models out of IssueModel synchronization."
    );
  }

  return {
    manifest: buildManifestSummary(
      manifest,
      manifestModels,
      publicManifestModels
    ),
    summary: {
      matched: matches.length,
      missingInMongo,
      missingInManifest,
      notSyncable,
      invalidManifestTechnicalFields,
      technicalDifferences,
      localConfigurationDifferences,
    },
    matches,
    modelRows,
    warnings,
    recommendations,
    preservedEditorialFields: PRESERVED_EDITORIAL_FIELDS,
  };
};

/**
 * Runs the Backend dry-run by fetching the manifest and reading IssueModels without writes.
 *
 * @param {Object} [options] Dry-run options.
 * @param {Object} [options.httpClient] HTTP client compatible with axios.
 * @param {string} [options.apiModelsBaseUrl] ApiModels base URL.
 * @returns {Promise<Object>}
 */
export const runModelManifestDryRun = async (options = {}) => {
  const manifest = await fetchModelManifest(options);
  const issueModels = await IssueModel.find().select("-__v").lean();

  return buildModelManifestDryRunReport({
    manifest,
    issueModels,
  });
};

import { IssueModel } from "../../models/IssueModels.js";
import { fetchModelManifest } from "./modelManifestClient.js";

const TECHNICAL_FIELDS = [
  "evaluationStructure",
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

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const toIdString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const normalizeModelIdentity = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
};

const compactIdentity = (value) => normalizeModelIdentity(value).replace(/\s/g, "");

const uniqueIdentityTokens = (values) => {
  const seen = new Set();
  const tokens = [];

  for (const value of values) {
    const normalized = normalizeModelIdentity(value);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tokens.push({
      raw: String(value),
      normalized,
      compact: normalized.replace(/\s/g, ""),
    });
  }

  return tokens;
};

const getManifestIdentityTokens = (manifestModel) => {
  return uniqueIdentityTokens([
    manifestModel?.displayName,
    ...(Array.isArray(manifestModel?.aliases) ? manifestModel.aliases : []),
    manifestModel?.key,
  ]);
};

const normalizeParameter = (parameter = {}) => {
  const restrictions = parameter?.restrictions || {};

  return {
    name: parameter?.name ?? null,
    type: parameter?.type ?? null,
    default: parameter?.default ?? null,
    restrictions: {
      min: restrictions.min ?? null,
      max: restrictions.max ?? null,
      step: restrictions.step ?? null,
      length: restrictions.length ?? null,
      sum: restrictions.sum ?? null,
      allowed: restrictions.allowed ?? null,
    },
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
  if (field === "parameters") {
    return normalizeParameters(value);
  }

  if (field === "supportedDomains") {
    return normalizeSupportedDomains(value);
  }

  return removeStorageFields(value);
};

const getManifestTechnicalValue = (manifestModel, field) => {
  if (
    field === "evaluationStructure" ||
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
    name: model?.name || "",
    normalized: normalizeModelIdentity(model?.name),
    compact: compactIdentity(model?.name),
  }));
};

const findMongoMatch = (manifestModel, mongoEntries) => {
  const keyMatch = mongoEntries.find(
    (entry) =>
      !entry.matched &&
      entry.apiModelKey &&
      entry.apiModelKey === manifestModel?.key
  );

  if (keyMatch) {
    return {
      entry: keyMatch,
      matchedBy: "apiModelKey",
    };
  }

  const tokens = getManifestIdentityTokens(manifestModel);

  for (const token of tokens) {
    const exactMatch = mongoEntries.find(
      (entry) => !entry.matched && entry.normalized === token.normalized
    );

    if (exactMatch) {
      return {
        entry: exactMatch,
        matchedBy: token.raw,
      };
    }
  }

  for (const token of tokens) {
    const compactMatch = mongoEntries.find(
      (entry) => !entry.matched && entry.compact === token.compact
    );

    if (compactMatch) {
      return {
        entry: compactMatch,
        matchedBy: token.raw,
      };
    }
  }

  return null;
};

const findAllMongoCandidates = (manifestModel, mongoEntries) => {
  const tokens = getManifestIdentityTokens(manifestModel);

  return mongoEntries.filter((entry) =>
    entry.apiModelKey === manifestModel?.key ||
    tokens.some(
      (token) =>
        entry.normalized === token.normalized || entry.compact === token.compact
    )
  );
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
    isConsensus:
      capabilities.isConsensus ?? mongoModel?.isConsensus ?? null,
    isMultiCriteria:
      capabilities.isMultiCriteria ?? mongoModel?.isMultiCriteria ?? null,
    supportsScenarios:
      capabilities.supportsScenarios ?? mongoModel?.supportsScenarios ?? null,
    supportedDomains:
      normalizeSupportedDomains(capabilities.supportedDomains) ??
      normalizeSupportedDomains(mongoModel?.supportedDomains),
    endpoint: manifestModel?.endpoint ?? mongoModel?.apiEndpoint ?? null,
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
  const technicalDifferences = [];
  const localConfigurationDifferences = [];
  const warnings = [];
  const recommendations = [];

  if (mongoModels.length === 0) {
    warnings.push("No IssueModel documents found in MongoDB.");
  }

  for (const manifestModel of publicManifestModels) {
    const candidates = findAllMongoCandidates(manifestModel, mongoEntries);
    const match = findMongoMatch(manifestModel, mongoEntries);

    if (!match) {
      missingInMongo.push({
        key: manifestModel?.key ?? null,
        displayName: manifestModel?.displayName ?? null,
        aliases: Array.isArray(manifestModel?.aliases)
          ? manifestModel.aliases
          : [],
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

    if (candidates.length > 1) {
      warnings.push(
        `Multiple Mongo IssueModels match manifest model ${manifestModel.key}.`
      );
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

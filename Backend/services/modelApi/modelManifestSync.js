import { IssueModel } from "../../models/IssueModels.js";
import { fetchModelManifest } from "./modelManifestClient.js";

const MANIFEST_SYNC_SOURCE = "ApiModels";
const EDITORIAL_FALLBACKS = {
  smallDescription: "Model imported from ApiModels manifest.",
  extendDescription: "This model was imported from the ApiModels manifest.",
  moreInfoUrl: "https://example.com",
};

const TECHNICAL_UPDATE_FIELDS = [
  "apiModelKey",
  "modelRole",
  "modelStatus",
  "supportsScenarios",
  "apiEndpoint",
  "isConsensus",
  "isMultiCriteria",
  "evaluationStructure",
  "parameters",
  "supportedDomains",
];

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

const normalizeEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== "object") {
    return undefined;
  }

  const rawPath = String(endpoint.path || "").trim();
  const path = rawPath
    ? `/${rawPath.replace(/^\/+/, "")}`
    : undefined;

  return {
    method: String(endpoint.method || "").trim() || undefined,
    path,
    operationId: String(endpoint.operationId || "").trim() || undefined,
  };
};

const toPlainValue = (value) => {
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

const normalizeForStableStringify = (value) => {
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
      .filter((key) => plainValue[key] !== undefined)
      .sort()
      .reduce((normalized, key) => {
        normalized[key] = normalizeForStableStringify(plainValue[key]);
        return normalized;
      }, {});
  }

  return plainValue;
};

const stableStringify = (value) => {
  return JSON.stringify(normalizeForStableStringify(value));
};

const normalizeComparableFieldValue = (field, value) => {
  const plainValue = toPlainValue(value);

  if (field === "apiEndpoint") {
    return normalizeEndpoint(plainValue) || null;
  }

  if (field === "parameters") {
    return normalizeParameters(plainValue);
  }

  if (field === "supportedDomains") {
    return normalizeSupportedDomains(plainValue);
  }

  return plainValue ?? null;
};

const isValueEqual = (field, left, right) => {
  return (
    stableStringify(normalizeComparableFieldValue(field, left)) ===
    stableStringify(normalizeComparableFieldValue(field, right))
  );
};

const buildMongoEntries = (issueModels) => {
  return issueModels.map((model) => ({
    model,
    matched: false,
    apiModelKey: String(model.apiModelKey || "").trim(),
    normalized: normalizeModelIdentity(model.name),
    compact: compactIdentity(model.name),
  }));
};

const getSyncBlockerReason = (manifestModel) => {
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

const buildSkippedManifestModel = (manifestModel, reason) => ({
  apiModelKey: manifestModel?.key ?? null,
  displayName: manifestModel?.displayName ?? null,
  role: manifestModel?.role ?? null,
  status: manifestModel?.status ?? null,
  publicInIssueCatalog: manifestModel?.publicInIssueCatalog === true,
  safeToCreateIssueModel:
    manifestModel?.sync?.safeToCreateIssueModel === true,
  reason,
});

const validateSyncableManifestModel = (manifestModel) => {
  const missingFields = [];
  const capabilities = manifestModel?.capabilities || {};

  if (!manifestModel?.key) missingFields.push("key");
  if (!manifestModel?.displayName) missingFields.push("displayName");
  if (!capabilities.evaluationStructure) {
    missingFields.push("capabilities.evaluationStructure");
  }
  if (typeof capabilities.isConsensus !== "boolean") {
    missingFields.push("capabilities.isConsensus");
  }
  if (typeof capabilities.isMultiCriteria !== "boolean") {
    missingFields.push("capabilities.isMultiCriteria");
  }
  if (!capabilities.supportedDomains) {
    missingFields.push("capabilities.supportedDomains");
  }

  return missingFields;
};

const buildTechnicalPayload = ({ manifest, manifestModel, now }) => {
  const capabilities = manifestModel.capabilities || {};

  return {
    apiModelKey: manifestModel.key,
    modelRole: manifestModel.role,
    modelStatus: manifestModel.status,
    publicInIssueCatalog: manifestModel.publicInIssueCatalog === true,
    supportsScenarios: capabilities.supportsScenarios === true,
    apiEndpoint: normalizeEndpoint(manifestModel.endpoint),
    isConsensus: capabilities.isConsensus,
    isMultiCriteria: capabilities.isMultiCriteria,
    evaluationStructure: capabilities.evaluationStructure,
    parameters: normalizeParameters(manifestModel.parameters),
    supportedDomains: normalizeSupportedDomains(capabilities.supportedDomains),
    manifestSync: {
      source: MANIFEST_SYNC_SOURCE,
      manifestVersion: manifest.manifestVersion,
      apiVersion: manifest.apiVersion,
      lastSyncedAt: now,
      lastSeenAt: now,
    },
  };
};

const buildEditorialFieldsForCreate = (manifestModel, warnings) => {
  const documentation = manifestModel?.documentation || {};
  const moreInfoUrl = String(documentation.moreInfoUrl || "").trim();

  if (!moreInfoUrl) {
    warnings.push(
      `Model ${manifestModel.key} imported with fallback moreInfoUrl; manual review required.`
    );
  }

  return {
    smallDescription:
      String(documentation.summary || "").trim() ||
      EDITORIAL_FALLBACKS.smallDescription,
    extendDescription:
      String(documentation.description || "").trim() ||
      EDITORIAL_FALLBACKS.extendDescription,
    moreInfoUrl: moreInfoUrl || EDITORIAL_FALLBACKS.moreInfoUrl,
  };
};

const findByApiModelKey = (manifestModel, mongoEntries) => {
  const key = String(manifestModel?.key || "").trim();

  if (!key) {
    return [];
  }

  return mongoEntries.filter((entry) => entry.apiModelKey === key);
};

const findByManifestIdentity = (manifestModel, mongoEntries) => {
  const tokens = getManifestIdentityTokens(manifestModel);

  return mongoEntries.filter((entry) => {
    if (entry.apiModelKey) {
      return false;
    }

    return tokens.some(
      (token) =>
        entry.normalized === token.normalized || entry.compact === token.compact
    );
  });
};

const findMongoMatch = (manifestModel, mongoEntries) => {
  const keyMatches = findByApiModelKey(manifestModel, mongoEntries);

  if (keyMatches.length > 1) {
    return {
      status: "ambiguous",
      reason: `Multiple IssueModels already use apiModelKey ${manifestModel.key}`,
      candidates: keyMatches,
    };
  }

  if (keyMatches.length === 1) {
    return {
      status: "matched",
      entry: keyMatches[0],
      matchedBy: "apiModelKey",
    };
  }

  const nameMatches = findByManifestIdentity(manifestModel, mongoEntries);

  if (nameMatches.length > 1) {
    return {
      status: "ambiguous",
      reason: `Multiple IssueModels match aliases for ${manifestModel.key}`,
      candidates: nameMatches,
    };
  }

  if (nameMatches.length === 1) {
    return {
      status: "matched",
      entry: nameMatches[0],
      matchedBy: "nameOrAlias",
    };
  }

  return {
    status: "missing",
  };
};

const getChangedTechnicalFields = (model, payload) => {
  return TECHNICAL_UPDATE_FIELDS.filter(
    (field) => !isValueEqual(field, model[field], payload[field])
  );
};

const buildExistingModelUpdatePayload = (payload) => {
  const { publicInIssueCatalog: _publicInIssueCatalog, ...updatePayload } =
    payload;

  return updatePayload;
};

const updateExistingModel = async ({ entry, payload, manifestModel }) => {
  const updatePayload = buildExistingModelUpdatePayload(payload);
  const updatedFields = getChangedTechnicalFields(entry.model, updatePayload);

  entry.matched = true;

  if (updatedFields.length === 0) {
    return {
      status: "unchanged",
      item: {
        apiModelKey: manifestModel.key,
        mongoName: entry.model.name,
        mongoId: toIdString(entry.model._id),
        matchedBy: entry.matchedBy,
        reason: "No technical changes detected",
      },
    };
  }

  entry.model.set(updatePayload);
  await entry.model.save();

  return {
    status: "updated",
    item: {
      apiModelKey: manifestModel.key,
      mongoName: entry.model.name,
      mongoId: toIdString(entry.model._id),
      matchedBy: entry.matchedBy,
      updatedFields,
    },
  };
};

const buildVisibilityOverrideWarning = ({ model, payload, manifestModel }) => {
  const localVisibility = model.publicInIssueCatalog !== false;
  const manifestVisibility = payload.publicInIssueCatalog === true;

  if (localVisibility === manifestVisibility) {
    return null;
  }

  return `IssueModel ${model.name} local publicInIssueCatalog=${localVisibility} differs from manifest model ${manifestModel.key}; sync preserved local Admin visibility.`;
};

const createIssueModelFromManifest = async ({
  manifestModel,
  payload,
  warnings,
}) => {
  const createdModel = await IssueModel.create({
    name: manifestModel.displayName,
    ...payload,
    ...buildEditorialFieldsForCreate(manifestModel, warnings),
  });

  return {
    apiModelKey: manifestModel.key,
    mongoName: createdModel.name,
    mongoId: toIdString(createdModel._id),
    createdFields: [
      "name",
      "apiModelKey",
      "modelRole",
      "modelStatus",
      "publicInIssueCatalog",
      "supportsScenarios",
      "apiEndpoint",
      "isConsensus",
      "isMultiCriteria",
      "evaluationStructure",
      "parameters",
      "supportedDomains",
      "manifestSync",
      "smallDescription",
      "extendDescription",
      "moreInfoUrl",
    ],
  };
};

const canMarkStale = (model) => {
  return model?.manifestSync?.source === MANIFEST_SYNC_SOURCE;
};

const markStaleModels = async ({ mongoEntries, syncableKeys, now, warnings }) => {
  const stale = [];

  for (const entry of mongoEntries) {
    const apiModelKey = String(entry.model.apiModelKey || "").trim();

    if (entry.matched || !apiModelKey || syncableKeys.has(apiModelKey)) {
      continue;
    }

    if (!canMarkStale(entry.model)) {
      warnings.push(
        `IssueModel ${entry.model.name} has apiModelKey ${apiModelKey} but is not managed by ApiModels; stale status was not changed.`
      );
      continue;
    }

    if (entry.model.modelStatus !== "stale") {
      entry.model.modelStatus = "stale";

      entry.model.manifestSync = {
        ...(entry.model.manifestSync?.toObject?.() ||
          entry.model.manifestSync ||
          {}),
        source: MANIFEST_SYNC_SOURCE,
        lastSyncedAt: now,
      };

      await entry.model.save();

      stale.push({
        apiModelKey,
        mongoName: entry.model.name,
        mongoId: toIdString(entry.model._id),
        updatedFields: ["modelStatus"],
        reason: "IssueModel is not present in public syncable manifest models",
      });
    }
  }

  for (const entry of mongoEntries) {
    if (entry.matched || entry.apiModelKey) {
      continue;
    }

    warnings.push(
      `IssueModel ${entry.model.name} has no apiModelKey and was not matched to a public manifest model.`
    );
  }

  return stale;
};

const buildSummary = ({
  created,
  updated,
  unchanged,
  skipped,
  stale,
  warnings,
}) => ({
  created: created.length,
  updated: updated.length,
  unchanged: unchanged.length,
  skipped: skipped.length,
  stale: stale.length,
  warnings: warnings.length,
});

/**
 * Synchronizes public ApiModels manifest entries into Mongo IssueModels.
 *
 * @param {Object} [options] Synchronization options.
 * @param {Object} [options.httpClient] HTTP client compatible with axios.
 * @param {string} [options.apiModelsBaseUrl] ApiModels base URL.
 * @returns {Promise<Object>} Synchronization report.
 */
export const syncModelManifestToIssueModels = async (options = {}) => {
  const manifest = await fetchModelManifest(options);
  const manifestModels = Array.isArray(manifest.models) ? manifest.models : [];
  const issueModels = await IssueModel.find();
  const mongoEntries = buildMongoEntries(issueModels);
  const now = new Date();
  const created = [];
  const updated = [];
  const unchanged = [];
  const skipped = [];
  const warnings = [];
  const syncableKeys = new Set();

  for (const manifestModel of manifestModels) {
    const blockerReason = getSyncBlockerReason(manifestModel);

    if (blockerReason) {
      skipped.push(buildSkippedManifestModel(manifestModel, blockerReason));
      continue;
    }

    const missingFields = validateSyncableManifestModel(manifestModel);

    if (missingFields.length > 0) {
      const reason = "Manifest model is missing required IssueModel fields";
      skipped.push({
        ...buildSkippedManifestModel(manifestModel, reason),
        missingFields,
      });
      warnings.push(
        `Model ${manifestModel?.key || "unknown"} was skipped: ${reason}.`
      );
      continue;
    }

    syncableKeys.add(manifestModel.key);
    const payload = buildTechnicalPayload({
      manifest,
      manifestModel,
      now,
    });
    const match = findMongoMatch(manifestModel, mongoEntries);

    if (match.status === "ambiguous") {
      skipped.push(buildSkippedManifestModel(manifestModel, match.reason));
      warnings.push(match.reason);
      continue;
    }

    if (match.status === "matched") {
      match.entry.matchedBy = match.matchedBy;
      const visibilityWarning = buildVisibilityOverrideWarning({
        model: match.entry.model,
        payload,
        manifestModel,
      });

      if (visibilityWarning) {
        warnings.push(visibilityWarning);
      }

      const syncResult = await updateExistingModel({
        entry: match.entry,
        payload,
        manifestModel,
      });

      if (syncResult.status === "updated") {
        updated.push(syncResult.item);
      } else {
        unchanged.push(syncResult.item);
      }

      continue;
    }

    created.push(
      await createIssueModelFromManifest({
        manifestModel,
        payload,
        warnings,
      })
    );
  }

  const stale = await markStaleModels({
    mongoEntries,
    syncableKeys,
    now,
    warnings,
  });

  return {
    created,
    updated,
    unchanged,
    skipped,
    stale,
    warnings,
    summary: buildSummary({
      created,
      updated,
      unchanged,
      skipped,
      stale,
      warnings,
    }),
  };
};

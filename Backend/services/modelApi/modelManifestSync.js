import { IssueModel } from "../../models/IssueModels.js";
import { fetchModelManifest } from "./modelManifestClient.js";
import { EVALUATION_STRUCTURES } from "../../modules/issues/issue.evaluationStructure.js";
import { isSupportedLifecycleKind } from "../../modules/issues/issue.lifecycleKind.js";

const MANIFEST_SYNC_SOURCE = "ApiModels";
const EDITORIAL_FALLBACKS = {
  smallDescription: "Model imported from ApiModels manifest.",
  extendDescription: "This model was imported from the ApiModels manifest.",
  moreInfoUrl: "https://example.com",
};

const TECHNICAL_UPDATE_FIELDS = [
  "apiModelKey",
  "modelFamilyKey",
  "modelVersion",
  "versionLabel",
  "modelRole",
  "modelStatus",
  "supportsScenarios",
  "apiEndpoint",
  "isConsensus",
  "isMultiCriteria",
  "evaluationStructure",
  "lifecycleKind",
  "inputKind",
  "outputKind",
  "criterionTypes",
  "parameters",
  "supportedDomains",
];

const CATALOG_UPDATE_FIELDS = [
  "smallDescription",
  "extendDescription",
  "moreInfoUrl",
];

const SYNC_UPDATE_FIELDS = [
  ...TECHNICAL_UPDATE_FIELDS,
  ...CATALOG_UPDATE_FIELDS,
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

const toIdString = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const getCatalogText = (manifestModel, field) => {
  const catalog = manifestModel?.catalog || {};
  const documentation = manifestModel?.documentation || {};

  if (field === "smallDescription") {
    return (
      normalizeNonEmptyString(catalog.smallDescription) ||
      normalizeNonEmptyString(documentation.summary) ||
      EDITORIAL_FALLBACKS.smallDescription
    );
  }

  if (field === "extendDescription") {
    return (
      normalizeNonEmptyString(catalog.extendDescription) ||
      normalizeNonEmptyString(documentation.description) ||
      normalizeNonEmptyString(catalog.smallDescription) ||
      normalizeNonEmptyString(documentation.summary) ||
      EDITORIAL_FALLBACKS.extendDescription
    );
  }

  if (field === "moreInfoUrl") {
    return (
      normalizeNonEmptyString(catalog.moreInfoUrl) ||
      normalizeNonEmptyString(documentation.moreInfoUrl) ||
      null
    );
  }

  return null;
};

const buildCatalogPayload = (manifestModel) => {
  const payload = {
    smallDescription: getCatalogText(manifestModel, "smallDescription"),
    extendDescription: getCatalogText(manifestModel, "extendDescription"),
  };

  const moreInfoUrl = getCatalogText(manifestModel, "moreInfoUrl");

  if (moreInfoUrl) {
    payload.moreInfoUrl = moreInfoUrl;
  }

  return payload;
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
  const semanticRole = normalizeNonEmptyString(parameter?.semanticRole);

  return {
    key: key ?? null,
    name: key ?? null,
    label: normalizeNonEmptyString(parameter?.label) ?? null,
    description: normalizeNonEmptyString(parameter?.description) ?? null,
    type: parameter?.type ?? null,
    scope: normalizeNonEmptyString(parameter?.scope) ?? null,
    semanticRole: semanticRole ?? null,
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

const normalizeCriterionTypes = (criterionTypes) => {
  if (!criterionTypes || typeof criterionTypes !== "object") {
    return null;
  }

  const canonical = Array.isArray(criterionTypes.canonical)
    ? criterionTypes.canonical
    : [];
  const aliases = criterionTypes.aliases;

  if (!aliases || typeof aliases !== "object") {
    return {
      canonical,
      aliases: undefined,
    };
  }

  if (aliases instanceof Map) {
    return {
      canonical,
      aliases: Object.fromEntries(aliases.entries()),
    };
  }

  return {
    canonical,
    aliases,
  };
};

const normalizeEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== "object") {
    return undefined;
  }

  const rawPath = normalizeNonEmptyString(endpoint.path);
  const path = rawPath ? `/${rawPath.replace(/^\/+/, "")}` : undefined;

  if (!path) {
    return undefined;
  }

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

  if (field === "criterionTypes") {
    return normalizeCriterionTypes(plainValue);
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

  const manifestKey = normalizeNonEmptyString(manifestModel?.key);
  const displayName = normalizeNonEmptyString(manifestModel?.displayName);
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

  if (!manifestKey) missingFields.push("key");
  if (!displayName) missingFields.push("displayName");
  if (!endpointPath) missingFields.push("endpoint.path");
  if (!modelFamilyKey) missingFields.push("modelFamilyKey");
  if (!modelVersion) missingFields.push("modelVersion");
  if (!versionLabel) missingFields.push("versionLabel");

  if (!evaluationStructure) {
    missingFields.push("capabilities.evaluationStructure");
  } else if (!SUPPORTED_EVALUATION_STRUCTURES.has(evaluationStructure)) {
    missingFields.push(
      `capabilities.evaluationStructure (unsupported: ${evaluationStructure})`
    );
  }

  if (!lifecycleKind) {
    missingFields.push("capabilities.lifecycleKind");
  } else if (!isSupportedLifecycleKind(lifecycleKind)) {
    missingFields.push(
      `capabilities.lifecycleKind (unsupported: ${lifecycleKind})`
    );
  }

  if (!inputKind) {
    missingFields.push("capabilities.inputKind");
  } else if (!SUPPORTED_INPUT_KINDS.has(inputKind)) {
    missingFields.push(`capabilities.inputKind (unsupported: ${inputKind})`);
  }

  if (!outputKind) {
    missingFields.push("capabilities.outputKind");
  } else if (!SUPPORTED_OUTPUT_KINDS.has(outputKind)) {
    missingFields.push(`capabilities.outputKind (unsupported: ${outputKind})`);
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
      missingFields.push(`${parameterPath}.key`);
      return;
    }

    if (seenKeys.has(key)) {
      missingFields.push(`${parameterPath}.key (duplicate: ${key})`);
    }
    seenKeys.add(key);

    if (!type || !SUPPORTED_PARAMETER_TYPES.has(type)) {
      missingFields.push(`${parameterPath}.type (unsupported: ${type || "unknown"})`);
    }

    Object.keys(restrictions).forEach((restrictionKey) => {
      if (!SUPPORTED_PARAMETER_RESTRICTIONS.has(restrictionKey)) {
        missingFields.push(
          `${parameterPath}.restrictions.${restrictionKey} (unsupported)`
        );
      }
    });

    if (
      restrictions.length !== undefined &&
      restrictions.length !== null &&
      !(Number.isInteger(restrictions.length) || SUPPORTED_DYNAMIC_LENGTHS.has(restrictions.length))
    ) {
      missingFields.push(`${parameterPath}.restrictions.length (invalid)`);
    }

    if (
      restrictions.ordered !== undefined &&
      restrictions.ordered !== null &&
      !SUPPORTED_ORDERED_RULES.has(restrictions.ordered)
    ) {
      missingFields.push(`${parameterPath}.restrictions.ordered (invalid)`);
    }

    if (type === "enum" && (!Array.isArray(restrictions.allowed) || restrictions.allowed.length === 0)) {
      missingFields.push(`${parameterPath}.restrictions.allowed (required for enum)`);
    }
  });

  return missingFields;
};

const buildTechnicalPayload = ({ manifest, manifestModel, now }) => {
  const capabilities = manifestModel.capabilities || {};
  const apiModelKey = normalizeNonEmptyString(manifestModel.key);
  const modelFamilyKey = normalizeNonEmptyString(manifestModel.modelFamilyKey);
  const modelVersion = normalizeNonEmptyString(manifestModel.modelVersion);
  const versionLabel = normalizeNonEmptyString(manifestModel.versionLabel);
  const evaluationStructure = normalizeNonEmptyString(
    capabilities.evaluationStructure
  );
  const lifecycleKind = normalizeNonEmptyString(capabilities.lifecycleKind);
  const inputKind = normalizeNonEmptyString(capabilities.inputKind);
  const outputKind = normalizeNonEmptyString(capabilities.outputKind);

  return {
    apiModelKey,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    modelRole: manifestModel.role,
    modelStatus: manifestModel.status,
    publicInIssueCatalog: manifestModel.publicInIssueCatalog === true,
    supportsScenarios: capabilities.supportsScenarios === true,
    apiEndpoint: normalizeEndpoint(manifestModel.endpoint),
    isConsensus: capabilities.isConsensus,
    isMultiCriteria: capabilities.isMultiCriteria,
    evaluationStructure,
    lifecycleKind,
    inputKind,
    outputKind,
    criterionTypes: normalizeCriterionTypes(manifestModel.criterionTypes),
    parameters: normalizeParameters(manifestModel.parameters),
    supportedDomains: normalizeSupportedDomains(capabilities.supportedDomains),
    ...buildCatalogPayload(manifestModel),
    manifestSync: {
      source: MANIFEST_SYNC_SOURCE,
      manifestVersion: manifest.manifestVersion,
      apiVersion: manifest.apiVersion,
      lastSyncedAt: now,
      lastSeenAt: now,
    },
  };
};

const findByApiModelKey = (manifestModel, mongoEntries) => {
  const key = String(manifestModel?.key || "").trim();

  if (!key) {
    return [];
  }

  return mongoEntries.filter((entry) => entry.apiModelKey === key);
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

  return {
    status: "missing",
  };
};

const getChangedSyncFields = (model, payload) => {
  return SYNC_UPDATE_FIELDS.filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(payload, field) &&
      !isValueEqual(field, model[field], payload[field])
  );
};

const buildExistingModelUpdatePayload = (payload) => {
  const { publicInIssueCatalog: _publicInIssueCatalog, ...updatePayload } =
    payload;

  return updatePayload;
};

const updateExistingModel = async ({ entry, payload, manifestModel }) => {
  const updatePayload = buildExistingModelUpdatePayload(payload);
  const updatedFields = getChangedSyncFields(entry.model, updatePayload);

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
    moreInfoUrl:
      payload.moreInfoUrl ||
      EDITORIAL_FALLBACKS.moreInfoUrl,
  });

  return {
    apiModelKey: manifestModel.key,
    mongoName: createdModel.name,
    mongoId: toIdString(createdModel._id),
    createdFields: [
      "name",
      "apiModelKey",
      "modelFamilyKey",
      "modelVersion",
      "versionLabel",
      "modelRole",
      "modelStatus",
      "publicInIssueCatalog",
      "supportsScenarios",
      "apiEndpoint",
      "isConsensus",
      "isMultiCriteria",
      "evaluationStructure",
      "lifecycleKind",
      "inputKind",
      "outputKind",
      "criterionTypes",
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
      const reason =
        "Manifest model is missing or has invalid required technical fields";
      skipped.push({
        ...buildSkippedManifestModel(manifestModel, reason),
        missingFields,
      });
      warnings.push(
        `Model ${manifestModel?.key || "unknown"} was skipped: ${reason}.`
      );
      continue;
    }

    const payload = buildTechnicalPayload({
      manifest,
      manifestModel,
      now,
    });
    syncableKeys.add(payload.apiModelKey);
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

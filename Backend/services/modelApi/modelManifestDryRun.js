import { IssueModel } from "../../models/IssueModels.js";
import { hasOwnKey } from "../../utils/common/objects.js";
import { fetchModelManifest } from "./modelManifestClient.js";
import {
  buildManifestTechnicalProjection,
  getSyncBlockerReason,
  isValueEqual,
  normalizeComparableFieldValue,
  normalizeEndpoint,
  normalizeParameters,
  normalizeSupportedDomains,
  toIdString,
  validateSyncableManifestModel,
} from "./modelManifest.mapper.js";

const LOCAL_CONFIGURATION_FIELDS = [
  "visibleInIssueCreation",
  "visibleInCriteriaWeighting",
];

const getManifestSyncFields = (manifestProjection) => {
  const projectionFields = Object.keys(manifestProjection || {}).filter(
    (field) =>
      field !== "displayName" &&
      field !== "visibleInIssueCreation" &&
      field !== "visibleInCriteriaWeighting"
  );

  return ["name", ...projectionFields];
};

const getManifestTechnicalValue = (manifestModel, manifestProjection, field) => {
  if (field === "name") {
    return manifestProjection.displayName;
  }

  if (hasOwnKey(manifestProjection || {}, field)) {
    return manifestProjection[field] ?? null;
  }

  return manifestModel?.[field] ?? null;
};

const getMongoTechnicalValue = (mongoModel, field) => {
  if (!hasOwnKey(mongoModel || {}, field)) {
    return null;
  }

  return mongoModel[field] ?? null;
};

const isMongoFieldPresent = (mongoModel, field) =>
  hasOwnKey(mongoModel || {}, field);

const compareTechnicalFields = (manifestModel, mongoModel) => {
  const differences = [];
  const manifestProjection = buildManifestTechnicalProjection(manifestModel);
  const manifestSyncFields = getManifestSyncFields(manifestProjection);

  for (const field of manifestSyncFields) {
    const manifestRawValue = getManifestTechnicalValue(
      manifestModel,
      manifestProjection,
      field
    );
    const mongoRawValue = getMongoTechnicalValue(mongoModel, field);
    const manifestValue = normalizeComparableFieldValue(field, manifestRawValue);
    const mongoValue = normalizeComparableFieldValue(field, mongoRawValue);
    const mongoFieldPresent = isMongoFieldPresent(mongoModel, field);

    if (isValueEqual(field, manifestRawValue, mongoRawValue)) {
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
  const manifestProjection = buildManifestTechnicalProjection(manifestModel);

  for (const field of LOCAL_CONFIGURATION_FIELDS) {
    let manifestRawValue = null;

    if (field === "visibleInIssueCreation") {
      manifestRawValue = manifestProjection.isIssueModel === true;
    }
    if (field === "visibleInCriteriaWeighting") {
      manifestRawValue = manifestProjection.isCriteriaWeightingModel === true;
    }

    const mongoRawValue = getMongoTechnicalValue(mongoModel, field);

    if (isValueEqual(field, manifestRawValue, mongoRawValue)) {
      continue;
    }

    differences.push({
      field,
      manifestValue: normalizeComparableFieldValue(field, manifestRawValue),
      mongoValue: normalizeComparableFieldValue(field, mongoRawValue),
      reason: "Local Admin visibility overrides manifest default",
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
  const manifestProjection = buildManifestTechnicalProjection(manifestModel);
  const keyMatches = mongoEntries.filter(
    (entry) =>
      !entry.matched &&
      entry.apiModelKey &&
      entry.apiModelKey === manifestProjection.apiModelKey
  );

  if (keyMatches.length > 1) {
    return {
      kind: "ambiguous",
      candidates: keyMatches,
      reason: `Multiple Mongo IssueModels already use apiModelKey ${manifestProjection.apiModelKey}`,
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
    .map((model) => ({
      model,
      blockerReason: getSyncBlockerReason(model),
    }))
    .filter((entry) => entry.blockerReason)
    .map(({ model, blockerReason }) => ({
      apiModelKey: model?.apiModelKey ?? null,
      displayName: model?.displayName ?? null,
      isIssueModel: model?.isIssueModel === true,
      isCriteriaWeightingModel: model?.isCriteriaWeightingModel === true,
      reason: blockerReason,
    }));
};

const buildManifestSummary = (manifest, manifestModels, syncableManifestModels) => {
  return {
    totalModels: manifestModels.length,
    syncableModels: syncableManifestModels.length,
    nonSyncableModels: manifestModels.length - syncableManifestModels.length,
  };
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
  const manifestProjection = manifestModel
    ? buildManifestTechnicalProjection(manifestModel)
    : null;

  return {
    apiModelKey:
      manifestProjection?.apiModelKey ?? mongoModel?.apiModelKey ?? null,
    displayName: manifestProjection?.displayName ?? null,
    mongoName: mongoModel?.name ?? null,
    mongoId: toIdString(mongoModel?._id),
    isIssueModel:
      manifestProjection?.isIssueModel ?? mongoModel?.isIssueModel ?? null,
    isCriteriaWeightingModel:
      manifestProjection?.isCriteriaWeightingModel ??
      mongoModel?.isCriteriaWeightingModel ??
      null,
    visibleInIssueCreation:
      mongoModel?.visibleInIssueCreation ??
      (manifestProjection?.isIssueModel === true ? true : null),
    visibleInCriteriaWeighting:
      mongoModel?.visibleInCriteriaWeighting ??
      (manifestProjection?.isCriteriaWeightingModel === true ? true : null),
    alternativeEvaluationStructureKey:
      manifestProjection?.alternativeEvaluationStructureKey ??
      mongoModel?.alternativeEvaluationStructureKey ??
      null,
    criteriaWeightingStructureKey:
      manifestProjection?.criteriaWeightingStructureKey ??
      mongoModel?.criteriaWeightingStructureKey ??
      null,
    supportsCreatorCriteriaWeighting:
      manifestProjection?.supportsCreatorCriteriaWeighting ??
      mongoModel?.supportsCreatorCriteriaWeighting ??
      null,
    supportsExpertCriteriaWeighting:
      manifestProjection?.supportsExpertCriteriaWeighting ??
      mongoModel?.supportsExpertCriteriaWeighting ??
      null,
    supportsConsensus:
      manifestProjection?.supportsConsensus ?? mongoModel?.supportsConsensus ?? null,
    supportsConsensusSimulation:
      manifestProjection?.supportsConsensusSimulation ??
      mongoModel?.supportsConsensusSimulation ??
      null,
    isMultiCriteria:
      manifestProjection?.isMultiCriteria ?? mongoModel?.isMultiCriteria ?? null,
    usesCriteriaWeights:
      manifestProjection?.usesCriteriaWeights ??
      mongoModel?.usesCriteriaWeights ??
      null,
    usesExpertWeights:
      manifestProjection?.usesExpertWeights ??
      mongoModel?.usesExpertWeights ??
      null,
    usesFuzzyCriteriaWeights:
      manifestProjection?.usesFuzzyCriteriaWeights ??
      mongoModel?.usesFuzzyCriteriaWeights ??
      null,
    usesCriterionTypes:
      manifestProjection?.usesCriterionTypes ??
      mongoModel?.usesCriterionTypes ??
      null,
    supportedDomains: manifestProjection
      ? normalizeSupportedDomains(manifestProjection.supportedDomains)
      : normalizeSupportedDomains(mongoModel?.supportedDomains),
    apiEndpoint:
      normalizeEndpoint(manifestProjection?.apiEndpoint, { emptyValue: null }) ??
      normalizeEndpoint(mongoModel?.apiEndpoint, { emptyValue: null }),
    parameters:
      normalizeParameters(manifestProjection?.parameters ?? mongoModel?.parameters),
    request: manifestProjection?.request ?? mongoModel?.request ?? null,
    response: manifestProjection?.response ?? mongoModel?.response ?? null,
    syncState,
    matched,
    matchedBy,
    differences,
    reason,
    manifestSync: mongoModel?.manifestSync ?? null,
  };
};

export const buildModelManifestDryRunReport = ({
  manifest,
  issueModels = [],
}) => {
  const manifestModels = Array.isArray(manifest?.models) ? manifest.models : [];
  const syncableManifestModels = manifestModels.filter(
    (model) => !getSyncBlockerReason(model)
  );
  const mongoModels = Array.isArray(issueModels) ? issueModels : [];
  const mongoEntries = buildMongoEntries(mongoModels);
  const matches = [];
  const modelRows = [];
  const missingInMongo = [];
  const invalidManifestRuntimeFields = [];
  const technicalDifferences = [];
  const localConfigurationDifferences = [];
  const warnings = [];
  const recommendations = [];

  if (mongoModels.length === 0) {
    warnings.push("No IssueModel documents found in MongoDB.");
  }

  for (const manifestModel of syncableManifestModels) {
    const runtimeValidationErrors = validateSyncableManifestModel(manifestModel);

    if (runtimeValidationErrors.length > 0) {
      invalidManifestRuntimeFields.push({
        apiModelKey: manifestModel?.apiModelKey ?? null,
        displayName: manifestModel?.displayName ?? null,
        errors: runtimeValidationErrors,
      });
      warnings.push(
        `Syncable manifest model ${manifestModel?.apiModelKey || "unknown"} has invalid required runtime fields: ${runtimeValidationErrors.join(", ")}`
      );
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Invalid runtime config",
          reason:
            "Manifest model is missing or has invalid required runtime fields",
          differences: runtimeValidationErrors.map((field) => ({
            field,
            manifestValue: null,
            mongoValue: null,
            reason: "Invalid manifest runtime field",
          })),
        })
      );
      continue;
    }

    const match = findMongoMatch(manifestModel, mongoEntries);

    if (match.kind === "missing") {
      missingInMongo.push({
        apiModelKey: manifestModel?.apiModelKey ?? null,
        displayName: manifestModel?.displayName ?? null,
        reason: "Syncable manifest model was not found in Mongo IssueModels",
      });
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Missing in Mongo",
          reason: "Syncable manifest model was not found in Mongo IssueModels",
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
    const syncState = differences.length > 0 ? "Has differences" : "Synced";
    const matchReport = {
      manifestKey: manifestModel?.apiModelKey ?? null,
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
        apiModelKey: matchReport.manifestKey,
        mongoName: matchReport.mongoName,
        mongoId: matchReport.mongoId,
        differences,
      });
    }

    if (configurationDifferences.length > 0) {
      localConfigurationDifferences.push({
        apiModelKey: matchReport.manifestKey,
        mongoName: matchReport.mongoName,
        mongoId: matchReport.mongoId,
        differences: configurationDifferences,
      });
    }
  }

  const missingInManifest = mongoEntries
    .filter((entry) => !entry.matched)
    .map((entry) => ({
      apiModelKey: entry.model?.apiModelKey ?? null,
      mongoName: entry.model?.name ?? null,
      mongoId: toIdString(entry.model?._id),
      reason: "Mongo IssueModel is not present in syncable manifest models",
    }));

  mongoEntries
    .filter((entry) => !entry.matched)
    .forEach((entry) => {
      const isStale = entry.model?.manifestSync?.isStale === true;

      modelRows.push(
        buildModelRow({
          mongoModel: entry.model,
          syncState: isStale ? "Stale" : "Missing in manifest",
          reason: "Mongo IssueModel is not present in syncable manifest models",
        })
      );
    });

  for (const missingModel of missingInMongo) {
    warnings.push(
      `Syncable manifest model ${missingModel.apiModelKey} was not found in Mongo IssueModels.`
    );
  }

  for (const missingModel of missingInManifest) {
    warnings.push(
      `Mongo IssueModel ${missingModel.mongoName} is not present in syncable manifest models.`
    );
  }

  if (technicalDifferences.length > 0) {
    warnings.push("Manifest-owned differences were detected in matched models.");
    recommendations.push(
      "Review manifest-owned differences before enabling write synchronization."
    );
  }

  if (invalidManifestRuntimeFields.length > 0) {
    recommendations.push(
      "Fix invalid required runtime fields in syncable manifest models before synchronization."
    );
  }

  if (localConfigurationDifferences.length > 0) {
    recommendations.push(
      "Review local visibility overrides; sync preserves Admin visibility choices."
    );
  }

  if (missingInMongo.length > 0) {
    recommendations.push(
      "Review missing syncable manifest models before enabling model creation."
    );
  }

  if (missingInManifest.length > 0) {
    recommendations.push(
      "Review Mongo IssueModels that are not present in syncable manifest models."
    );
  }

  const notSyncable = buildNotSyncableModels(manifestModels);

  manifestModels
    .map((manifestModel) => ({
      manifestModel,
      blockerReason: getSyncBlockerReason(manifestModel),
    }))
    .filter((entry) => entry.blockerReason)
    .forEach(({ manifestModel, blockerReason }) => {
      modelRows.push(
        buildModelRow({
          manifestModel,
          syncState: "Not syncable",
          reason: blockerReason,
        })
      );
    });

  if (notSyncable.length > 0) {
    recommendations.push(
      "Keep non-syncable manifest models out of IssueModel synchronization."
    );
  }

  return {
    manifest: buildManifestSummary(manifest, manifestModels, syncableManifestModels),
    summary: {
      matched: matches.length,
      missingInMongo,
      missingInManifest,
      notSyncable,
      invalidManifestRuntimeFields,
      technicalDifferences,
      localConfigurationDifferences,
    },
    matches,
    modelRows,
    warnings,
    recommendations,
    syncedManifestFields: getManifestSyncFields(
      buildManifestTechnicalProjection(syncableManifestModels[0] || null)
    ),
  };
};

export const runModelManifestDryRun = async (options = {}) => {
  const manifest = await fetchModelManifest(options);
  const issueModels = await IssueModel.find().select("-__v").lean();

  return buildModelManifestDryRunReport({
    manifest,
    issueModels,
  });
};

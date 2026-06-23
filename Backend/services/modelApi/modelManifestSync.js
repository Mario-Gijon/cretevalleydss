import { IssueModel } from "../../models/IssueModels.js";
import { Issue } from "../../models/Issues.js";
import { hasOwnKey } from "../../utils/common/objects.js";
import { fetchModelManifest } from "./modelManifestClient.js";
import {
  MANIFEST_SYNC_SOURCE,
  buildSkippedManifestModel,
  buildTechnicalPayload,
  getSyncBlockerReason,
  isValueEqual,
  toIdString,
  validateSyncableManifestModel,
} from "./modelManifest.mapper.js";

const buildMongoEntries = (issueModels) => {
  return issueModels.map((model) => ({
    model,
    matched: false,
    apiModelKey: String(model.apiModelKey || "").trim(),
  }));
};

const findByApiModelKey = (manifestModel, mongoEntries) => {
  const key = String(manifestModel?.apiModelKey || "").trim();

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
      reason: `Multiple IssueModels already use apiModelKey ${manifestModel.apiModelKey}`,
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
  const comparedFields = Object.keys(payload).filter(
    (field) =>
      field !== "manifestSync" &&
      field !== "visibleInIssueCreation" &&
      field !== "visibleInCriteriaWeighting"
  );

  return comparedFields.filter(
    (field) =>
      hasOwnKey(payload, field) &&
      !isValueEqual(field, model[field], payload[field])
  );
};

const getApplicableVisibilityField = (modelKind) => {
  if (modelKind === "criteriaWeighting") {
    return "visibleInCriteriaWeighting";
  }

  return "visibleInIssueCreation";
};

const applyVisibilityInvariantToModel = (model, payload) => {
  const modelKind = payload.modelKind || model?.modelKind;
  const applicableVisibilityField = getApplicableVisibilityField(modelKind);

  if (applicableVisibilityField === "visibleInCriteriaWeighting") {
    model.visibleInIssueCreation = false;
    model.visibleInCriteriaWeighting =
      model.visibleInCriteriaWeighting !== false;
    return;
  }

  model.visibleInIssueCreation = model.visibleInIssueCreation !== false;
  model.visibleInCriteriaWeighting = false;
};

const updateExistingModel = async ({ entry, payload, manifestModel }) => {
  const payloadForUpdate = { ...payload };
  delete payloadForUpdate.visibleInIssueCreation;
  delete payloadForUpdate.visibleInCriteriaWeighting;

  const updatedFields = getChangedSyncFields(entry.model, payloadForUpdate);
  const requiresStaleReset = entry.model?.manifestSync?.isStale === true;

  entry.matched = true;

  if (updatedFields.length === 0 && !requiresStaleReset) {
    return {
      status: "unchanged",
      item: {
        apiModelKey: manifestModel.apiModelKey,
        mongoName: entry.model.name,
        mongoId: toIdString(entry.model._id),
        matchedBy: entry.matchedBy,
        reason: "No manifest-owned changes detected",
      },
    };
  }

  entry.model.set(payloadForUpdate);
  applyVisibilityInvariantToModel(entry.model, payload);
  await entry.model.save();

  return {
    status: "updated",
    item: {
      apiModelKey: manifestModel.apiModelKey,
      mongoName: entry.model.name,
      mongoId: toIdString(entry.model._id),
      matchedBy: entry.matchedBy,
      updatedFields: requiresStaleReset
        ? updatedFields.concat("manifestSync.isStale")
        : updatedFields,
    },
  };
};

const buildVisibilityOverrideWarning = ({ model, payload, manifestModel }) => {
  const visibilityField = getApplicableVisibilityField(payload.modelKind);
  const localVisibility = model[visibilityField] !== false;
  const manifestDefaultVisibility = payload[visibilityField] !== false;

  if (localVisibility === manifestDefaultVisibility) {
    return null;
  }

  return `IssueModel ${model.name} local ${visibilityField}=${localVisibility} differs from manifest model ${manifestModel.apiModelKey}; sync preserved local Admin visibility.`;
};

const createIssueModelFromManifest = async ({ manifestModel, payload }) => {
  const isScaffold = payload.implementationStatus === "scaffold";
  const isIssueModel = payload.modelKind === "issue";
  const createdModel = await IssueModel.create({
    ...payload,
    visibleInIssueCreation: isIssueModel && !isScaffold,
    visibleInCriteriaWeighting: !isIssueModel && !isScaffold,
  });

  return {
    apiModelKey: manifestModel.apiModelKey,
    mongoName: createdModel.name,
    mongoId: toIdString(createdModel._id),
    createdFields: Object.keys(payload).concat([
      "visibleInIssueCreation",
      "visibleInCriteriaWeighting",
    ]),
  };
};

const canMarkStale = (model) => {
  return model?.manifestSync?.source === MANIFEST_SYNC_SOURCE;
};

const loadMissingModelReferences = async (modelId) => {
  const [issueModelReference, criteriaWeightingReference] = await Promise.all([
    Issue.exists({ model: modelId }),
    Issue.exists({ criteriaWeightingModel: modelId }),
  ]);

  return {
    issueModel: Boolean(issueModelReference),
    criteriaWeightingModel: Boolean(criteriaWeightingReference),
  };
};

const buildBlockedDeletionItem = ({ entry, apiModelKey, references }) => ({
  apiModelKey,
  mongoName: entry.model.name,
  mongoId: toIdString(entry.model._id),
  reason:
    "This model is no longer present in the DecisionModelsService manifest, but it is referenced by existing issues. It was kept in MongoDB as a protected historical model and disabled for new issues.",
  references,
});

const reconcileMissingManagedModels = async ({
  mongoEntries,
  syncableKeys,
  now,
  warnings,
}) => {
  const deleted = [];
  const blockedDeletions = [];

  for (const entry of mongoEntries) {
    const apiModelKey = String(entry.model.apiModelKey || "").trim();

    if (entry.matched || !apiModelKey || syncableKeys.has(apiModelKey)) {
      continue;
    }

    if (!canMarkStale(entry.model)) {
      warnings.push(
        `IssueModel ${entry.model.name} has apiModelKey ${apiModelKey} but is not managed by DecisionModelsService; deletion review was skipped.`
      );
      continue;
    }

    const references = await loadMissingModelReferences(entry.model._id);
    const isReferenced =
      references.issueModel === true ||
      references.criteriaWeightingModel === true;

    if (!isReferenced) {
      await IssueModel.deleteOne({ _id: entry.model._id });
      deleted.push({
        apiModelKey,
        mongoName: entry.model.name,
        mongoId: toIdString(entry.model._id),
        reason:
          "This managed model is no longer present in the DecisionModelsService manifest and is not referenced by any issue. It was deleted from MongoDB.",
      });
      continue;
    }

    const previousManifestSync =
      entry.model.manifestSync?.toObject?.() || entry.model.manifestSync || {};

    const nextManifestSync = {
      ...previousManifestSync,
      source: MANIFEST_SYNC_SOURCE,
      isStale: true,
      lastSyncedAt: now,
    };

    await IssueModel.updateOne(
      { _id: entry.model._id },
      {
        $set: {
          visibleInIssueCreation: false,
          visibleInCriteriaWeighting: false,
          manifestSync: nextManifestSync,
        },
      },
      { runValidators: false }
    );

    blockedDeletions.push(
      buildBlockedDeletionItem({
        entry,
        apiModelKey,
        references,
      })
    );
  }

  for (const entry of mongoEntries) {
    if (entry.matched || entry.apiModelKey) {
      continue;
    }

    warnings.push(
      `IssueModel ${entry.model.name} has no apiModelKey and was not matched to a syncable manifest model.`
    );
  }

  return {
    deleted,
    blockedDeletions,
  };
};

const buildSummary = ({
  created,
  updated,
  unchanged,
  skipped,
  deleted,
  blockedDeletions,
  warnings,
}) => ({
  created: created.length,
  updated: updated.length,
  unchanged: unchanged.length,
  skipped: skipped.length,
  deleted: deleted.length,
  blockedDeletions: blockedDeletions.length,
  warnings: warnings.length,
});

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
        "Manifest model is missing or has invalid required runtime fields";
      skipped.push({
        ...buildSkippedManifestModel(manifestModel, reason),
        missingFields,
      });
      warnings.push(
        `Model ${manifestModel?.apiModelKey || "unknown"} was skipped: ${reason}.`
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

      const { status, item } = await updateExistingModel({
        entry: match.entry,
        payload,
        manifestModel,
      });

      if (status === "updated") {
        updated.push(item);
      } else {
        unchanged.push(item);
      }

      continue;
    }

    const createdItem = await createIssueModelFromManifest({
      manifestModel,
      payload,
    });
    created.push(createdItem);
  }

  const { deleted, blockedDeletions } = await reconcileMissingManagedModels({
    mongoEntries,
    syncableKeys,
    now,
    warnings,
  });

  const summary = buildSummary({
    created,
    updated,
    unchanged,
    skipped,
    deleted,
    blockedDeletions,
    warnings,
  });

  return {
    manifest: {
      totalModels: manifestModels.length,
      syncableModels: manifestModels.filter((model) => !getSyncBlockerReason(model))
        .length,
    },
    created,
    updated,
    unchanged,
    skipped,
    deleted,
    blockedDeletions,
    warnings,
    summary,
  };
};

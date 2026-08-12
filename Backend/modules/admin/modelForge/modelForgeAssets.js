import { Issue } from "../../../models/Issues.js";
import { IssueModel } from "../../../models/IssueModels.js";

import {
  applyModelForgeModelPackage,
  deleteModelForgeAsset,
  fetchModelForgeAssets,
  fetchModelForgeCatalog,
  previewModelForgeModelPackage,
} from "../../../services/modelForge/modelForgeClient.js";
import {
  createBadRequestError,
  createConflictError,
} from "../../../utils/common/errors.js";

const MODEL_FORGE_ASSET_KIND_SET = new Set([
  "model",
  "evaluationStructure",
  "parameterStructure",
]);
const MODEL_FORGE_ASSET_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export const normalizeModelForgeAssetKeyOrThrow = (key) => {
  const normalizedKey = String(key || "").trim();

  if (!normalizedKey || !MODEL_FORGE_ASSET_KEY_PATTERN.test(normalizedKey)) {
    throw createBadRequestError("Valid asset key is required", {
      field: "key",
    });
  }

  return normalizedKey;
};

export const normalizeModelForgeAssetKindOrThrow = (kind) => {
  const normalizedKind = String(kind || "").trim();

  if (!MODEL_FORGE_ASSET_KIND_SET.has(normalizedKind)) {
    throw createBadRequestError("Valid asset kind is required", {
      field: "kind",
    });
  }

  return normalizedKind;
};

export const countIssuesUsingIssueModelIds = async (
  modelIds,
  { issueModel = Issue } = {}
) => {
  if (!Array.isArray(modelIds) || modelIds.length === 0) return 0;

  return issueModel.countDocuments({
    $or: [
      { model: { $in: modelIds } },
      { criteriaWeightingModel: { $in: modelIds } },
    ],
  });
};

export const countIssuesUsingModelForgeAsset = async (
  { kind, key },
  {
    issueModel = Issue,
    issueModelCatalog = IssueModel,
    countIssuesUsingModelIds = countIssuesUsingIssueModelIds,
  } = {}
) => {
  let models;

  if (kind === "model") {
    models = await issueModelCatalog.find({ apiModelKey: key }).select("_id").lean();
  } else if (kind === "evaluationStructure") {
    models = await issueModelCatalog
      .find({ evaluationStructureKey: key })
      .select("_id")
      .lean();
  } else if (kind === "parameterStructure") {
    models = await issueModelCatalog
      .find({ "parameters.parameterStructureKey": key })
      .select("_id")
      .lean();
  } else {
    throw createBadRequestError("Valid asset kind is required", {
      field: "kind",
    });
  }

  return countIssuesUsingModelIds(
    models.map((model) => model._id),
    { issueModel }
  );
};

export const enrichModelForgeAssetsWithUsage = async (
  items = [],
  { countUsage = countIssuesUsingModelForgeAsset } = {}
) =>
  Promise.all(
    items.map(async (item) => {
      const kind = String(item?.kind || "").trim();
      const key = String(item?.key || "").trim();
      const resolvedUsageCount = await countUsage({ kind, key });
      const usageCount = Number.isFinite(resolvedUsageCount)
        ? resolvedUsageCount
        : 0;
      const usedByIssuesCount = usageCount;
      const protectedByModelForge =
        item?.protected === true || item?.deletable === false;
      const modelForgeProtectionReason =
        typeof item?.deleteDisabledReason === "string" &&
        item.deleteDisabledReason.trim()
          ? item.deleteDisabledReason.trim()
          : "This asset is protected and cannot be deleted through Model Forge.";
      const deleteBlockedReason =
        protectedByModelForge
          ? modelForgeProtectionReason
          : usageCount > 0
          ? "This asset is used by existing issues and cannot be deleted."
          : "";

      return {
        ...item,
        usageCount,
        usedByIssuesCount,
        deleteBlockedReason,
        deletable: !protectedByModelForge && usageCount === 0,
      };
    })
  );

export const getAdminModelForgeCatalog = async (
  { fetchCatalog = fetchModelForgeCatalog } = {}
) => fetchCatalog();

export const getAdminModelForgeAssets = async (
  {
    fetchAssets = fetchModelForgeAssets,
    enrichAssets = enrichModelForgeAssetsWithUsage,
  } = {}
) => {
  const assets = await fetchAssets();
  const [models, evaluationStructures, parameterStructures] = await Promise.all([
    enrichAssets(assets?.models || []),
    enrichAssets(assets?.evaluationStructures || []),
    enrichAssets(assets?.parameterStructures || []),
  ]);

  return {
    ...assets,
    models,
    evaluationStructures,
    parameterStructures,
  };
};

export const previewAdminModelForgeModelPackage = async (
  payload,
  { previewModelPackage = previewModelForgeModelPackage } = {}
) => previewModelPackage(payload || {});

export const applyAdminModelForgeModelPackage = async (
  payload,
  { applyModelPackage = applyModelForgeModelPackage } = {}
) => applyModelPackage(payload || {});

export const deleteAdminModelForgeAsset = async (
  { kind: rawKind, key: rawKey },
  {
    countUsage = countIssuesUsingModelForgeAsset,
    deleteAsset = deleteModelForgeAsset,
  } = {}
) => {
  const kind = normalizeModelForgeAssetKindOrThrow(rawKind);
  const key = normalizeModelForgeAssetKeyOrThrow(rawKey);

  const usageCount = await countUsage({ kind, key });
  const usedByIssuesCount = usageCount;

  if (usageCount > 0) {
    throw createConflictError(
      "This asset is used by existing issues and cannot be deleted.",
      {
        code: "MODEL_FORGE_ASSET_IN_USE",
        field: "key",
        details: {
          kind,
          key,
          usageCount,
          usedByIssuesCount,
        },
      }
    );
  }

  const result = await deleteAsset(kind, key);

  return {
    ...result,
    usageCount,
    usedByIssuesCount,
    deletable: true,
  };
};

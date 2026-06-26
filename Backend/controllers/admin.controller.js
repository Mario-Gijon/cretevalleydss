import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import mongoose from "mongoose";

import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";

import { editIssueExperts as editIssueExpertsUseCase } from "../modules/issues/participants/index.js";
import {
  computeIssueEvaluationStage,
} from "../modules/issues/computation/index.js";
import {
  deleteIssueCascade,
} from "../modules/issues/lifecycle/index.js";

import {
  getAdminIssuesListPayload,
  getIssueAdminDetailPayload,
  getIssueExpertsProgressPayload,
  getIssueExpertEvaluationsPayload,
  getIssueExpertWeightsPayload,
} from "../modules/admin/issueReads/index.js";

import {
  createAdminUser as createAdminUserUseCase,
  deleteAdminUser as deleteAdminUserUseCase,
  getAdminUsersListPayload,
  reassignIssueOwner as reassignIssueOwnerUseCase,
  updateAdminUser as updateAdminUserUseCase,
} from "../modules/admin/users/index.js";
import { runModelManifestDryRun } from "../services/modelApi/modelManifestDryRun.js";
import {
  fetchDecisionModelsServiceHealth,
  reloadDecisionModelsService,
} from "../services/modelApi/decisionModelsServiceSystemClient.js";
import { fetchModelManifest } from "../services/modelApi/modelManifestClient.js";
import { syncModelManifestToIssueModels } from "../services/modelApi/modelManifestSync.js";
import {
  applyModelForgeModelPackage,
  deleteModelForgeAsset,
  fetchModelForgeAssets,
  fetchModelForgeCatalog,
  previewModelForgeModelPackage,
} from "../services/modelForge/modelForgeClient.js";

import {
  createBadRequestError,
  createConflictError,
  createForbiddenError,
  createNotFoundError,
} from "../utils/common/errors.js";
import { toIdString } from "../utils/common/ids.js";
import {
  endSessionSafely,
  isValidObjectIdLike,
} from "../utils/common/mongoose.js";
import { sendSuccess } from "../utils/common/responses.js";
import { getIssueByIdOrThrow } from "../modules/issues/shared/queries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_RELOAD_MARKER_PATH = path.resolve(
  __dirname,
  "../runtime/backendReloadMarker.json"
);
const MODEL_FORGE_ASSET_KIND_SET = new Set([
  "model",
  "evaluationStructure",
  "parameterStructure",
]);
const MODEL_FORGE_ASSET_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

const getAdminIssueExecutionContextOrThrow = async ({
  issueId,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: "model",
    lean: false,
    session,
  });

  return {
    issue,
    ownerUserId: toIdString(issue.ownerId),
  };
};

const throwIfDuplicateEmailError = (error) => {
  if (error?.code === 11000) {
    throw createConflictError("Email already registered", {
      field: "email",
      details: error?.keyValue ?? null,
      cause: error,
    });
  }

  throw error;
};

const mapIssueModelCatalogItem = (model) => {
  const id = toIdString(model._id);
  const isStale = model?.manifestSync?.isStale === true;
  const publicUsable =
    model.modelKind === "criteriaWeighting"
      ? model.visibleInCriteriaWeighting !== false && !isStale
      : model.visibleInIssueCreation !== false && !isStale;

  return {
    _id: id,
    id,
    name: model.name,
    apiModelKey: model.apiModelKey,
    modelKind: model.modelKind || null,
    implementationStatus: model.implementationStatus || "ready",
    publicUsable,
    protectedHistoricalModel: isStale,
    visibleInIssueCreation: model.visibleInIssueCreation !== false,
    visibleInCriteriaWeighting: model.visibleInCriteriaWeighting !== false,
    apiEndpoint: model.apiEndpoint,
    manifestSync: model.manifestSync,
    isMultiCriteria: model.isMultiCriteria,
    evaluationStructureKey: model.evaluationStructureKey,
    usesCriteriaWeights: model.usesCriteriaWeights === true,
    usesExpertWeights: model.usesExpertWeights === true,
    usesFuzzyCriteriaWeights: model.usesFuzzyCriteriaWeights === true,
    usesCriterionTypes: model.usesCriterionTypes === true,
    supportsConsensus: model.supportsConsensus === true,
    supportsConsensusSimulation: model.supportsConsensusSimulation === true,
    parameters: model.parameters,
    modelInputFields: model.modelInputFields,
    modelOutputFields: model.modelOutputFields,
    request: model.request,
    response: model.response,
    supportedDomains: model.supportedDomains,
    smallDescription: model.smallDescription,
    extendDescription: model.extendDescription,
    moreInfoUrl: model.moreInfoUrl,
  };
};

const getModelCatalogSortRank = (model) => {
  const visibleInIssueCreation = model.visibleInIssueCreation !== false;
  const visibleInCriteriaWeighting = model.visibleInCriteriaWeighting !== false;
  const stale = model?.manifestSync?.isStale === true;

  if (visibleInIssueCreation && !stale) return 0;
  if (visibleInIssueCreation) return 1;
  if (visibleInCriteriaWeighting && !stale) return 2;
  if (visibleInCriteriaWeighting) return 3;

  return 4;
};

const normalizeModelForgeAssetKeyOrThrow = (key) => {
  const normalizedKey = String(key || "").trim();

  if (!normalizedKey || !MODEL_FORGE_ASSET_KEY_PATTERN.test(normalizedKey)) {
    throw createBadRequestError("Valid asset key is required", {
      field: "key",
    });
  }

  return normalizedKey;
};

const normalizeModelForgeAssetKindOrThrow = (kind) => {
  const normalizedKind = String(kind || "").trim();

  if (!MODEL_FORGE_ASSET_KIND_SET.has(normalizedKind)) {
    throw createBadRequestError("Valid asset kind is required", {
      field: "kind",
    });
  }

  return normalizedKind;
};

const countIssuesUsingIssueModelIds = async (modelIds) => {
  if (!Array.isArray(modelIds) || modelIds.length === 0) return 0;

  return Issue.countDocuments({
    $or: [
      { model: { $in: modelIds } },
      { criteriaWeightingModel: { $in: modelIds } },
    ],
  });
};

const countIssuesUsingModelForgeAsset = async ({ kind, key }) => {
  if (kind === "model") {
    const models = await IssueModel.find({ apiModelKey: key }).select("_id").lean();
    return countIssuesUsingIssueModelIds(models.map((model) => model._id));
  }

  if (kind === "evaluationStructure") {
    const models = await IssueModel.find({ evaluationStructureKey: key })
      .select("_id")
      .lean();
    return countIssuesUsingIssueModelIds(models.map((model) => model._id));
  }

  if (kind === "parameterStructure") {
    const models = await IssueModel.find({
      "parameters.parameterStructureKey": key,
    })
      .select("_id")
      .lean();
    return countIssuesUsingIssueModelIds(models.map((model) => model._id));
  }

  throw createBadRequestError("Valid asset kind is required", {
    field: "kind",
  });
};

const enrichModelForgeAssetsWithUsage = async (items = []) =>
  Promise.all(
    items.map(async (item) => {
      const kind = String(item?.kind || "").trim();
      const key = String(item?.key || "").trim();
      const resolvedUsageCount = await countIssuesUsingModelForgeAsset({
        kind,
        key,
      });
      const usedByIssuesCount = Number.isFinite(resolvedUsageCount)
        ? resolvedUsageCount
        : 0;

      return {
        ...item,
        usedByIssuesCount,
        deletable: usedByIssuesCount === 0,
      };
    })
  );

export const getAllUsersAdmin = async (req, res) => {
  const data = await getAdminUsersListPayload({
    adminUserId: req.uid,
    search: String(req.query.q || "").trim(),
    includeAdmins: req.query.includeAdmins === "true",
  });

  return sendSuccess(res, "Users fetched successfully", data);
};

export const getModelCatalogAdmin = async (_req, res) => {
  const models = (await IssueModel.find().select("-__v").lean())
    .map(mapIssueModelCatalogItem)
    .sort((left, right) => {
      const rankDifference =
        getModelCatalogSortRank(left) - getModelCatalogSortRank(right);

      if (rankDifference !== 0) return rankDifference;

      return left.name.localeCompare(right.name);
    });

  return sendSuccess(res, "Model catalog retrieved successfully", {
    models,
  });
};

export const updateModelCatalogVisibilityAdmin = async (req, res) => {
  const { id } = req.params || {};
  const { visibleInIssueCreation, visibleInCriteriaWeighting } = req.body || {};

  if (!id || !isValidObjectIdLike(id)) {
    throw createBadRequestError("Valid model id is required", {
      field: "id",
    });
  }

  const hasIssueVisibility = typeof visibleInIssueCreation === "boolean";
  const hasCriteriaVisibility =
    typeof visibleInCriteriaWeighting === "boolean";

  if (!hasIssueVisibility && !hasCriteriaVisibility) {
    throw createBadRequestError(
      "visibleInIssueCreation or visibleInCriteriaWeighting must be boolean",
      {
        field: "visibleInIssueCreation",
      }
    );
  }

  const currentModel = await IssueModel.findById(id);

  if (!currentModel) {
    throw createNotFoundError("Model not found", {
      field: "id",
    });
  }

  const isProtectedHistoricalModel =
    currentModel?.manifestSync?.isStale === true;
  const isIssueModel = currentModel?.modelKind === "issue";
  const isCriteriaWeightingModel =
    currentModel?.modelKind === "criteriaWeighting";

  if (isIssueModel && visibleInCriteriaWeighting === true) {
    throw createBadRequestError(
      "This visibility flag is not applicable to the selected model kind.",
      {
        code: "MODEL_VISIBILITY_NOT_APPLICABLE",
        field: "visibleInCriteriaWeighting",
      }
    );
  }

  if (isCriteriaWeightingModel && visibleInIssueCreation === true) {
    throw createBadRequestError(
      "This visibility flag is not applicable to the selected model kind.",
      {
        code: "MODEL_VISIBILITY_NOT_APPLICABLE",
        field: "visibleInIssueCreation",
      }
    );
  }

  if (
    isProtectedHistoricalModel &&
    ((hasIssueVisibility && visibleInIssueCreation === true) ||
      (hasCriteriaVisibility && visibleInCriteriaWeighting === true))
  ) {
    throw createBadRequestError(
      "This model is no longer present in the DecisionModelsService manifest and is kept only because existing issues reference it.",
      {
        code: "PROTECTED_HISTORICAL_MODEL_NOT_ACTIVABLE",
        field:
          hasIssueVisibility && visibleInIssueCreation === true
            ? "visibleInIssueCreation"
            : "visibleInCriteriaWeighting",
      }
    );
  }

  const visibilityUpdate = {};
  if (hasIssueVisibility) {
    visibilityUpdate.visibleInIssueCreation = visibleInIssueCreation;
  }
  if (hasCriteriaVisibility) {
    visibilityUpdate.visibleInCriteriaWeighting =
      visibleInCriteriaWeighting;
  }

  currentModel.set(visibilityUpdate);
  await currentModel.save();

  const model = await IssueModel.findById(currentModel._id)
    .select("-__v")
    .lean();

  return sendSuccess(
    res,
    "Model catalog visibility updated successfully",
    {
      model: mapIssueModelCatalogItem(model),
    }
  );
};

export const getModelManifestDryRunAdmin = async (_req, res) => {
  const report = await runModelManifestDryRun();

  return sendSuccess(
    res,
    "Model manifest dry-run completed successfully",
    report
  );
};

export const getModelForgeCatalogAdmin = async (_req, res) => {
  const catalog = await fetchModelForgeCatalog();

  return sendSuccess(
    res,
    "Model Forge scaffold catalog fetched successfully",
    catalog
  );
};

export const getModelForgeAssetsAdmin = async (_req, res) => {
  const assets = await fetchModelForgeAssets();
  const [models, evaluationStructures, parameterStructures] = await Promise.all([
    enrichModelForgeAssetsWithUsage(assets?.models || []),
    enrichModelForgeAssetsWithUsage(assets?.evaluationStructures || []),
    enrichModelForgeAssetsWithUsage(assets?.parameterStructures || []),
  ]);

  return sendSuccess(
    res,
    "Model Forge generated assets fetched successfully",
    {
      ...assets,
      models,
      evaluationStructures,
      parameterStructures,
    }
  );
};

export const previewModelForgeModelPackageAdmin = async (req, res) => {
  const preview = await previewModelForgeModelPackage(req.body || {});

  return sendSuccess(
    res,
    "Model Forge scaffold preview completed successfully",
    preview
  );
};

export const applyModelForgeModelPackageAdmin = async (req, res) => {
  const result = await applyModelForgeModelPackage(req.body || {});

  return sendSuccess(
    res,
    "Model Forge scaffold apply completed successfully",
    result
  );
};

export const deleteModelForgeAssetAdmin = async (req, res) => {
  const kind = normalizeModelForgeAssetKindOrThrow(req.params?.kind);
  const key = normalizeModelForgeAssetKeyOrThrow(req.params?.key);
  const usedByIssuesCount = await countIssuesUsingModelForgeAsset({ kind, key });

  if (usedByIssuesCount > 0) {
    throw createConflictError(
      "This asset is used by existing issues and cannot be deleted.",
      {
        code: "MODEL_FORGE_ASSET_IN_USE",
        field: "key",
        details: {
          kind,
          key,
          usedByIssuesCount,
        },
      }
    );
  }

  const result = await deleteModelForgeAsset(kind, key);

  return sendSuccess(
    res,
    "Model Forge generated asset deleted successfully",
    {
      ...result,
      usedByIssuesCount,
      deletable: true,
    }
  );
};

export const restartBackendAdmin = async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw createForbiddenError("Backend restart is disabled in production.", {
      code: "BACKEND_RESTART_DISABLED",
    });
  }

  let restartScheduled = false;
  const scheduleRestart = () => {
    if (restartScheduled) return;
    restartScheduled = true;

    setTimeout(async () => {
      try {
        await mkdir(path.dirname(BACKEND_RELOAD_MARKER_PATH), {
          recursive: true,
        });
        await writeFile(
          BACKEND_RELOAD_MARKER_PATH,
          JSON.stringify(
            {
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          ) + "\n",
          "utf-8"
        );
      } catch (error) {
        console.error("Failed to update backend reload marker", error);
      }
    }, 250);
  };

  res.on("finish", scheduleRestart);

  return sendSuccess(
    res,
    "Backend restart scheduled successfully",
    {
      service: "backend",
      restartScheduled: true,
    },
    202
  );
};

export const getDecisionModelsServiceHealthAdmin = async (_req, res) => {
  const data = await fetchDecisionModelsServiceHealth({ httpClient: axios });

  return sendSuccess(
    res,
    "DecisionModelsService health retrieved successfully",
    data
  );
};

export const reloadDecisionModelsServiceAdmin = async (_req, res) => {
  const data = await reloadDecisionModelsService({ httpClient: axios });

  return sendSuccess(
    res,
    "DecisionModelsService reload scheduled successfully",
    data,
    202
  );
};

export const getCurrentModelManifestAdmin = async (_req, res) => {
  const manifest = await fetchModelManifest({ httpClient: axios });

  return sendSuccess(
    res,
    "Current DecisionModelsService manifest retrieved successfully",
    manifest
  );
};

export const syncModelManifestAdmin = async (req, res) => {
  if (req.body?.confirm !== true) {
    throw createBadRequestError(
      "Model manifest synchronization requires explicit confirmation",
      {
        code: "CONFIRMATION_REQUIRED",
        field: "confirm",
      }
    );
  }

  const report = await syncModelManifestToIssueModels();

  return sendSuccess(
    res,
    "Model manifest synchronized successfully",
    report
  );
};

export const createUserAdmin = async (req, res) => {
  try {
    const result = await createAdminUserUseCase({
      payload: req.body,
    });

    return sendSuccess(
      res,
      result.message,
      {
        user: result.user,
      },
      201
    );
  } catch (error) {
    throwIfDuplicateEmailError(error);
  }
};

export const updateUserAdmin = async (req, res) => {
  try {
    const result = await updateAdminUserUseCase({
      payload: {
        ...req.body,
        id: req.params.id,
      },
    });

    return sendSuccess(
      res,
      result.message,
      {
        user: result.user,
      },
    );
  } catch (error) {
    throwIfDuplicateEmailError(error);
  }
};

export const deleteUserAdmin = async (req, res) => {
  const id = req.params.id;

  if (!id || !isValidObjectIdLike(id)) {
    throw createBadRequestError("Valid user id is required", {
      field: "id",
    });
  }

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await deleteAdminUserUseCase({
        targetUserId: id,
        adminUserId: req.uid,
        session,
      });
    });

    return sendSuccess(
      res,
      `User ${result.deletedUser.email} deleted successfully`,
      {
        deletedUser: result.deletedUser,
        summary: result.summary,
      },
    );
  } finally {
    await endSessionSafely(session);
  }
};

export const getAllIssuesAdmin = async (req, res) => {
  const data = await getAdminIssuesListPayload({
    search: String(req.query.q || "").trim(),
    active: String(req.query.active || "all").trim().toLowerCase(),
    currentStage: String(req.query.currentStage || "all").trim(),
    isConsensus: String(req.query.isConsensus || "all").trim().toLowerCase(),
    ownerId: String(req.query.ownerId || "").trim(),
    modelId: String(req.query.modelId || "").trim(),
  });

  return sendSuccess(res, "Issues fetched successfully", data);
};

export const getIssueAdminById = async (req, res) => {
  const data = await getIssueAdminDetailPayload({
    issueId: req.params.id,
  });

  return sendSuccess(res, "Issue detail fetched successfully", data);
};

export const getIssueExpertsProgressAdmin = async (req, res) => {
  const data = await getIssueExpertsProgressPayload({
    issueId: req.params.id,
  });

  return sendSuccess(
    res,
    "Issue experts progress fetched successfully",
    data,
  );
};

export const getIssueExpertEvaluationsAdmin = async (req, res) => {
  const data = await getIssueExpertEvaluationsPayload({
    issueId: req.params.issueId,
    expertId: req.params.expertId,
  });

  return sendSuccess(
    res,
    "Expert evaluations fetched successfully",
    data,
  );
};

export const getIssueExpertWeightsAdmin = async (req, res) => {
  const data = await getIssueExpertWeightsPayload({
    issueId: req.params.issueId,
    expertId: req.params.expertId,
  });

  return sendSuccess(res, "Expert weights fetched successfully", data);
};

export const reassignIssueOwnerAdmin = async (req, res) => {
  const result = await reassignIssueOwnerUseCase({
    issueId: req.params.id,
    newOwnerId: req.body.newOwnerId,
  });

  return sendSuccess(
    res,
    result.message,
    {
      issue: result.issue,
      owner: result.owner,
    },
  );
};

export const editIssueExpertsAdmin = async (req, res) => {
  const issueId = req.params.id;

  const { ownerUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await editIssueExpertsUseCase({
    issueId,
    userId: ownerUserId,
    expertsToAdd: req.body.expertsToAdd,
    expertsToRemove: req.body.expertsToRemove,
  });

  return sendSuccess(
    res,
    "Experts updated successfully",
    {
      issueName: result.issueName,
    },
  );
};

export const computeIssueWeightsAdmin = async (req, res) => {
  const issueId = req.params.id;

  const { ownerUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await computeIssueEvaluationStage({
    issueId,
    userId: ownerUserId,
    stage: "criteriaWeighting",
    decisionModelsServiceBaseUrl:
      process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
    httpClient: axios,
  });

  return sendSuccess(
    res,
    result.message,
    {
      currentStage: result.currentStage,
      consensusPhase: result.consensusPhase,
      weightsByCriterion: result.result?.weightsByCriterion ?? {},
      collectiveEvaluations: result.result?.collectiveEvaluations ?? {},
      consensusMeasure: result.result?.consensusMeasure ?? null,
      consensusLifecycle: result.result?.consensusLifecycle ?? null,
      modelExecution: result.result?.modelExecution ?? null,
      rawOutput: result.result?.rawOutput ?? {},
    },
  );
};

export const resolveIssueAdmin = async (req, res) => {
  const issueId = req.params.id;

  const { ownerUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await computeIssueEvaluationStage({
    issueId,
    userId: ownerUserId,
    stage: "alternativeEvaluation",
    decisionModelsServiceBaseUrl:
      process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
    httpClient: axios,
  });

  const finished = result.currentStage === "finished";

  return sendSuccess(
    res,
    result.message,
    {
      finished,
      currentStage: result.currentStage,
      consensusPhase: result.consensusPhase,
      rankedAlternatives: result.result?.rankedAlternatives ?? [],
      collectiveEvaluations: result.result?.collectiveEvaluations ?? {},
      plotsGraphic: result.result?.plotsGraphic ?? {},
      consensusMeasure: result.result?.consensusMeasure ?? null,
      consensusLifecycle: result.result?.consensusLifecycle ?? null,
      modelExecution: result.result?.modelExecution ?? null,
      rawOutput: result.result?.rawOutput ?? {},
    },
  );
};

export const removeIssueAdmin = async (req, res) => {
  const issueId = req.params.id;
  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const { issue } = await getAdminIssueExecutionContextOrThrow({
        issueId,
        session,
      });
      removedIssueName = issue.name;

      await deleteIssueCascade({
        issueId: issue._id,
        session,
      });
    });

    return sendSuccess(
      res,
      `Issue ${removedIssueName} removed`,
      {
        issueName: removedIssueName,
      },
    );
  } finally {
    await endSessionSafely(session);
  }
};

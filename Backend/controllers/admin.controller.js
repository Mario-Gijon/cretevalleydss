import {
  computeAdminIssueWeights,
  editAdminIssueExperts,
  removeAdminIssue,
  resolveAdminIssue,
} from "../modules/admin/issueCommands/index.js";
import {
  getAdminIssuesListPayload,
  getIssueAdminDetailPayload,
  getIssueExpertsProgressPayload,
  getIssueExpertEvaluationsPayload,
  getIssueExpertWeightsPayload,
} from "../modules/admin/issueReads/index.js";
import {
  getAdminModelCatalog,
  updateAdminModelCatalogVisibility,
} from "../modules/admin/modelCatalog/index.js";
import {
  applyAdminModelForgeModelPackage,
  deleteAdminModelForgeAsset,
  getAdminModelForgeAssets,
  getAdminModelForgeCatalog,
  previewAdminModelForgeModelPackage,
} from "../modules/admin/modelForge/index.js";
import { scheduleBackendReload } from "../modules/admin/system/index.js";
import {
  createAdminUser as createAdminUserUseCase,
  deleteAdminUserWorkflow,
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
  createBadRequestError,
  createConflictError,
} from "../utils/common/errors.js";
import { sendSuccess } from "../utils/common/responses.js";

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

export const getAllUsersAdmin = async (req, res) => {
  const data = await getAdminUsersListPayload({
    adminUserId: req.uid,
    search: String(req.query.q || "").trim(),
    includeAdmins: req.query.includeAdmins === "true",
  });

  return sendSuccess(res, "Users fetched successfully", data);
};

export const getModelCatalogAdmin = async (_req, res) => {
  const data = await getAdminModelCatalog();

  return sendSuccess(res, "Model catalog retrieved successfully", data);
};

export const updateModelCatalogVisibilityAdmin = async (req, res) => {
  const data = await updateAdminModelCatalogVisibility({
    modelId: req.params?.id,
    visibleInIssueCreation: req.body?.visibleInIssueCreation,
    visibleInCriteriaWeighting: req.body?.visibleInCriteriaWeighting,
  });

  return sendSuccess(
    res,
    "Model catalog visibility updated successfully",
    data
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
  const catalog = await getAdminModelForgeCatalog();

  return sendSuccess(
    res,
    "Model Forge scaffold catalog fetched successfully",
    catalog
  );
};

export const getModelForgeAssetsAdmin = async (_req, res) => {
  const assets = await getAdminModelForgeAssets();

  return sendSuccess(
    res,
    "Model Forge generated assets fetched successfully",
    assets
  );
};

export const previewModelForgeModelPackageAdmin = async (req, res) => {
  const preview = await previewAdminModelForgeModelPackage(req.body || {});

  return sendSuccess(
    res,
    "Model Forge scaffold preview completed successfully",
    preview
  );
};

export const applyModelForgeModelPackageAdmin = async (req, res) => {
  const result = await applyAdminModelForgeModelPackage(req.body || {});

  return sendSuccess(
    res,
    "Model Forge scaffold apply completed successfully",
    result
  );
};

export const deleteModelForgeAssetAdmin = async (req, res) => {
  const result = await deleteAdminModelForgeAsset({
    kind: req.params?.kind,
    key: req.params?.key,
  });

  return sendSuccess(
    res,
    "Model Forge generated asset deleted successfully",
    result
  );
};

export const restartBackendAdmin = async (_req, res) => {
  const { data, afterResponseFinished } = scheduleBackendReload();
  res.on("finish", afterResponseFinished);

  return sendSuccess(
    res,
    "Backend restart scheduled successfully",
    data,
    202
  );
};

export const getDecisionModelsServiceHealthAdmin = async (_req, res) => {
  const data = await fetchDecisionModelsServiceHealth();

  return sendSuccess(
    res,
    "DecisionModelsService health retrieved successfully",
    data
  );
};

export const reloadDecisionModelsServiceAdmin = async (_req, res) => {
  const data = await reloadDecisionModelsService();

  return sendSuccess(
    res,
    "DecisionModelsService reload scheduled successfully",
    data,
    202
  );
};

export const getCurrentModelManifestAdmin = async (_req, res) => {
  const manifest = await fetchModelManifest();

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
  return deleteAdminUserWorkflow({
    targetUserId: req.params.id,
    adminUserId: req.uid,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, result.data),
  });
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
  const result = await editAdminIssueExperts({
    issueId: req.params.id,
    payload: req.body,
  });

  return sendSuccess(res, result.message, result.data);
};

export const computeIssueWeightsAdmin = async (req, res) => {
  const result = await computeAdminIssueWeights({
    issueId: req.params.id,
  });

  return sendSuccess(res, result.message, result.data);
};

export const resolveIssueAdmin = async (req, res) => {
  const result = await resolveAdminIssue({
    issueId: req.params.id,
  });

  return sendSuccess(res, result.message, result.data);
};

export const removeIssueAdmin = async (req, res) => {
  return removeAdminIssue({
    issueId: req.params.id,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, result.data),
  });
};

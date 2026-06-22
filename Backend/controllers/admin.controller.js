import axios from "axios";
import mongoose from "mongoose";

import { IssueModel } from "../models/IssueModels.js";

import { editIssueExperts as editIssueExpertsUseCase } from "../modules/issues/participants/index.js";
import {
  computeIssueEvaluationStage,
} from "../modules/issues/computation/index.js";
import { deleteActiveIssueAsOwner } from "../modules/issues/lifecycle/index.js";

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
import { syncModelManifestToIssueModels } from "../services/modelApi/modelManifestSync.js";
import { fetchModelForgeCatalog } from "../services/modelForge/modelForgeClient.js";

import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../utils/common/errors.js";
import { toIdString } from "../utils/common/ids.js";
import {
  endSessionSafely,
  isValidObjectIdLike,
} from "../utils/common/mongoose.js";
import { sendSuccess } from "../utils/common/responses.js";
import { getIssueByIdOrThrow } from "../modules/issues/shared/queries.js";

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

  return {
    _id: id,
    id,
    name: model.name,
    apiModelKey: model.apiModelKey,
    isIssueModel: model.isIssueModel === true,
    isCriteriaWeightingModel: model.isCriteriaWeightingModel === true,
    implementationStatus: model.implementationStatus || "ready",
    publicUsable: model.publicUsable !== false,
    visibleInIssueCreation: model.visibleInIssueCreation !== false,
    visibleInCriteriaWeighting: model.visibleInCriteriaWeighting !== false,
    apiEndpoint: model.apiEndpoint,
    manifestSync: model.manifestSync,
    isMultiCriteria: model.isMultiCriteria,
    alternativeEvaluationStructureKey:
      model.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey:
      model.criteriaWeightingStructureKey,
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
  const stale = model.manifestSync.isStale === true;

  if (visibleInIssueCreation && !stale) return 0;
  if (visibleInIssueCreation) return 1;
  if (visibleInCriteriaWeighting && !stale) return 2;
  if (visibleInCriteriaWeighting) return 3;

  return 4;
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

  const visibilityUpdate = {};
  if (hasIssueVisibility) {
    visibilityUpdate.visibleInIssueCreation = visibleInIssueCreation;
  }
  if (hasCriteriaVisibility) {
    visibilityUpdate.visibleInCriteriaWeighting =
      visibleInCriteriaWeighting;
  }

  const model = await IssueModel.findByIdAndUpdate(
    id,
    { $set: visibilityUpdate },
    { new: true, runValidators: true }
  )
    .select("-__v")
    .lean();

  if (!model) {
    throw createNotFoundError("Model not found", {
      field: "id",
    });
  }

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
      const { ownerUserId } = await getAdminIssueExecutionContextOrThrow({
        issueId,
        session,
      });

      const result = await deleteActiveIssueAsOwner({
        issueId,
        userId: ownerUserId,
        session,
      });

      removedIssueName = result.issueName;
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

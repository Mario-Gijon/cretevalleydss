import axios from "axios";
import mongoose from "mongoose";

         
import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";

          
import { editIssueExpertsFlow } from "../modules/issues/participants/index.js";
import {
  computeIssueEvaluationStage,
} from "../modules/decisionEngine/evaluations/index.js";
import { deleteActiveIssueAsAdmin } from "../modules/issues/lifecycle/index.js";

import {
  getAdminIssuesListPayload,
  getIssueAdminDetailPayload,
  getIssueExpertsProgressPayload,
  getIssueExpertEvaluationsPayload,
  getIssueExpertWeightsPayload,
} from "../modules/admin/admin.issueReads.js";

import {
  createUserAdminFlow,
  deleteUserAdminFlow,
  getAdminUsersListPayload,
  reassignIssueAdminFlow,
  updateUserAdminFlow,
} from "../modules/admin/admin.users.js";
import { runModelManifestDryRun } from "../services/modelApi/modelManifestDryRun.js";
import { syncModelManifestToIssueModels } from "../services/modelApi/modelManifestSync.js";

        
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


const getAdminIssueExecutionContextOrThrow = async ({
  issueId,
  session = null,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  let query = Issue.findById(issueId).populate("model");

  if (session) {
    query = query.session(session);
  }

  const issue = await query;

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return {
    issue,
    creatorUserId: toIdString(issue.admin),
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

const mapIssueModelCatalogItem = (model = {}) => {
  const id = toIdString(model._id);

  return {
    _id: id,
    id,
    name: model.name,
    apiModelKey: model.apiModelKey || null,
    isIssueModel: model.isIssueModel === true,
    isCriteriaWeightingModel: model.isCriteriaWeightingModel === true,
    visibleInIssueCreation: model.visibleInIssueCreation !== false,
    visibleInCriteriaWeighting: model.visibleInCriteriaWeighting !== false,
    apiEndpoint: model.apiEndpoint || null,
    manifestSync: model.manifestSync || null,
    isMultiCriteria: model.isMultiCriteria,
    alternativeEvaluationStructureKey:
      model.alternativeEvaluationStructureKey || null,
    criteriaWeightingStructureKey:
      model.criteriaWeightingStructureKey || null,
    usesCriteriaWeights: model.usesCriteriaWeights === true,
    usesFuzzyCriteriaWeights: model.usesFuzzyCriteriaWeights === true,
    usesCriterionTypes: model.usesCriterionTypes === true,
    supportsConsensus: model.supportsConsensus === true,
    supportsConsensusSimulation: model.supportsConsensusSimulation === true,
    lifecycleKind: model.lifecycleKind || null,
    apiInputFormat: model.apiInputFormat || null,
    apiOutputFormat: model.apiOutputFormat || null,
    parameters: Array.isArray(model.parameters) ? model.parameters : [],
    modelInputFields: Array.isArray(model.modelInputFields)
      ? model.modelInputFields
      : [],
    modelOutputFields: Array.isArray(model.modelOutputFields)
      ? model.modelOutputFields
      : [],
    request: model.request || null,
    response: model.response || null,
    supportedDomains: model.supportedDomains || null,
    smallDescription: model.smallDescription,
    extendDescription: model.extendDescription,
    moreInfoUrl: model.moreInfoUrl,
  };
};

const getModelCatalogSortRank = (model = {}) => {
  const visibleInIssueCreation = model.visibleInIssueCreation !== false;
  const visibleInCriteriaWeighting = model.visibleInCriteriaWeighting !== false;
  const stale = model?.manifestSync?.isStale === true;

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

      return String(left.name || "").localeCompare(String(right.name || ""));
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
    const result = await createUserAdminFlow({
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
    const result = await updateUserAdminFlow({
      payload: req.body,
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
  const { id } = req.body || {};

  if (!id || !isValidObjectIdLike(id)) {
    throw createBadRequestError("Valid user id is required", {
      field: "id",
    });
  }

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await deleteUserAdminFlow({
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
    adminId: String(req.query.adminId || "").trim(),
    modelId: String(req.query.modelId || "").trim(),
  });

  return sendSuccess(res, "Issues fetched successfully", data);
};

export const getIssueAdminById = async (req, res) => {
  const data = await getIssueAdminDetailPayload({
    issueId: req.params?.id,
  });

  return sendSuccess(res, "Issue detail fetched successfully", data);
};

export const getIssueExpertsProgressAdmin = async (req, res) => {
  const data = await getIssueExpertsProgressPayload({
    issueId: req.params?.id,
  });

  return sendSuccess(
    res,
    "Issue experts progress fetched successfully",
    data,
  );
};

export const getIssueExpertEvaluationsAdmin = async (req, res) => {
  const data = await getIssueExpertEvaluationsPayload({
    issueId: req.params?.issueId,
    expertId: req.params?.expertId,
  });

  return sendSuccess(
    res,
    "Expert evaluations fetched successfully",
    data,
  );
};

export const getIssueExpertWeightsAdmin = async (req, res) => {
  const data = await getIssueExpertWeightsPayload({
    issueId: req.params?.issueId,
    expertId: req.params?.expertId,
  });

  return sendSuccess(res, "Expert weights fetched successfully", data);
};

export const reassignIssueAdminAdmin = async (req, res) => {
  const result = await reassignIssueAdminFlow({
    issueId: req.body?.issueId,
    newAdminId: req.body?.newAdminId,
  });

  return sendSuccess(
    res,
    result.message,
    {
      issue: result.issue,
      admin: result.admin,
    },
  );
};

export const editIssueExpertsAdmin = async (req, res) => {
  const issueId = req.body?.issueId || req.body?.id;

  const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await editIssueExpertsFlow({
    issueId,
    userId: creatorUserId,
    expertsToAdd: Array.isArray(req.body?.expertsToAdd)
      ? req.body.expertsToAdd
      : [],
    expertsToRemove: Array.isArray(req.body?.expertsToRemove)
      ? req.body.expertsToRemove
      : [],
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
  const issueId = req.body?.issueId || req.body?.id;

  const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await computeIssueEvaluationStage({
    issueId,
    userId: creatorUserId,
    stage: "criteriaWeighting",
    apiModelsBaseUrl:
      process.env.ORIGIN_APIMODELS || "http://localhost:7000",
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
  const issueId = req.body?.issueId || req.body?.id;

  const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
    issueId,
  });

  const result = await computeIssueEvaluationStage({
    issueId,
    userId: creatorUserId,
    stage: "alternativeEvaluation",
    apiModelsBaseUrl:
      process.env.ORIGIN_APIMODELS || "http://localhost:7000",
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
  const issueId = req.body?.issueId || req.body?.id;
  const session = await mongoose.startSession();

  try {
    let removedIssueName = "";

    await session.withTransaction(async () => {
      const { creatorUserId } = await getAdminIssueExecutionContextOrThrow({
        issueId,
        session,
      });

      const result = await deleteActiveIssueAsAdmin({
        issueId,
        userId: creatorUserId,
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

import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { EVALUATION_STRUCTURES } from "../issue.evaluationStructure.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { executeResolutionModelPipeline } from "../resolution/resolution.execution.js";
import { getCreateScenarioContext } from "./scenario.context.js";
import { buildScenarioPayload } from "./scenario.payloads.js";
import axios from "axios";

/**
 * @typedef {Object} IssueScenarioCreateResult
 * @property {*} scenarioId Id del escenario creado.
 */

export const createIssueScenarioFlow = async ({
  userId,
  issueId,
  targetModelId,
  scenarioName = "",
  paramOverrides = {},
}) => {
  const context = await getCreateScenarioContext({
    issueId,
    userId,
    targetModelId,
    paramOverrides,
  });

  const {
    matricesUsed,
    snapshotIdsUsed,
    results,
    collectiveEvaluations,
    consensusDetails,
    consensusLevel,
  } = await executeResolutionModelPipeline({
    issue: {
      isConsensus: context.targetRuntimeModel?.outputKind === "consensusRanking",
      consensusThreshold: context.consensusThresholdUsed,
    },
    issueId: context.issue._id,
    model: context.targetRuntimeModel,
    evaluationStructure: context.issueEvaluationStructure,
    alternatives: context.alternatives,
    criteria: context.criteria,
    participations: context.participations,
    currentPhase: context.evaluationPhase,
    modelParameters: context.normalizedParams,
    apiModelsBaseUrl: process.env.ORIGIN_APIMODELS || "http://localhost:7000",
    httpClient: axios,
    requireCompleteMatrices: true,
    incompleteMatricesMessage:
      context.issueEvaluationStructure === EVALUATION_STRUCTURES.DIRECT
        ? "Simulation requires complete evaluations (some values are still null)."
        : "Simulation requires complete pairwise evaluations (some values are still null).",
    requestErrorMessage: "Error creating scenario",
  });

  const details = {
    ...consensusDetails,
    ...(consensusLevel != null ? { level: consensusLevel } : {}),
  };
  if (details?.modelExecution?.apiModelKey != null) {
    details.modelExecution.modelKey = details.modelExecution.apiModelKey;
  }
  const criterionTypes =
    context.issueEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
      ? []
      : context.criteria.map((criterion) =>
          criterion.type === "benefit" ? "max" : "min"
        );

  const scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: String(scenarioName || "").trim(),
    targetModel: context.targetModel._id,
    targetModelName: context.targetModel.name,
    targetApiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    targetApiEndpoint: context.targetRuntimeSnapshot.targetApiEndpoint,
    targetInputKind: context.targetRuntimeSnapshot.targetInputKind,
    targetOutputKind: context.targetRuntimeSnapshot.targetOutputKind,
    targetEvaluationStructure:
      context.targetRuntimeSnapshot.targetEvaluationStructure,
    targetLifecycleKind: context.targetRuntimeSnapshot.targetLifecycleKind,
    targetModelFamilyKey: context.targetRuntimeSnapshot.targetModelFamilyKey,
    targetModelVersion: context.targetRuntimeSnapshot.targetModelVersion,
    targetVersionLabel: context.targetRuntimeSnapshot.targetVersionLabel,
    domainType: context.domainType,
    evaluationStructure: context.targetEvaluationStructure,
    status: "done",
    config: {
      modelParameters: context.paramsUsed,
      normalizedModelParameters: context.normalizedParams,
      criterionTypes,
    },
    inputs: {
      consensusPhaseUsed: context.evaluationPhase,
      expertsOrder: context.expertsOrder,
      alternatives: context.alternatives.map((alternative) => ({
        id: alternative._id,
        name: alternative.name,
      })),
      criteria: context.criteria.map((criterion) => ({
        id: criterion._id,
        name: criterion.name,
        criterionType: criterion.type,
      })),
      weightsUsed: context.paramsUsed?.weights ?? null,
      matricesUsed,
      snapshotIdsUsed,
    },
    outputs: {
      details,
      collectiveEvaluations,
      rawResults: results,
    },
  });

  return {
    scenarioId: scenario._id,
  };
};

export const getIssueScenariosPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const scenarioDocs = await IssueScenario.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .select(
      "_id name targetModelName targetVersionLabel domainType evaluationStructure status createdAt createdBy"
    )
    .populate("createdBy", "email name")
    .lean();

  return {
    scenarios: scenarioDocs.map(buildScenarioPayload),
  };
};

export const getScenarioByIdPayload = async ({ scenarioId }) => {
  if (!scenarioId || !isValidObjectIdLike(scenarioId)) {
    throw createBadRequestError("Valid scenario id is required", {
      field: "scenarioId",
    });
  }

  const scenarioDoc = await IssueScenario.findById(scenarioId)
    .populate("createdBy", "email name")
    .lean();

  if (!scenarioDoc) {
    throw createNotFoundError("Scenario not found", {
      field: "scenarioId",
    });
  }

  return {
    scenario: buildScenarioPayload(scenarioDoc),
  };
};

export const removeIssueScenarioFlow = async ({ scenarioId, userId }) => {
  if (!scenarioId || !isValidObjectIdLike(scenarioId)) {
    throw createBadRequestError("Valid scenario id is required", {
      field: "scenarioId",
    });
  }

  const scenario = await IssueScenario.findById(scenarioId);
  if (!scenario) {
    throw createNotFoundError("Scenario not found", {
      field: "scenarioId",
    });
  }

  const issue = await Issue.findById(scenario.issue).select("admin").lean();
  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const isCreator = sameId(scenario.createdBy, userId);
  const isAdmin = sameId(issue.admin, userId);

  if (!isCreator && !isAdmin) {
    throw createForbiddenError("Not authorized to delete this scenario");
  }

  await IssueScenario.deleteOne({ _id: scenario._id });
};

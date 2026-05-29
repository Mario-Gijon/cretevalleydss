import axios from "axios";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { getCreateScenarioContext } from "./scenario.context.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import { isPlainObject } from "../../../utils/common/objects.js";

const normalizeResultOrThrow = ({ result }) => {
  if (result === null || result === undefined) {
    throw createInternalError("Scenario model execution result is required", {
      field: "result",
    });
  }

  if (!Array.isArray(result?.rankedAlternatives) || result.rankedAlternatives.length === 0) {
    throw createInternalError(
      "Scenario model execution result.rankedAlternatives must be a non-empty array",
      {
        field: "result.rankedAlternatives",
      }
    );
  }

  for (const [index, entry] of result.rankedAlternatives.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw createInternalError("Invalid rankedAlternatives entry", {
        field: `result.rankedAlternatives[${index}]`,
      });
    }

    if (typeof entry.name !== "string" || !entry.name.trim()) {
      throw createInternalError("rankedAlternatives entry requires name", {
        field: `result.rankedAlternatives[${index}].name`,
      });
    }

    if (!Number.isFinite(Number(entry.score))) {
      throw createInternalError("rankedAlternatives entry requires finite score", {
        field: `result.rankedAlternatives[${index}].score`,
      });
    }

    if (!Number.isInteger(Number(entry.rank)) || Number(entry.rank) <= 0) {
      throw createInternalError("rankedAlternatives entry requires positive rank", {
        field: `result.rankedAlternatives[${index}].rank`,
      });
    }
  }

  if (!isPlainObject(result.collectiveEvaluations)) {
    throw createInternalError(
      "Scenario model execution result.collectiveEvaluations is required",
      {
        field: "result.collectiveEvaluations",
      }
    );
  }

  if (!isPlainObject(result.plotsGraphic)) {
    throw createInternalError("Scenario model execution result.plotsGraphic is required", {
      field: "result.plotsGraphic",
    });
  }

  if (
    result.consensusMeasure !== null &&
    !Number.isFinite(result.consensusMeasure)
  ) {
    throw createInternalError(
      "Scenario model execution result.consensusMeasure must be finite or null",
      {
        field: "result.consensusMeasure",
      }
    );
  }

  if (!isPlainObject(result.rawOutput)) {
    throw createInternalError("Scenario model execution result.rawOutput is required", {
      field: "result.rawOutput",
    });
  }

  return {
    standardResult: {
      rankedAlternatives: result.rankedAlternatives,
      collectiveEvaluations: result.collectiveEvaluations,
      plotsGraphic: result.plotsGraphic,
      consensusMeasure: result.consensusMeasure,
      consensusLifecycle: result.consensusLifecycle ?? null,
      rawOutput: result.rawOutput,
    },
    rawOutput: result.rawOutput,
  };
};

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

  let response;
  try {
    response = await axios.post(
      `${process.env.ORIGIN_APIMODELS || "http://localhost:7000"}${
        context.targetRuntimeSnapshot.targetApiEndpoint.path
      }`,
      context.requestPayload
    );
  } catch (error) {
    throw createModelApiRequestError(error, "Scenario model execution failed");
  }

  const rawResult = unwrapModelApiResponse(response, "Scenario model execution failed");

  const {
    standardResult,
    rawOutput,
  } = normalizeResultOrThrow({ result: rawResult });

  const modelExecution = {
    kind: "apiModels",
    structureKey:
      context.targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey,
    apiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    apiEndpointPath: context.targetRuntimeSnapshot.targetApiEndpoint.path,
    executedAt: new Date(),
  };

  const scenario = await IssueScenario.create({
    issue: context.issue._id,
    createdBy: userId,
    name: String(scenarioName || "").trim(),
    targetModel: context.targetModel._id,
    targetModelName: context.targetModel.name,
    targetApiModelKey: context.targetRuntimeSnapshot.targetApiModelKey,
    targetApiEndpoint: context.targetRuntimeSnapshot.targetApiEndpoint,
    targetModelFamilyKey: context.targetRuntimeSnapshot.targetModelFamilyKey,
    targetModelVersion: context.targetRuntimeSnapshot.targetModelVersion,
    targetVersionLabel: context.targetRuntimeSnapshot.targetVersionLabel,
    targetAlternativeEvaluationStructureKey:
      context.targetRuntimeSnapshot.targetAlternativeEvaluationStructureKey,
    targetSupportsConsensus: context.targetRuntimeSnapshot.targetSupportsConsensus,
    alternativeEvaluationStructureKey: context.issue.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey: context.issue.criteriaWeightingStructureKey,
    domainType: context.domainType,
    status: "done",
    config: {
      modelParameters: context.paramsUsed,
      normalizedModelParameters: context.normalizedParams,
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
      weightsUsed: context.weightsUsed,
      evaluationPayloads: context.evaluationPayloads,
      context: context.scenarioExecutionContext,
    },
    outputs: {
      standardResult,
      modelExecution,
      rawOutput,
    },
  });

  return {
    scenarioId: scenario._id,
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

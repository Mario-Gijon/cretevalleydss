import axios from "axios";
import { Issue } from "../../../models/Issues.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { getCreateScenarioContext } from "./scenario.context.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";
import { EVALUATION_STRUCTURE_KEYS } from "../evaluations/evaluation.constants.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeResultOrThrow = ({ result }) => {
  if (!isPlainObject(result)) {
    throw createInternalError("Scenario model execution result must be an object", {
      field: "result",
    });
  }

  if (!Array.isArray(result.ranking)) {
    throw createInternalError("Scenario result field 'ranking' must be an array", {
      field: "ranking",
    });
  }

  if (!Array.isArray(result.rankedWithScores)) {
    throw createInternalError(
      "Scenario result field 'rankedWithScores' must be an array",
      {
        field: "rankedWithScores",
      }
    );
  }

  if (!isPlainObject(result.scoresByAlternative)) {
    throw createInternalError(
      "Scenario result field 'scoresByAlternative' must be an object",
      {
        field: "scoresByAlternative",
      }
    );
  }

  if (!isPlainObject(result.matrixUsed)) {
    throw createInternalError("Scenario result field 'matrixUsed' must be an object", {
      field: "matrixUsed",
    });
  }

  if (!Object.prototype.hasOwnProperty.call(result, "consensusMeasure")) {
    throw createInternalError(
      "Scenario result field 'consensusMeasure' is required",
      {
        field: "consensusMeasure",
      }
    );
  }

  const collectivePayload = isPlainObject(result.collectivePayload)
    ? result.collectivePayload
    : {};
  const plotsGraphic = isPlainObject(result.plotsGraphic)
    ? result.plotsGraphic
    : {};

  const rawOutput =
    result.rawOutput === undefined || result.rawOutput === null
      ? {}
      : result.rawOutput;

  if (!isPlainObject(rawOutput) && !Array.isArray(rawOutput)) {
    throw createInternalError("Scenario result field 'rawOutput' must be an object", {
      field: "rawOutput",
    });
  }

  return {
    standardResult: {
      ranking: result.ranking,
      rankedWithScores: result.rankedWithScores,
      scoresByAlternative: result.scoresByAlternative,
      matrixUsed: result.matrixUsed,
      collectivePayload,
      plotsGraphic,
      consensusMeasure: result.consensusMeasure ?? null,
      rawOutput,
    },
    computedPayload: {
      ranking: result.ranking,
      rankedWithScores: result.rankedWithScores,
      scoresByAlternative: result.scoresByAlternative,
      matrixUsed: result.matrixUsed,
      plotsGraphic,
    },
    collectivePayload,
    rawOutput,
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
    computedPayload,
    collectivePayload,
    rawOutput,
  } = normalizeResultOrThrow({ result: rawResult });

  const modelExecution = {
    kind: "apiModels",
    structureKey: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX,
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
    targetCriteriaWeightingStructureKey:
      context.targetRuntimeSnapshot.targetCriteriaWeightingStructureKey,
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
      computedPayload,
      collectivePayload,
      modelExecution,
      rawOutput,
    },
  });

  return {
    scenarioId: scenario._id,
  };
};

const mapScenarioListItem = (scenario) => ({
  id: toIdString(scenario?._id),
  name: scenario?.name || "",
  targetModelId: toIdString(scenario?.targetModel),
  targetModelName: scenario?.targetModelName || null,
  targetVersionLabel: scenario?.targetVersionLabel || null,
  domainType: scenario?.domainType ?? null,
  alternativeEvaluationStructureKey:
    scenario?.alternativeEvaluationStructureKey ||
    scenario?.targetAlternativeEvaluationStructureKey ||
    null,
  criteriaWeightingStructureKey:
    scenario?.criteriaWeightingStructureKey ||
    scenario?.targetCriteriaWeightingStructureKey ||
    null,
  status: scenario?.status || null,
  createdAt: scenario?.createdAt || null,
  createdBy: scenario?.createdBy
    ? {
        email: scenario.createdBy.email,
        name: scenario.createdBy.name,
      }
    : null,
});

export const getIssueScenariosPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const scenarioDocs = await IssueScenario.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .select(
      "_id name targetModel targetModelName targetVersionLabel domainType alternativeEvaluationStructureKey criteriaWeightingStructureKey targetAlternativeEvaluationStructureKey targetCriteriaWeightingStructureKey status createdAt createdBy"
    )
    .populate("createdBy", "email name")
    .lean();

  return {
    scenarios: scenarioDocs.map(mapScenarioListItem),
  };
};

const mapScenarioDetail = (scenarioDoc) => ({
  id: toIdString(scenarioDoc?._id),
  issueId: toIdString(scenarioDoc?.issue),
  name: scenarioDoc?.name || "",
  targetModelId: toIdString(scenarioDoc?.targetModel),
  targetModelName: scenarioDoc?.targetModelName || null,
  targetApiModelKey: scenarioDoc?.targetApiModelKey || null,
  targetApiEndpoint: scenarioDoc?.targetApiEndpoint || null,
  targetModelFamilyKey: scenarioDoc?.targetModelFamilyKey || null,
  targetModelVersion: scenarioDoc?.targetModelVersion || null,
  targetVersionLabel: scenarioDoc?.targetVersionLabel || null,
  targetAlternativeEvaluationStructureKey:
    scenarioDoc?.targetAlternativeEvaluationStructureKey || null,
  targetCriteriaWeightingStructureKey:
    scenarioDoc?.targetCriteriaWeightingStructureKey || null,
  targetSupportsConsensus: scenarioDoc?.targetSupportsConsensus === true,
  alternativeEvaluationStructureKey:
    scenarioDoc?.alternativeEvaluationStructureKey || null,
  criteriaWeightingStructureKey:
    scenarioDoc?.criteriaWeightingStructureKey || null,
  domainType: scenarioDoc?.domainType ?? null,
  status: scenarioDoc?.status || null,
  error: scenarioDoc?.error || null,
  config: scenarioDoc?.config || {},
  inputs: scenarioDoc?.inputs || {},
  outputs: scenarioDoc?.outputs || {},
  createdAt: scenarioDoc?.createdAt || null,
  updatedAt: scenarioDoc?.updatedAt || null,
  createdBy: scenarioDoc?.createdBy
    ? {
        email: scenarioDoc.createdBy.email,
        name: scenarioDoc.createdBy.name,
      }
    : null,
});

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
    scenario: mapScenarioDetail(scenarioDoc),
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

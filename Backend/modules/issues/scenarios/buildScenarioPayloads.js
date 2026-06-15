import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

const mapScenarioListItem = (scenario) => ({
  id: toIdString(scenario?._id),
  name: scenario?.name || "",
  targetModelId: toIdString(scenario?.targetModel),
  targetModelName: scenario?.targetModelName || null,
  domainType: scenario?.domainType ?? null,
  alternativeEvaluationStructureKey:
    scenario?.alternativeEvaluationStructureKey ||
    scenario?.targetAlternativeEvaluationStructureKey ||
    null,
  criteriaWeightingStructureKey:
    scenario?.criteriaWeightingStructureKey ||
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

const mapScenarioDetail = (scenarioDoc) => ({
  id: toIdString(scenarioDoc?._id),
  issueId: toIdString(scenarioDoc?.issue),
  name: scenarioDoc?.name || "",
  targetModelId: toIdString(scenarioDoc?.targetModel),
  targetModelName: scenarioDoc?.targetModelName || null,
  targetApiModelKey: scenarioDoc?.targetApiModelKey || null,
  targetApiEndpoint: scenarioDoc?.targetApiEndpoint || null,
  targetAlternativeEvaluationStructureKey:
    scenarioDoc?.targetAlternativeEvaluationStructureKey || null,
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

export const getIssueScenariosPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const scenarioDocs = await IssueScenario.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .select(
      "_id name targetModel targetModelName domainType alternativeEvaluationStructureKey criteriaWeightingStructureKey targetAlternativeEvaluationStructureKey status createdAt createdBy"
    )
    .populate("createdBy", "email name")
    .lean();

  return {
    scenarios: scenarioDocs.map(mapScenarioListItem),
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
    scenario: mapScenarioDetail(scenarioDoc),
  };
};

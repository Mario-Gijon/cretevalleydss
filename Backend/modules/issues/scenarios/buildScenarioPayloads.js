import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import {
  assertUserCanAccessIssue,
  getIssueByIdOrThrow,
} from "../shared/queries.js";

const mapScenarioListItem = (scenario) => ({
  id: toIdString(scenario?._id),
  name: scenario?.name || "",
  targetModel: scenario?.targetModel
    ? {
        id: toIdString(scenario.targetModel),
        name: scenario.targetModel.name ?? null,
      }
    : null,
  source: {
    domainType: scenario?.source?.domainType ?? null,
  },
  execution: {
    status: scenario?.execution?.status ?? null,
  },
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
  description: scenarioDoc?.description || "",
  targetModel: scenarioDoc?.targetModel
    ? {
        id: toIdString(scenarioDoc.targetModel),
        name: scenarioDoc.targetModel.name ?? null,
      }
    : null,
  source: scenarioDoc?.source || {},
  config: scenarioDoc?.config || {},
  requestSnapshot: scenarioDoc?.requestSnapshot || {},
  result: scenarioDoc?.result || {},
  execution: scenarioDoc?.execution || {},
  createdAt: scenarioDoc?.createdAt || null,
  updatedAt: scenarioDoc?.updatedAt || null,
  createdBy: scenarioDoc?.createdBy
    ? {
        email: scenarioDoc.createdBy.email,
        name: scenarioDoc.createdBy.name,
      }
    : null,
});

export const getIssueScenariosPayload = async ({ issueId, userId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  await assertUserCanAccessIssue({
    issueId,
    userId,
    message: "Not authorized to access scenarios for this issue",
  });

  const scenarioDocs = await IssueScenario.find({ issue: issueId })
    .sort({ createdAt: -1 })
    .select(
      "_id name targetModel source.domainType execution.status createdAt createdBy"
    )
    .populate("targetModel", "name")
    .populate("createdBy", "email name")
    .lean();

  return {
    scenarios: scenarioDocs.map(mapScenarioListItem),
  };
};

export const getScenarioByIdPayload = async ({ scenarioId, userId }) => {
  if (!scenarioId || !isValidObjectIdLike(scenarioId)) {
    throw createBadRequestError("Valid scenario id is required", {
      field: "scenarioId",
    });
  }

  const scenarioDoc = await IssueScenario.findById(scenarioId)
    .populate("targetModel", "name")
    .populate("createdBy", "email name")
    .lean();

  if (!scenarioDoc) {
    throw createNotFoundError("Scenario not found", {
      field: "scenarioId",
    });
  }

  const issue = await getIssueByIdOrThrow(scenarioDoc.issue, {
    select: "ownerId active",
    lean: true,
  });

  await assertUserCanAccessIssue({
    issue,
    userId,
    message: "Not authorized to access this scenario",
  });

  return {
    scenario: mapScenarioDetail(scenarioDoc),
  };
};

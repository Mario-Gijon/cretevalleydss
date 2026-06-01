import { IssueScenario } from "../../../models/IssueScenarios.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

export const removeIssueScenario = async ({ scenarioId, userId }) => {
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

  const issue = await getIssueByIdOrThrow(scenario.issue, {
    select: "admin",
    lean: true,
  });

  const isCreator = sameId(scenario.createdBy, userId);
  const isAdmin = sameId(issue.admin, userId);

  if (!isCreator && !isAdmin) {
    throw createForbiddenError("Not authorized to delete this scenario");
  }

  await IssueScenario.deleteOne({ _id: scenario._id });
};

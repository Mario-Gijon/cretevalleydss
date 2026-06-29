import { IssueScenario } from "../../../models/IssueScenarios.js";
import {
  assertUserCanAccessIssue,
  getIssueByIdOrThrow,
} from "../shared/queries.js";
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
    select: "ownerId active",
    lean: true,
  });

  await assertUserCanAccessIssue({
    issue,
    userId,
    message: "Not authorized to delete this scenario",
  });

  const isCreator = sameId(scenario.createdBy, userId);
  const isIssueOwner = sameId(issue.ownerId, userId);

  if (!isCreator && !isIssueOwner) {
    throw createForbiddenError("Not authorized to delete this scenario");
  }

  await IssueScenario.deleteOne({ _id: scenario._id });
};

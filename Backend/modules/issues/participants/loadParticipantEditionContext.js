import { User } from "../../../models/Users.js";

import { mapIssueStageToExitStage } from "../lifecycle/index.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { normalizeEmail } from "../../../utils/common/strings.js";
import {
  ensureIssueOrdersDb,
  getOrderedLeafCriteriaDb,
} from "../shared/ordering.js";

export const normalizeParticipantEditionRequest = ({
  expertsToAdd,
  expertsToRemove,
}) => {
  if (!Array.isArray(expertsToAdd)) {
    throw createBadRequestError("expertsToAdd must be an array", {
      field: "expertsToAdd",
    });
  }

  if (!Array.isArray(expertsToRemove)) {
    throw createBadRequestError("expertsToRemove must be an array", {
      field: "expertsToRemove",
    });
  }

  const normalizedExpertsToAdd = Array.from(
    new Set(expertsToAdd.map(normalizeEmail).filter(Boolean))
  );

  const normalizedExpertsToRemove = Array.from(
    new Set(expertsToRemove.map(normalizeEmail).filter(Boolean))
  );

  const removeSet = new Set(normalizedExpertsToRemove);

  const finalExpertsToAdd = normalizedExpertsToAdd.filter(
    (email) => !removeSet.has(email)
  );

  const finalExpertsToRemove = normalizedExpertsToRemove.filter(
    (email) => !finalExpertsToAdd.includes(email)
  );

  return {
    finalExpertsToAdd,
    finalExpertsToRemove,
  };
};

export const loadParticipantEditionContext = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    lean: false,
    populate: "model",
    session,
  });

  if (!sameId(issue.ownerId, userId)) {
    throw createForbiddenError("Not authorized to edit this issue's experts.");
  }

  await ensureIssueOrdersDb({ issueId: issue._id, session });

  const [leafCriteria, owner] = await Promise.all([
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      session,
      select: "_id name type",
      lean: true,
    }),
    User.findById(userId).select("name email").session(session).lean(),
  ]);

  if (!owner) {
    throw createInternalError("Issue owner not found while editing experts", {
      field: "userId",
      details: {
        issueId: issue._id,
        userId,
      },
    });
  }

  return {
    issue,
    owner,
    leafCriteria,
    currentPhase: issue.consensusPhase,
    stageForLog: mapIssueStageToExitStage(issue.currentStage, {
      issueId: issue._id,
    }),
  };
};

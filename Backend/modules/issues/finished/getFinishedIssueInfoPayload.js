import {
  buildFinishedPayload,
  supportsFinishedPayload,
} from "./finishedPayload/index.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

import {
  createInternalError,
} from "../../../utils/common/errors.js";

export const getFinishedIssueInfoPayload = async ({ issueId }) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: [
      { path: "model" },
      { path: "admin", select: "email name" },
    ],
    lean: true,
  });

  if (!supportsFinishedPayload(issue)) {
    throw createInternalError(
      "Finished issue requires finished evaluation payload support",
      {
        field: "alternativeEvaluationStructureKey",
        details: {
          issueId: issue._id.toString(),
        },
      }
    );
  }

  return buildFinishedPayload({ issue });
};

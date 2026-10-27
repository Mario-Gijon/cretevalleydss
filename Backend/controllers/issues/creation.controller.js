import {
  createIssueWorkflow,
  diagnoseCreatorCriteriaWeighting as diagnoseCreatorCriteriaWeightingModule,
} from "../../modules/issues/creation/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const createIssue = async (req, res) => {
  return createIssueWorkflow({
    issueInfo: req.body.issueInfo,
    ownerUserId: req.uid,
    beforeSessionCleanup: (result) =>
      sendSuccess(
        res,
        `Issue ${result.issueName} created successfully`,
        {
          issueName: result.issueName,
        },
        201
      ),
  });
};

export const diagnoseCreatorCriteriaWeighting = async (req, res) => {
  const diagnostic = await diagnoseCreatorCriteriaWeightingModule({
    userId: req.uid,
    input: req.body,
  });

  return sendSuccess(
    res,
    "AHP consistency diagnostic completed successfully",
    diagnostic
  );
};

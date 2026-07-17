import { toIdString } from "../../utils/common/ids.js";
import { runWithTransaction } from "../../utils/common/mongoose.js";
import { updateUserExpressionDomain } from "./updateExpressionDomain.js";

export const updateExpressionDomainWorkflow = ({
  domainId,
  userId,
  updatedDomain,
  beforeSessionCleanup,
}) =>
  runWithTransaction(
    (session) =>
      updateUserExpressionDomain({
        domainId,
        userId: toIdString(userId),
        updatedDomain,
        session,
      }),
    { onSuccessBeforeCleanup: beforeSessionCleanup }
  );

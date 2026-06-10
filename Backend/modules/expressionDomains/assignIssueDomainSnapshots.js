import { createInternalError } from "../../utils/common/errors.js";
import { createIssueDomainSnapshots } from "./createIssueDomainSnapshots.js";
import { toIdString } from "../../utils/common/ids.js";

export const assignIssueExpressionDomainSnapshotsOrThrow = async ({
  issueId,
  domainDocs,
  leafCriteria,
  domainIdByCriterionName,
  session,
}) => {
  const snapshotIdBySourceDomainId = await createIssueDomainSnapshots({
    issueId,
    domainDocs,
    session,
  });

  for (const leafCriterion of leafCriteria) {
    const criterionName = leafCriterion.name;
    const sourceDomainId = domainIdByCriterionName.get(criterionName);
    const snapshotId = snapshotIdBySourceDomainId.get(sourceDomainId);

    if (!snapshotId) {
      throw createInternalError(
        `Missing IssueExpressionDomain snapshot for criterion '${criterionName}'`,
        {
          field: "expressionDomain",
          details: {
            issueId: toIdString(issueId),
            criterionName,
            sourceDomainId,
          },
        }
      );
    }

    leafCriterion.expressionDomain = snapshotId;
    await leafCriterion.save({ session });
  }
};

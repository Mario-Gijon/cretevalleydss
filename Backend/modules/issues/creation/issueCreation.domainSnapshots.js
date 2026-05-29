import { createBadRequestError } from "../../../utils/common/errors.js";
import { createIssueDomainSnapshots } from "../expressionDomains/issueDomainSnapshots.js";

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
      throw createBadRequestError(
        `Missing IssueExpressionDomain snapshot for criterion '${criterionName}'`,
        {
          field: "expressionDomainConfig",
        }
      );
    }

    leafCriterion.expressionDomain = snapshotId;
    await leafCriterion.save({ session });
  }
};

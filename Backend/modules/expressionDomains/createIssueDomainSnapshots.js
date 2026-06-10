import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { createInternalError } from "../../utils/common/errors.js";
import { toIdString } from "../../utils/common/ids.js";

export const createIssueDomainSnapshots = async ({
  issueId,
  domainDocs,
  session,
}) => {
  if (domainDocs.length === 0) {
    throw createInternalError("Issue expression domains are required", {
      field: "expressionDomainConfig",
      details: {
        issueId: toIdString(issueId),
      },
    });
  }

  const uniqueDomainsById = new Map();

  for (const domain of domainDocs) {
    const domainId = toIdString(domain._id);

    if (!domainId) {
      throw createInternalError("Expression domain id is invalid", {
        field: "expressionDomainConfig",
        details: {
          issueId: toIdString(issueId),
        },
      });
    }

    uniqueDomainsById.set(domainId, domain);
  }

  const uniqueDomainDocs = Array.from(uniqueDomainsById.values());

  const snapshotPayload = uniqueDomainDocs.map((domain) => ({
    issue: issueId,
    sourceDomain: domain._id,
    name: domain.name,
    type: domain.type,
    numericRange: domain.type === "numeric" ? domain.numericRange : undefined,
    membershipFunction:
      domain.type === "linguistic" ? domain.membershipFunction : null,
    valueCount: domain.type === "linguistic" ? domain.valueCount : null,
    valuesMode: domain.type === "linguistic" ? domain.valuesMode : null,
    linguisticLabels:
      domain.type === "linguistic" ? domain.linguisticLabels : [],
  }));

  const createdSnapshots = await IssueExpressionDomain.insertMany(
    snapshotPayload,
    {
      session,
      ordered: true,
    }
  );

  const snapshotMap = new Map();

  for (const snapshot of createdSnapshots) {
    const sourceDomainId = toIdString(snapshot.sourceDomain);

    if (!sourceDomainId) {
      throw createInternalError("Issue expression domain snapshot sourceDomain is invalid", {
        field: "sourceDomain",
        details: {
          issueId: toIdString(issueId),
          snapshotId: toIdString(snapshot._id),
        },
      });
    }

    snapshotMap.set(sourceDomainId, snapshot._id);
  }

  return snapshotMap;
};

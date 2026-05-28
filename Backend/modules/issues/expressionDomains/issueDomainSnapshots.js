import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { toIdString } from "../../../utils/common/ids.js";

export const createIssueDomainSnapshots = async ({
  issueId,
  domainDocs,
  session,
}) => {
  if (!Array.isArray(domainDocs) || domainDocs.length === 0) {
    return new Map();
  }

  const uniqueDomainsById = new Map();

  for (const domain of domainDocs) {
    const domainId = toIdString(domain?._id);

    if (!domainId) {
      continue;
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
      domain.type === "linguistic" ? domain.membershipFunction || null : null,
    valueCount: domain.type === "linguistic" ? domain.valueCount ?? null : null,
    valuesMode: domain.type === "linguistic" ? domain.valuesMode || null : null,
    linguisticLabels:
      domain.type === "linguistic" ? domain.linguisticLabels || [] : [],
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
    snapshotMap.set(toIdString(snapshot.sourceDomain), snapshot._id);
  }

  return snapshotMap;
};

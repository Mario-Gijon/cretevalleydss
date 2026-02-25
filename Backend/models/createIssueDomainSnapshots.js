import { IssueExpressionDomain } from "./IssueExpressionDomains.js";

export const createIssueDomainSnapshots = async ({ issueId, domainDocs, session }) => {
  // domainDocs: documentos de ExpressionDomain con campos name/type/numericRange/linguisticLabels
  if (!Array.isArray(domainDocs) || domainDocs.length === 0) {
    return new Map();
  }

  // ✅ Deduplicar por _id (por si llega repetido)
  const uniq = new Map();
  for (const d of domainDocs) {
    if (!d?._id) continue;
    uniq.set(String(d._id), d);
  }
  const uniqueDomainDocs = Array.from(uniq.values());

  const snapshotPayload = uniqueDomainDocs.map((d) => ({
    issue: issueId,
    sourceDomain: d._id,
    name: d.name,
    type: d.type,
    numericRange: d.type === "numeric" ? d.numericRange : undefined,
    linguisticLabels: d.type === "linguistic" ? (d.linguisticLabels || []) : [],
  }));

  const created = await IssueExpressionDomain.insertMany(snapshotPayload, {
    session,
    ordered: true,
  });

  // Map: sourceDomainId -> issueSnapshotId
  const map = new Map();
  for (const snap of created) {
    map.set(String(snap.sourceDomain), snap._id);
  }
  return map;
};

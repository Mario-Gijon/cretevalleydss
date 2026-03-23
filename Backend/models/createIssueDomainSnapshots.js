import { IssueExpressionDomain } from "./IssueExpressionDomains.js";

/**
 * Crea snapshots de dominios de expresión para un issue y devuelve un mapa
 * entre el id del dominio original y el id del snapshot creado.
 *
 * @param {Object} params Datos de entrada.
 * @param {import("mongoose").Types.ObjectId|string} params.issueId Id del issue.
 * @param {Array<Object>} params.domainDocs Dominios origen.
 * @param {import("mongoose").ClientSession} [params.session] Sesión de mongoose.
 * @returns {Promise<Map<string, import("mongoose").Types.ObjectId>>}
 */
export const createIssueDomainSnapshots = async ({ issueId, domainDocs, session }) => {
  if (!Array.isArray(domainDocs) || domainDocs.length === 0) {
    return new Map();
  }

  const uniqueDomainsById = new Map();

  for (const domain of domainDocs) {
    if (!domain?._id) continue;
    uniqueDomainsById.set(String(domain._id), domain);
  }

  const uniqueDomainDocs = Array.from(uniqueDomainsById.values());

  const snapshotPayload = uniqueDomainDocs.map((domain) => ({
    issue: issueId,
    sourceDomain: domain._id,
    name: domain.name,
    type: domain.type,
    numericRange: domain.type === "numeric" ? domain.numericRange : undefined,
    linguisticLabels:
      domain.type === "linguistic" ? domain.linguisticLabels || [] : [],
  }));

  const createdSnapshots = await IssueExpressionDomain.insertMany(snapshotPayload, {
    session,
    ordered: true,
  });

  const snapshotMap = new Map();

  for (const snapshot of createdSnapshots) {
    snapshotMap.set(String(snapshot.sourceDomain), snapshot._id);
  }

  return snapshotMap;
};
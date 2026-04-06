import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";

/**
 * Crea snapshots de dominios de expresión para un issue y devuelve un mapa
 * entre el id del dominio original y el id del snapshot creado.
 *
 * Este helper congela en la colección `IssueExpressionDomain` la definición
 * de los dominios usados por un issue para evitar depender de cambios futuros
 * en los dominios reutilizables originales.
 *
 * @param {Object} params Datos de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.domainDocs Dominios origen a copiar.
 * @param {Object|null} [params.session] Sesión de mongoose.
 * @returns {Promise<Map<string, Object>>}
 */
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
    if (!domain?._id) {
      continue;
    }

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

  const createdSnapshots = await IssueExpressionDomain.insertMany(
    snapshotPayload,
    {
      session,
      ordered: true,
    }
  );

  const snapshotMap = new Map();

  for (const snapshot of createdSnapshots) {
    snapshotMap.set(String(snapshot.sourceDomain), snapshot._id);
  }

  return snapshotMap;
};
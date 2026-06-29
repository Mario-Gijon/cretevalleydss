/**
 * Normaliza un valor para busquedas de texto.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string}
 */
export const normalizeActiveIssueValue = (value) => {
  return value == null ? "" : String(value).toLowerCase();
};

/**
 * Comprueba si algun criterio del arbol contiene el texto buscado.
 *
 * @param {Array} nodes Arbol de criterios.
 * @param {string} query Texto buscado ya normalizado.
 * @returns {boolean}
 */
export const criteriaContainsQuery = (nodes, query) => {
  if (!query) return true;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;

  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    if (normalizeActiveIssueValue(node?.name).includes(query)) {
      return true;
    }

    if (Array.isArray(node?.children) && node.children.length > 0) {
      stack.push(...node.children);
    }
  }

  return false;
};

/**
 * Comprueba si los datos visibles del administrador contienen el texto buscado.
 *
 * @param {Object} issue Issue a evaluar.
 * @param {string} query Texto buscado ya normalizado.
 * @returns {boolean}
 */
export const ownerContainsQuery = (issue, query) => {
  if (!query) return true;

  const candidates = [
    issue?.owner,
    issue?.ownerName,
    issue?.ownerEmail,
    issue?.owner?.name,
    issue?.owner?.email,
    issue?.createdBy?.name,
    issue?.createdBy?.email,
  ];

  return candidates.some((candidate) =>
    normalizeActiveIssueValue(candidate).includes(query)
  );
};

/**
 * Comprueba si alguna alternativa contiene el texto buscado.
 *
 * @param {Object} issue Issue a evaluar.
 * @param {string} query Texto buscado ya normalizado.
 * @returns {boolean}
 */
export const alternativesContainsQuery = (issue, query) => {
  if (!query) return true;

  const alternatives = Array.isArray(issue?.alternatives) ? issue.alternatives : [];

  return alternatives.some((alternative) => {
    if (typeof alternative === "string") {
      return normalizeActiveIssueValue(alternative).includes(query);
    }

    return normalizeActiveIssueValue(
      alternative?.name || alternative?.title || alternative?.label
    ).includes(query);
  });
};

/**
 * Comprueba si un issue cumple el filtro de busqueda actual.
 *
 * @param {Object} issue Issue a evaluar.
 * @param {string} query Texto introducido por el usuario.
 * @param {string} searchBy Campo de busqueda seleccionado.
 * @returns {boolean}
 */
export const issueMatchesSearch = (issue, query, searchBy) => {
  const normalizedQuery = normalizeActiveIssueValue(query).trim();

  if (!normalizedQuery) return true;

  const byIssue = normalizeActiveIssueValue(issue?.name).includes(normalizedQuery);
  const byModel = normalizeActiveIssueValue(issue?.model?.name).includes(normalizedQuery);
  const byOwner = ownerContainsQuery(issue, normalizedQuery);
  const byAlternatives = alternativesContainsQuery(issue, normalizedQuery);
  const byCriteria = criteriaContainsQuery(issue?.criteria, normalizedQuery);

  if (searchBy === "issue") return byIssue;
  if (searchBy === "model") return byModel;
  if (searchBy === "owner") return byOwner;
  if (searchBy === "alternatives") return byAlternatives;
  if (searchBy === "criteria") return byCriteria;

  return byIssue || byModel || byOwner || byAlternatives || byCriteria;
};

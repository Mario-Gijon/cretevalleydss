/**
 * Normaliza un valor para busquedas de texto.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string}
 */
export const normalizeActiveIssueValue = (value) => {
  return value ? value.toLowerCase() : "";
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
  if (nodes.length === 0) return false;

  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.pop();
    if (normalizeActiveIssueValue(node.name).includes(query)) {
      return true;
    }

    if (node.children.length > 0) {
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
export const adminContainsQuery = (issue, query) => {
  if (!query) return true;

  return normalizeActiveIssueValue(issue.creator).includes(query);
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

  return issue.alternatives.some((alternative) =>
    normalizeActiveIssueValue(alternative).includes(query)
  );
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
  const normalizedQuery = normalizeActiveIssueValue(query.trim());

  if (!normalizedQuery) return true;

  const byIssue = normalizeActiveIssueValue(issue.name).includes(normalizedQuery);
  const byModel = normalizeActiveIssueValue(issue.model.name).includes(normalizedQuery);
  const byAdmin = adminContainsQuery(issue, normalizedQuery);
  const byAlternatives = alternativesContainsQuery(issue, normalizedQuery);
  const byCriteria = criteriaContainsQuery(issue.criteria, normalizedQuery);

  if (searchBy === "issue") return byIssue;
  if (searchBy === "model") return byModel;
  if (searchBy === "admin") return byAdmin;
  if (searchBy === "alternatives") return byAlternatives;
  if (searchBy === "criteria") return byCriteria;

  return byIssue || byModel || byAdmin || byAlternatives || byCriteria;
};

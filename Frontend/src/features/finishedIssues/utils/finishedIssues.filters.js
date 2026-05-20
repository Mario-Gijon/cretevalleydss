/**
 * Normaliza un valor para búsquedas de texto.
 *
 * Convierte null y undefined en cadena vacía y devuelve
 * el texto en minúsculas para facilitar comparaciones.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string}
 */
export const normalizeFinishedIssueValue = (value) => {
  return value == null ? "" : String(value).toLowerCase();
};

/**
 * Comprueba si algún criterio del árbol contiene el texto buscado.
 *
 * Recorre el árbol de criterios de forma iterativa para evitar
 * depender de recursión en búsquedas profundas.
 *
 * @param {Array} nodes Árbol de criterios.
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

    if (normalizeFinishedIssueValue(node?.name).includes(query)) {
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
 * Intenta encontrar coincidencias en varias posibles propiedades
 * porque el issue puede venir con distintas formas de datos.
 *
 * @param {Object} issue Issue a evaluar.
 * @param {string} query Texto buscado ya normalizado.
 * @returns {boolean}
 */
export const adminContainsQuery = (issue, query) => {
  if (!query) return true;

  const candidates = [
    issue?.creator,
    issue?.adminEmail,
    issue?.adminName,
    issue?.admin?.email,
    issue?.admin?.name,
    issue?.createdBy?.email,
    issue?.createdBy?.name,
    issue?.owner?.email,
    issue?.owner?.name,
  ];

  return candidates.some((candidate) =>
    normalizeFinishedIssueValue(candidate).includes(query)
  );
};

/**
 * Comprueba si alguna alternativa contiene el texto buscado.
 *
 * Soporta alternativas representadas como string o como objeto.
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
      return normalizeFinishedIssueValue(alternative).includes(query);
    }

    return normalizeFinishedIssueValue(
      alternative?.name || alternative?.title || alternative?.label
    ).includes(query);
  });
};

/**
 * Convierte una fecha en formato DD-MM-YYYY o DD/MM/YYYY a timestamp.
 *
 * Si la fecha no es válida devuelve 0 para evitar errores
 * en ordenaciones y comparaciones.
 *
 * @param {string} value Fecha en formato DD-MM-YYYY o DD/MM/YYYY.
 * @returns {number}
 */
export const parseIssueDateDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") return 0;

  const parts = value.includes("-") ? value.split("-") : value.split("/");
  const [dd, mm, yyyy] = parts.map((part) => Number(part));

  if (!dd || !mm || !yyyy) return 0;

  return new Date(yyyy, mm - 1, dd).getTime();
};

/**
 * Comprueba si un issue cumple el filtro de búsqueda actual.
 *
 * Permite buscar por campo concreto o hacer una búsqueda general.
 *
 * @param {Object} issue Issue a evaluar.
 * @param {string} query Texto introducido por el usuario.
 * @param {string} searchBy Campo de búsqueda seleccionado.
 * @returns {boolean}
 */
export const finishedIssueMatchesSearch = (issue, query, searchBy) => {
  const normalizedQuery = normalizeFinishedIssueValue(query).trim();

  if (!normalizedQuery) return true;

  const byIssue = normalizeFinishedIssueValue(issue?.name).includes(normalizedQuery);
  const byModel = normalizeFinishedIssueValue(issue?.model?.name).includes(normalizedQuery);
  const byAdmin = adminContainsQuery(issue, normalizedQuery);
  const byAlternatives = alternativesContainsQuery(issue, normalizedQuery);
  const byCriteria = criteriaContainsQuery(issue?.criteria, normalizedQuery);

  if (searchBy === "issue") return byIssue;
  if (searchBy === "model") return byModel;
  if (searchBy === "admin") return byAdmin;
  if (searchBy === "alternatives") return byAlternatives;
  if (searchBy === "criteria") return byCriteria;

  return byIssue || byModel || byAdmin || byAlternatives || byCriteria;
};

/**
 * Ordena la colección de issues finalizados según el criterio indicado.
 *
 * @param {Array} issues Lista de issues.
 * @param {string} sortBy Criterio de ordenación.
 * @returns {Array}
 */
export const sortFinishedIssues = (issues, sortBy) => {
  const list = [...issues];

  const compareByName = (a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""));

  const creationTimestamp = (issue) => {
    const fromCreatedAt = new Date(issue?.createdAt || 0).getTime();
    if (Number.isFinite(fromCreatedAt) && fromCreatedAt > 0) {
      return fromCreatedAt;
    }

    return parseIssueDateDDMMYYYY(issue?.creationDate);
  };

  const finalizationTimestamp = (issue) =>
    (() => {
      const fromFinishedAt = new Date(issue?.finishedAt || 0).getTime();
      if (Number.isFinite(fromFinishedAt) && fromFinishedAt > 0) {
        return fromFinishedAt;
      }

      return 0;
    })();

  if (sortBy === "creationDate") {
    return list.sort((a, b) => {
      const diff = creationTimestamp(b) - creationTimestamp(a);
      if (diff !== 0) return diff;
      return compareByName(a, b);
    });
  }

  if (sortBy === "finalizationDate") {
    const withFinishedAt = [];
    const withoutFinishedAt = [];

    list.forEach((issue) => {
      const timestamp = finalizationTimestamp(issue);
      if (timestamp > 0) {
        const updatedAt = new Date(issue?.updatedAt || 0).getTime();
        withFinishedAt.push({
          issue,
          timestamp,
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
        });
        return;
      }
      withoutFinishedAt.push(issue);
    });

    withFinishedAt.sort((a, b) => {
      const diff = b.timestamp - a.timestamp;
      if (diff !== 0) return diff;
      const updatedDiff = b.updatedAt - a.updatedAt;
      if (updatedDiff !== 0) return updatedDiff;
      return compareByName(a.issue, b.issue);
    });

    withoutFinishedAt.sort(compareByName);

    return [
      ...withFinishedAt.map((entry) => entry.issue),
      ...withoutFinishedAt,
    ];
  }

  return list.sort(compareByName);
};

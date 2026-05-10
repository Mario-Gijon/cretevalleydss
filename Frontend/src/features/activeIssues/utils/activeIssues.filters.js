/**
 * Normaliza un valor para búsquedas de texto.
 *
 * Convierte null y undefined en cadena vacía y devuelve
 * el texto en minúsculas para facilitar comparaciones.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string}
 */
export const normalizeActiveIssueValue = (value) => {
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
    normalizeActiveIssueValue(candidate).includes(query)
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
      return normalizeActiveIssueValue(alternative).includes(query);
    }

    return normalizeActiveIssueValue(
      alternative?.name || alternative?.title || alternative?.label
    ).includes(query);
  });
};

/**
 * Convierte una fecha en formato DD-MM-YYYY a timestamp.
 *
 * Si la fecha no es válida devuelve 0 para evitar errores
 * en ordenaciones y comparaciones.
 *
 * @param {string} value Fecha en formato DD-MM-YYYY.
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
export const issueMatchesSearch = (issue, query, searchBy) => {
  const normalizedQuery = normalizeActiveIssueValue(query).trim();

  if (!normalizedQuery) return true;

  const issueName = normalizeActiveIssueValue(issue?.name);
  const model = normalizeActiveIssueValue(issue?.model);

  if (searchBy === "issue") {
    return issueName.includes(normalizedQuery);
  }

  if (searchBy === "alternatives") {
    return alternativesContainsQuery(issue, normalizedQuery);
  }

  if (searchBy === "criteria") {
    return criteriaContainsQuery(issue?.criteria, normalizedQuery);
  }

  if (searchBy === "model") {
    return model.includes(normalizedQuery);
  }

  if (searchBy === "admin") {
    return adminContainsQuery(issue, normalizedQuery);
  }

  return (
    issueName.includes(normalizedQuery) ||
    alternativesContainsQuery(issue, normalizedQuery) ||
    criteriaContainsQuery(issue?.criteria, normalizedQuery) ||
    model.includes(normalizedQuery) ||
    adminContainsQuery(issue, normalizedQuery)
  );
};

/**
 * Ordena la colección de issues según el criterio indicado.
 *
 * @param {Array} issues Lista de issues.
 * @param {string} sortBy Criterio de ordenación.
 * @returns {Array}
 */
export const sortActiveIssues = (issues, sortBy) => {
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
    parseIssueDateDDMMYYYY(issue?.closureDate);

  if (sortBy === "creationDate") {
    return list.sort((a, b) => {
      const diff = creationTimestamp(b) - creationTimestamp(a);
      if (diff !== 0) return diff;
      return compareByName(a, b);
    });
  }

  if (sortBy === "deadlineDate") {
    const withDeadline = [];
    const withoutDeadline = [];

    list.forEach((issue) => {
      const timestamp = finalizationTimestamp(issue);
      if (timestamp > 0) {
        withDeadline.push({ issue, timestamp });
        return;
      }
      withoutDeadline.push(issue);
    });

    withDeadline.sort((a, b) => {
      const diff = a.timestamp - b.timestamp;
      if (diff !== 0) return diff;
      return compareByName(a.issue, b.issue);
    });

    withoutDeadline.sort(compareByName);

    return [
      ...withDeadline.map((entry) => entry.issue),
      ...withoutDeadline,
    ];
  }

  return list.sort(compareByName);
};

/**
 * Filtra y ordena la lista de issues activos.
 *
 * Esta función centraliza la lógica de listado para que la page
 * no tenga que ocuparse de detalles de búsqueda y ordenación.
 *
 * @param {Array} issues Lista de issues.
 * @param {string} query Texto de búsqueda.
 * @param {string} searchBy Campo de búsqueda.
 * @param {string} sortBy Criterio de ordenación.
 * @returns {Array}
 */
export const filterAndSortActiveIssues = (issues, query, searchBy, sortBy) => {

  const filtered = issues.filter((issue) => issueMatchesSearch(issue, query, searchBy));

  return sortActiveIssues(filtered, sortBy);
};

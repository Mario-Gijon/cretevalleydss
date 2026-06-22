/**
 * Devuelve el conjunto de permisos derivados del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object}
 */
export const getIssueDrawerPermissions = (issue) => {
  const permissions = issue?.ui?.permissions;

  return {
    canEvaluateAlternatives: permissions?.evaluateAlternatives === true,
    canEvaluateWeights: permissions?.evaluateWeights === true,
    canComputeWeights: permissions?.computeWeights === true,
    canResolveIssue: permissions?.resolveIssue === true,
  };
};

/**
 * Formatea un peso para mostrarlo en la UI.
 *
 * @param {*} value Valor del peso.
 * @returns {string|null}
 */
export const formatIssueDrawerWeight = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(2)}%`;
    }

    return value.toFixed(4).replace(/\.?0+$/, "");
  }

  if (Array.isArray(value) && value.every((item) => Number.isFinite(item))) {
    return `[${value.map((item) => Number(item).toFixed(2)).join(", ")}]`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    if (typeof value.label === "string" && value.label.trim()) {
      return value.label;
    }

    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      const nested = formatIssueDrawerWeight(value.value);
      if (nested !== null) {
        return nested;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

/**
 * Devuelve la fecha limite legible del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {string}
 */
export const getIssueDrawerDeadlineLabel = (issue) => {
  if (issue?.ui?.deadline?.hasDeadline) {
    return issue.closureDate;
  }

  return "—";
};

/**
 * Devuelve la lista segura de alternativas del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Array}
 */
export const getIssueDrawerAlternatives = (issue) => {
  return issue ? issue.alternatives : [];
};

/**
 * Devuelve los pesos finales visibles del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object}
 */
export const getIssueDrawerFinalWeights = (issue) => {
  return issue ? issue.finalWeights : {};
};

/**
 * Resume los contadores de participacion visibles en el drawer.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object}
 */
export const getIssueDrawerParticipation = (issue) => {
  if (!issue) {
    return {
      totalExperts: 0,
      pendingExperts: 0,
      participatedExperts: 0,
      notEvaluatedExperts: 0,
      declinedExperts: 0,
    };
  }

  return {
    totalExperts: issue.totalExperts,
    pendingExperts: issue.pendingExperts.length,
    participatedExperts: issue.participatedExperts.length,
    notEvaluatedExperts: issue.acceptedButNotEvaluatedExperts.length,
    declinedExperts: issue.notAcceptedExperts.length,
  };
};

/**
 * Devuelve los nombres de los criterios hoja del issue.
 *
 * @param {Array} nodes Arbol de criterios.
 * @returns {Array}
 */
export const getLeafCriterionNames = (nodes = []) => {
  const names = [];
  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.pop();
    const children = node.children;

    if (children.length === 0) {
      names.push(node.name);
      continue;
    }

    stack.push(...children);
  }

  return names;
};

/**
 * Cuenta los criterios hoja visibles del issue.
 *
 * @param {Array} nodes Arbol de criterios.
 * @returns {number}
 */
export const countLeafCriteria = (nodes = []) => getLeafCriterionNames(nodes).length;

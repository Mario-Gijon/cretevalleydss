const pickBoolean = (...values) => {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }

  return false;
};

const getIssueUiPermissions = (issue) => {
  return issue?.ui?.permissions || issue?.ui?.actions || issue?.ui || null;
};

const canEvaluateAlternatives = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.evaluateAlternatives,
    permissions?.canEvaluateAlternatives,
    issue?.statusFlags?.canEvaluateAlternatives
  );
};

const canEvaluateWeights = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.evaluateWeights,
    permissions?.canEvaluateWeights,
    issue?.statusFlags?.canEvaluateWeights
  );
};

const canComputeWeights = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.computeWeights,
    permissions?.canComputeWeights,
    issue?.statusFlags?.canComputeWeights
  );
};

const canResolveIssue = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.resolveIssue,
    permissions?.canResolveIssue,
    issue?.statusFlags?.canResolveIssue
  );
};

/**
 * Devuelve el conjunto de permisos derivados del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object}
 */
export const getIssueDrawerPermissions = (issue) => {
  return {
    canEvaluateAlternatives: canEvaluateAlternatives(issue),
    canEvaluateWeights: canEvaluateWeights(issue),
    canComputeWeights: canComputeWeights(issue),
    canResolveIssue: canResolveIssue(issue),
  };
};

/**
 * Formatea un peso para mostrarlo en la UI.
 *
 * @param {*} value Valor del peso.
 * @returns {string|null}
 */
export const formatIssueDrawerWeight = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  if (numberValue >= 0 && numberValue <= 1) {
    return `${(numberValue * 100).toFixed(2)}%`;
  }

  return numberValue.toFixed(4).replace(/\.?0+$/, "");
};

/**
 * Devuelve la fecha limite legible del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {string}
 */
export const getIssueDrawerDeadlineLabel = (issue) => {
  if (issue?.ui?.deadline?.hasDeadline) {
    return issue?.ui?.deadline?.deadline;
  }

  return issue?.closureDate || "—";
};

/**
 * Devuelve la lista segura de alternativas del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Array}
 */
export const getIssueDrawerAlternatives = (issue) => {
  return Array.isArray(issue?.alternatives) ? issue.alternatives : [];
};

/**
 * Devuelve los pesos finales visibles del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object}
 */
export const getIssueDrawerFinalWeights = (issue) => {
  return issue?.finalWeights || issue?.ui?.finalWeights || {};
};

/**
 * Resume los contadores de participacion visibles en el drawer.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object}
 */
export const getIssueDrawerParticipation = (issue) => {
  return {
    totalExperts: issue?.totalExperts ?? 0,
    pendingExperts: Array.isArray(issue?.pendingExperts)
      ? issue.pendingExperts.length
      : 0,
    participatedExperts: Array.isArray(issue?.participatedExperts)
      ? issue.participatedExperts.length
      : 0,
    notEvaluatedExperts: Array.isArray(issue?.acceptedButNotEvaluatedExperts)
      ? issue.acceptedButNotEvaluatedExperts.length
      : 0,
    declinedExperts: Array.isArray(issue?.notAcceptedExperts)
      ? issue.notAcceptedExperts.length
      : 0,
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
  const stack = Array.isArray(nodes) ? [...nodes] : [];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    const children = Array.isArray(node.children) ? node.children : [];

    if (children.length === 0) {
      if (typeof node?.name === "string" && node.name.trim()) {
        names.push(node.name);
      }
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

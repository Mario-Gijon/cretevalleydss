/**
 * Devuelve el primer booleano válido de la lista.
 *
 * @param {...*} values Valores candidatos.
 * @returns {boolean}
 */
const pickBoolean = (...values) => {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }

  return false;
};

/**
 * Resuelve el bloque de permisos expuesto por la UI del issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Object|null}
 */
const getIssueUiPermissions = (issue) => {
  return issue?.ui?.permissions || issue?.ui?.actions || issue?.ui || null;
};

/**
 * Indica si el usuario puede evaluar alternativas.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {boolean}
 */
const canEvaluateAlternatives = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.evaluateAlternatives,
    permissions?.canEvaluateAlternatives,
    issue?.statusFlags?.canEvaluateAlternatives
  );
};

/**
 * Indica si el usuario puede evaluar pesos.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {boolean}
 */
const canEvaluateWeights = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.evaluateWeights,
    permissions?.canEvaluateWeights,
    issue?.statusFlags?.canEvaluateWeights
  );
};

/**
 * Indica si el usuario puede computar pesos.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {boolean}
 */
const canComputeWeights = (issue) => {
  const permissions = getIssueUiPermissions(issue);

  return pickBoolean(
    permissions?.computeWeights,
    permissions?.canComputeWeights,
    issue?.statusFlags?.canComputeWeights
  );
};

/**
 * Indica si el usuario puede resolver el issue.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {boolean}
 */
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
 * Formatea un valor de modelParameters para mostrarlo.
 *
 * @param {*} value Valor del parámetro.
 * @returns {string}
 */
export const formatIssueDrawerParamValue = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length <= 8 ? value.join(", ") : `[${value.length} items]`;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * Devuelve la fecha límite legible del issue.
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
 * Resume los contadores de participación visibles en el drawer.
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
 * Construye la lista ordenada de model parameters.
 *
 * @param {Object|null} issue Issue seleccionado.
 * @returns {Array}
 */
export const buildIssueDrawerModelParamsList = (issue) => {
  const modelParams =
    issue?.modelParameters || issue?.ui?.modelParameters || {};

  return Object.entries(modelParams)
    .sort(([leftKey], [rightKey]) =>
      String(leftKey).localeCompare(String(rightKey))
    )
    .map(([key, value]) => ({
      k: key,
      v: formatIssueDrawerParamValue(value),
    }));
};

export const getLeafCriteria = (nodes = []) => {
  const leaves = [];
  const stack = Array.isArray(nodes) ? [...nodes] : [];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    const children = Array.isArray(node.children) ? node.children : [];

    if (children.length === 0) {
      leaves.push(node);
      continue;
    }

    stack.push(...children);
  }

  return leaves;
};

export const countLeafCriteria = (nodes = []) => getLeafCriteria(nodes).length;
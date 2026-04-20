/**
 * Valida que todas las asignaciones de dominio tengan un dominio seleccionado.
 *
 * @param {object} domainAssignments Asignaciones de dominios.
 * @returns {boolean}
 */
export const validateDomainAssigments = (domainAssignments) => {
  if (!domainAssignments?.experts) return false;

  for (const [, expertData] of Object.entries(domainAssignments.experts)) {
    for (const [, altData] of Object.entries(expertData.alternatives || {})) {
      for (const [, domainId] of Object.entries(altData.criteria || {})) {
        if (!domainId || domainId === "undefined") {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Agrupa asignaciones de dominios por experto y alternativa.
 *
 * @param {object} domainAssignments Asignaciones de dominios.
 * @returns {object}
 */
export const groupDomainData = (domainAssignments) => {
  if (!domainAssignments?.experts) return {};

  const data = {};

  Object.entries(domainAssignments.experts).forEach(([expert, expertData]) => {
    data[expert] = {};

    Object.entries(expertData.alternatives).forEach(([alt, altData]) => {
      data[expert][alt] = Object.entries(altData.criteria).map(
        ([criterion, dataType]) => ({
          criterion,
          dataType,
        })
      );
    });
  });

  return data;
};

/**
 * Devuelve el valor común de una colección o "mixed" si hay varios.
 *
 * @param {Array<*>} values Valores a comparar.
 * @returns {*}
 */
export const getMixedOrValue = (values) => {
  const unique = [...new Set(values.filter((v) => v !== undefined && v !== null))];

  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return "mixed";

  return null;
};

/**
 * Construye la estructura inicial de asignaciones de dominios.
 *
 * @param {string[]} experts Expertos seleccionados.
 * @param {string[]} alternatives Alternativas del issue.
 * @param {object[]} criteria Criterios del issue.
 * @param {object} currentAssignments Asignaciones actuales.
 * @param {object} selectedModel Modelo seleccionado.
 * @param {object[]} globalDomains Dominios globales.
 * @param {object[]} expressionDomains Dominios del usuario.
 * @returns {object}
 */
export const buildInitialAssignments = (
  experts,
  alternatives,
  criteria,
  currentAssignments = { experts: {} },
  selectedModel,
  globalDomains,
  expressionDomains
) => {
  const supportsNumeric = !!selectedModel?.supportedDomains?.numeric?.enabled;
  const supportsLinguistic = !!selectedModel?.supportedDomains?.linguistic?.enabled;

  const numericDomains = supportsNumeric
    ? globalDomains.filter((d) => d.type === "numeric")
    : [];

  const linguisticDomains = supportsLinguistic
    ? [...globalDomains, ...expressionDomains].filter(
        (d) => d.type === "linguistic"
      )
    : [];

  const validDomainIds = [
    ...numericDomains.map((d) => d._id),
    ...linguisticDomains.map((d) => d._id),
  ];

  const defaultDomainId =
    numericDomains.find(
      (d) => d.numericRange?.min === 0 && d.numericRange?.max === 1
    )?._id ||
    linguisticDomains[0]?._id ||
    "undefined";

  const updated = structuredClone(currentAssignments || { experts: {} });

  if (!updated.experts) updated.experts = {};

  Object.keys(updated.experts).forEach((exp) => {
    if (!experts.includes(exp)) delete updated.experts[exp];
  });

  experts.forEach((exp) => {
    if (!updated.experts[exp]) updated.experts[exp] = { alternatives: {} };
  });

  experts.forEach((exp) => {
    const expertData = updated.experts[exp];

    Object.keys(expertData.alternatives || {}).forEach((alt) => {
      if (!alternatives.includes(alt)) delete expertData.alternatives[alt];
    });

    alternatives.forEach((alt) => {
      if (!expertData.alternatives[alt]) {
        expertData.alternatives[alt] = { criteria: {} };
      }

      const criteriaData = expertData.alternatives[alt].criteria;

      Object.keys(criteriaData || {}).forEach((critName) => {
        if (!criteria.some((c) => c.name === critName)) {
          delete criteriaData[critName];
        }
      });

      criteria.forEach((crit) => {
        const critName = crit.name;
        const currentDomain = criteriaData[critName];

        if (!currentDomain || !validDomainIds.includes(currentDomain)) {
          criteriaData[critName] = defaultDomainId;
        }
      });
    });
  });

  return updated;
};

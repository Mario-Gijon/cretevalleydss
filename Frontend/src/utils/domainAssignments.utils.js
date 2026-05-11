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

const toDomainId = (value) => (value === null || value === undefined ? null : String(value));

const getModelDomainSupport = (selectedModel) => ({
  numericContinuous: selectedModel?.supportedDomains?.numeric?.continuous === true,
  numericDiscrete: selectedModel?.supportedDomains?.numeric?.discrete === true,
  linguistic: selectedModel?.supportedDomains?.linguistic === true,
});

const isNumericContinuousDomain = (domain) =>
  domain?.type === "numeric" &&
  (domain?.numericRange?.step === null || domain?.numericRange?.step === undefined);

const isNumericDiscreteDomain = (domain) =>
  domain?.type === "numeric" &&
  Number.isFinite(domain?.numericRange?.step) &&
  domain.numericRange.step > 0;

export const getSupportedDomainPools = (
  selectedModel,
  globalDomains = [],
  expressionDomains = []
) => {
  const support = getModelDomainSupport(selectedModel);
  const numericCandidates = [...globalDomains, ...expressionDomains].filter(
    (domain) => domain?.type === "numeric"
  );

  const numericDomains = numericCandidates.filter(
    (domain) =>
      (support.numericContinuous && isNumericContinuousDomain(domain)) ||
      (support.numericDiscrete && isNumericDiscreteDomain(domain))
  );

  const linguisticDomains = support.linguistic
    ? expressionDomains.filter((domain) => domain?.type === "linguistic")
    : [];

  return {
    support,
    numericDomains,
    linguisticDomains,
  };
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
  const { support, numericDomains, linguisticDomains } = getSupportedDomainPools(
    selectedModel,
    globalDomains,
    expressionDomains
  );

  const validDomainIds = [
    ...numericDomains.map((domain) => toDomainId(domain._id)).filter(Boolean),
    ...linguisticDomains.map((domain) => toDomainId(domain._id)).filter(Boolean),
  ];

  const continuousDefaultDomainId =
    numericDomains.find(
      (domain) =>
        isNumericContinuousDomain(domain) &&
        domain?.numericRange?.min === 0 &&
        domain?.numericRange?.max === 1
    )?._id || null;

  const discreteDefaultDomainId =
    numericDomains.find(
      (domain) =>
        isNumericDiscreteDomain(domain) &&
        domain?.numericRange?.min === 0 &&
        domain?.numericRange?.max === 9 &&
        domain?.numericRange?.step === 1
    )?._id || null;

  const defaultDomainId =
    (support.numericContinuous
      ? toDomainId(continuousDefaultDomainId) ||
        toDomainId(numericDomains.find(isNumericContinuousDomain)?._id)
      : null) ||
    (support.numericDiscrete
      ? toDomainId(discreteDefaultDomainId) ||
        toDomainId(numericDomains.find(isNumericDiscreteDomain)?._id)
      : null) ||
    toDomainId(linguisticDomains[0]?._id) ||
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
        const currentDomain = toDomainId(criteriaData[critName]);

        if (!currentDomain || !validDomainIds.includes(currentDomain)) {
          criteriaData[critName] = defaultDomainId;
        }
      });
    });
  });

  return updated;
};

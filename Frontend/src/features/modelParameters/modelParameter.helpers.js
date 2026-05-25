const readModelParameters = (selectedModel) =>
  Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

export const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isCriterionMapParameter = (parameter) =>
  parameter?.type === "criterionMap" ||
  parameter?.parameterStructureKey === "numberCriterion" ||
  parameter?.parameterStructureKey === "selectCriterion";

export const resolveCriterionKey = (criterion, index) =>
  String(
    criterion?.id ||
      criterion?._id ||
      criterion?.key ||
      criterion?.name ||
      `Criterion ${index + 1}`
  ).trim();

export const extractLeafCriteria = (criteriaOrLeafCriteria) => {
  const input = Array.isArray(criteriaOrLeafCriteria) ? criteriaOrLeafCriteria : [];
  const leafCriteria = [];

  const traverse = (nodes) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length === 0) {
        leafCriteria.push(node);
      } else {
        traverse(children);
      }
    }
  };

  traverse(input);
  return leafCriteria;
};

export const buildCriterionMapDefault = (parameter, leafCriteria) => {
  const rows = extractLeafCriteria(leafCriteria);
  const defaultValue = parameter?.default ?? "";

  return rows.reduce((accumulator, criterion, index) => {
    const criterionKey = resolveCriterionKey(criterion, index);
    if (!criterionKey) return accumulator;
    accumulator[criterionKey] = defaultValue;
    return accumulator;
  }, {});
};

export const isCriteriaWeightLikeParameter = (parameter) =>
  ["criteriaWeights", "fuzzyCriteriaWeights"].includes(parameter?.parameterStructureKey) ||
  parameter?.semanticRole === "criteriaWeights";

export const getCreateIssueModelParameters = (selectedModel) =>
  readModelParameters(selectedModel).filter(
    (parameter) => Boolean(parameter?.key) && !isCriteriaWeightLikeParameter(parameter)
  );

export const buildCreateIssueParameterDefaults = ({ selectedModel, leafCriteria }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const leafRows = extractLeafCriteria(leafCriteria);

  return parameters.reduce((accumulator, parameter) => {
    const key = parameter?.key;
    if (!key) return accumulator;

    if (isCriterionMapParameter(parameter)) {
      accumulator[key] = leafRows.length
        ? buildCriterionMapDefault(parameter, leafRows)
        : {};
      return accumulator;
    }

    accumulator[key] = parameter?.default ?? "";
    return accumulator;
  }, {});
};

export const updateCreateIssueParameterValues = ({
  previous,
  selectedModel,
  leafCriteria,
}) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const next = { ...(previous || {}) };
  const leafRows = extractLeafCriteria(leafCriteria);

  parameters.forEach((parameter) => {
    const key = parameter?.key;
    if (!key) return;

    if (!isCriterionMapParameter(parameter)) {
      if (next[key] === undefined) {
        next[key] = parameter?.default ?? "";
      }
      return;
    }

    const defaultValue = parameter?.default ?? "";
    if (leafRows.length === 0) {
      next[key] = {};
      return;
    }

    const previousValue = next[key];
    const previousMap = isPlainObject(previousValue) ? previousValue : null;
    const scalarFallback =
      !isPlainObject(previousValue) &&
      previousValue !== undefined &&
      previousValue !== null
        ? previousValue
        : defaultValue;

    next[key] = leafRows.reduce((accumulator, criterion, index) => {
      const criterionKey = resolveCriterionKey(criterion, index);
      if (!criterionKey) return accumulator;

      if (previousMap && Object.prototype.hasOwnProperty.call(previousMap, criterionKey)) {
        accumulator[criterionKey] = previousMap[criterionKey];
        return accumulator;
      }

      accumulator[criterionKey] = scalarFallback;
      return accumulator;
    }, {});
  });

  return next;
};

export const pruneCreateIssueParameterValues = ({ selectedModel, values }) => {
  const parameters = getCreateIssueModelParameters(selectedModel);
  const allowedKeys = new Set(parameters.map((parameter) => parameter?.key).filter(Boolean));
  const source = values && typeof values === "object" && !Array.isArray(values) ? values : {};

  return Object.entries(source).reduce((accumulator, [key, value]) => {
    if (allowedKeys.has(key)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
};

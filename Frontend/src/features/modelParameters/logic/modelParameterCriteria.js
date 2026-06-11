import { isPlainObject } from "./isPlainObject";

const normalizeCriterionText = (value) =>
  typeof value === "string" ? value.trim() : "";

export const isCriterionMapParameter = (parameter) =>
  parameter.type === "criterionMap" ||
  parameter.parameterStructureKey === "numberCriterion" ||
  parameter.parameterStructureKey === "selectCriterion";

export const isCriteriaWeightLikeParameter = (parameter) =>
  parameter.parameterStructureKey === "criteriaWeights" ||
  parameter.parameterStructureKey === "fuzzyCriteriaWeights" ||
  parameter.semanticRole === "criteriaWeights";

export const resolveCriterionKey = (criterion, index) =>
  normalizeCriterionText(criterion.id) ||
  normalizeCriterionText(criterion._id) ||
  normalizeCriterionText(criterion.key) ||
  normalizeCriterionText(criterion.name) ||
  `Criterion ${index + 1}`;

export const resolveCriterionName = (criterion, index) =>
  normalizeCriterionText(criterion.name) || `Criterion ${index + 1}`;

export const extractLeafCriteria = (criteriaOrLeafCriteria) => {
  if (!Array.isArray(criteriaOrLeafCriteria)) {
    return [];
  }

  const leafCriteria = [];

  const traverse = (nodes) => {
    for (const node of nodes) {
      const children = Array.isArray(node.children) ? node.children : [];

      if (children.length === 0) {
        leafCriteria.push(node);
        continue;
      }

      traverse(children);
    }
  };

  traverse(criteriaOrLeafCriteria);
  return leafCriteria;
};

export const buildCriterionParameterRows = ({ leafCriteria, leafNames, context }) => {
  const resolvedLeafCriteria = leafCriteria ?? context?.leafCriteria;

  if (Array.isArray(resolvedLeafCriteria) && resolvedLeafCriteria.length > 0) {
    const leafRows = extractLeafCriteria(resolvedLeafCriteria);

    return leafRows.map((criterion, index) => ({
      key: resolveCriterionKey(criterion, index),
      name: resolveCriterionName(criterion, index),
    }));
  }

  if (!Array.isArray(leafNames)) {
    return [];
  }

  return leafNames.map((leafName, index) => {
    const name = normalizeCriterionText(leafName) || `Criterion ${index + 1}`;

    return {
      key: name,
      name,
    };
  });
};

export const resolveCriterionRowValue = ({ value, defaultValue, rowKey }) => {
  if (isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, rowKey)) {
    return value[rowKey];
  }

  if (!isPlainObject(value) && value !== undefined && value !== null && value !== "") {
    return value;
  }

  return defaultValue;
};

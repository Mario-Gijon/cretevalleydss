import { createBadRequestError, createInternalError } from "../../../utils/common/errors.js";
import { compareNameId } from "../shared/ordering.js";

const collectLeafCriteriaFromInput = (nodes, leafCriteria = []) => {
  for (const node of nodes) {
    if (!Array.isArray(node.children)) {
      throw createInternalError("Normalized criterion node children must be an array", {
        field: "criteria",
      });
    }

    if (node.children.length === 0) {
      leafCriteria.push({
        name: node.name,
        inputOrder: leafCriteria.length,
      });
      continue;
    }

    collectLeafCriteriaFromInput(node.children, leafCriteria);
  }

  return leafCriteria;
};

export const getOrderedLeafCriterionNamesFromInputOrThrow = (criteriaNodes) => {
  const leafCriteria = collectLeafCriteriaFromInput(criteriaNodes);

  if (leafCriteria.length === 0) {
    throw createInternalError("Issue creation criteria input has no leaf criteria", {
      field: "criteria",
    });
  }

  const orderedLeafCriteria = leafCriteria
    .slice()
    .sort((left, right) =>
      compareNameId(left.name, left.inputOrder, right.name, right.inputOrder)
    );

  for (let index = 1; index < orderedLeafCriteria.length; index += 1) {
    const previousCriterion = orderedLeafCriteria[index - 1];
    const currentCriterion = orderedLeafCriteria[index];

    if (compareNameId(previousCriterion.name, 0, currentCriterion.name, 0) === 0) {
      throw createBadRequestError("Leaf criterion names must be unique", {
        field: "criteria",
      });
    }
  }

  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);

  return {
    criterionNames,
    isSingleLeafCriterion: criterionNames.length === 1,
    orderedLeafCriteria: orderedLeafCriteria.map((criterion) => ({
      name: criterion.name,
    })),
  };
};

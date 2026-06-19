import { createBadRequestError, createInternalError } from "../../../utils/common/errors.js";
import { compareNameId } from "../shared/ordering.js";

const collectLeafCriteriaFromInput = (nodes, leafCriteria = []) => {
  for (const node of nodes) {
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

  for (let index = 0; index < leafCriteria.length; index += 1) {
    const currentCriterion = leafCriteria[index];

    for (let compareIndex = 0; compareIndex < index; compareIndex += 1) {
      const previousCriterion = leafCriteria[compareIndex];

      if (compareNameId(previousCriterion.name, 0, currentCriterion.name, 0) !== 0) {
        continue;
      }

      throw createBadRequestError("Leaf criterion names must be unique", {
        field: "criteria",
      });
    }
  }

  const criterionNames = leafCriteria.map((criterion) => criterion.name);

  return {
    criterionNames,
    isSingleLeafCriterion: criterionNames.length === 1,
    orderedLeafCriteria: leafCriteria.map((criterion) => ({
      name: criterion.name,
    })),
  };
};

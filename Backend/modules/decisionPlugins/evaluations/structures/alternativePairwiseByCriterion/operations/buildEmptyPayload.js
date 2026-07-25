const buildEmptyMatrix = ({ alternatives }) => {
  const emptyMatrix = {};

  for (const rowAlternative of alternatives) {
    emptyMatrix[rowAlternative.id] = {};

    for (const columnAlternative of alternatives) {
      if (columnAlternative.id !== rowAlternative.id) {
        emptyMatrix[rowAlternative.id][columnAlternative.id] = "";
      }
    }
  }

  return emptyMatrix;
};

export const buildEmptyPayload = ({ criterionIds, alternatives }) => {
  const emptyPayload = {};

  for (const criterionId of criterionIds) {
    emptyPayload[criterionId] = buildEmptyMatrix({ alternatives });
  }

  return emptyPayload;
};

export const buildEmptyPayload = ({ criteria }) => {
  const weightsByCriterion = criteria.reduce((accumulator, criterion) => {
    accumulator[criterion.id] = "";
    return accumulator;
  }, {});

  const emptyPayload = {
    weightsByCriterion,
  };

  return emptyPayload;
};

import { compareNameId } from "../issue.ordering.js";

export const applyIssueCreationOrdering = ({
  issue,
  createdAlternatives,
  leafCriteria,
}) => {
  const orderedAlternatives = createdAlternatives
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id));

  issue.alternativeOrder = orderedAlternatives
    .map((alternative) => alternative._id);

  const orderedLeafCriteria = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id));

  issue.leafCriteriaOrder = orderedLeafCriteria
    .map((criterion) => criterion._id);

  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);

  return {
    criterionNames,
    isSingleLeafCriterion: criterionNames.length === 1,
  };
};

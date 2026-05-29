import { compareNameId } from "../issue.ordering.js";

export const applyIssueCreationOrdering = ({
  issue,
  createdAlternatives,
  leafCriteria,
}) => {
  issue.alternativeOrder = createdAlternatives
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((alternative) => alternative._id);

  issue.leafCriteriaOrder = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((criterion) => criterion._id);

  const orderedLeafCriteria = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id));
  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);

  return {
    orderedLeafCriteria,
    criterionNames,
    isSingleLeafCriterion: criterionNames.length === 1,
  };
};

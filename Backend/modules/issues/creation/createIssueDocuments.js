import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";

export const createIssueAlternatives = async ({
  issueId,
  normalizedAlternatives,
  session,
}) => {
  return Alternative.insertMany(
    normalizedAlternatives.map((alternative, index) => ({
      issue: issueId,
      name: alternative.name,
      description: alternative.description,
      position: index,
    })),
    { session, ordered: true }
  );
};

export const createCriteriaRecursively = async ({
  issueId,
  nodes,
  leafCriteria,
  criteriaToPersist = [],
  criterionIdMappings = [],
  parentCriterionId = null,
}) => {
  for (const [index, node] of nodes.entries()) {
    const children = node.children;
    const isLeaf = children.length === 0;

    const criterion = new Criterion({
      issue: issueId,
      parentCriterion: parentCriterionId,
      name: node.name,
      description: node.description,
      type: node.type,
      isLeaf,
      position: index,
    });

    criteriaToPersist.push(criterion);
    criterionIdMappings.push({
      sourceCriterionId: node.id,
      persistedCriterionId: String(criterion._id),
    });

    if (isLeaf) {
      leafCriteria.push(criterion);
      continue;
    }

    await createCriteriaRecursively({
      issueId,
      nodes: children,
      leafCriteria,
      criteriaToPersist,
      criterionIdMappings,
      parentCriterionId: criterion._id,
    });
  }

  return criterionIdMappings;
};

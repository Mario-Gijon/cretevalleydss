import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";

export const createIssueAlternatives = async ({
  issueId,
  uniqueAlternativeNames,
  session,
}) => {
  return Alternative.insertMany(
    uniqueAlternativeNames.map((name, index) => ({
      issue: issueId,
      name,
      position: index,
    })),
    { session, ordered: true }
  );
};

export const createCriteriaRecursively = async ({
  issueId,
  nodes,
  leafCriteria,
  session,
  parentCriterionId = null,
}) => {
  for (const [index, node] of nodes.entries()) {
    const children = node.children;
    const isLeaf = children.length === 0;

    const criterion = new Criterion({
      issue: issueId,
      parentCriterion: parentCriterionId,
      name: node.name,
      type: node.type,
      isLeaf,
      position: index,
    });

    await criterion.save({ session });

    if (isLeaf) {
      leafCriteria.push(criterion);
      continue;
    }

    await createCriteriaRecursively({
      issueId,
      nodes: children,
      leafCriteria,
      session,
      parentCriterionId: criterion._id,
    });
  }
};

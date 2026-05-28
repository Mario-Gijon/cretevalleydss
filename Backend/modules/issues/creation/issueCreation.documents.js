import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { normalizeString } from "../../../utils/common/strings.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

export const createIssueAlternatives = async ({
  issueId,
  uniqueAlternativeNames,
  session,
}) => {
  return Alternative.insertMany(
    uniqueAlternativeNames.map((name) => ({
      issue: issueId,
      name,
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
  if (!Array.isArray(nodes)) {
    throw createBadRequestError("criteria must be an array", {
      field: "criteria",
    });
  }

  for (const node of nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      throw createBadRequestError("Criterion node must be an object", {
        field: "criteria",
      });
    }

    if (!Array.isArray(node.children)) {
      throw createBadRequestError("Criterion children must be an array", {
        field: "criteria",
      });
    }

    const children = node.children;
    const isLeaf = children.length === 0;
    const criterionName = normalizeString(node.name);
    const criterionType = normalizeString(node.type);

    if (!criterionName) {
      throw createBadRequestError("Criterion name is required", {
        field: "criteria",
      });
    }

    const criterion = new Criterion({
      issue: issueId,
      parentCriterion: parentCriterionId,
      name: criterionName,
      type: criterionType,
      isLeaf,
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

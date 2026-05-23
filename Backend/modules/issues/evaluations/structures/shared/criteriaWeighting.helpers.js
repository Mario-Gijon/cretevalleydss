import { getOrderedLeafCriteriaDb } from "../../../issue.ordering.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";

export const getOrderedCriterionNames = async ({ issue }) => {
  const leafCriteria = await getOrderedLeafCriteriaDb({
    issueId: issue?._id,
    issueDoc: issue,
    select: "_id name",
    lean: true,
  });

  if (!Array.isArray(leafCriteria) || leafCriteria.length === 0) {
    throw createBadRequestError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }

  const criterionNames = leafCriteria.map((criterion) => String(criterion?.name || ""));

  return {
    leafCriteria,
    criterionNames,
  };
};

import { getOrderedLeafCriteriaDb } from "../shared/ordering.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

export const getOrderedCriteriaForWeightingOrThrow = async ({ issue }) => {
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

  const criteria = leafCriteria.map((criterion) => ({
    id: toIdString(criterion?._id),
    name: String(criterion?.name || ""),
  }));

  return {
    leafCriteria,
    criteria,
  };
};

import { createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

export const resolveCriteria = ({ decisionContext }) => {
  if (!isPlainObject(decisionContext)) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "decisionContext",
    });
  }

  const source =
    decisionContext.criteriaWeightingCriteria ?? decisionContext.leafCriteria;
  if (!Array.isArray(source)) {
    throw createInternalError(
      "AHP criteria-weighting context must provide criteria",
      { field: "decisionContext.criteriaWeightingCriteria" }
    );
  }
  if (source.length === 0) {
    throw createInternalError("AHP evaluation requires at least one criterion", {
      field: "decisionContext.criteriaWeightingCriteria",
    });
  }

  const seen = new Set();
  return source.map((criterion, index) => {
    const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
    const name = typeof criterion?.name === "string" ? criterion.name.trim() : "";
    if (!id || !name || seen.has(id)) {
      throw createInternalError("AHP criterion is invalid or duplicated", {
        field: `decisionContext.criteriaWeightingCriteria[${index}]`,
      });
    }
    seen.add(id);
    return { id, name, index };
  });
};

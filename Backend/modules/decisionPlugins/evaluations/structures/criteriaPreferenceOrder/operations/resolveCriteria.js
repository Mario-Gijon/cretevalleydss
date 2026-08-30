import { createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";

export const resolveCriteria = ({ decisionContext }) => {
  if (!isPlainObject(decisionContext)) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "decisionContext",
    });
  }

  const sourceCriteria = decisionContext.criteriaWeightingCriteria ?? decisionContext.leafCriteria;

  if (!Array.isArray(sourceCriteria)) {
    throw createInternalError(
      "Evaluation structure context leafCriteria must be an array",
      {
        field: "decisionContext.leafCriteria",
      }
    );
  }

  const seenIds = new Set();

  return sourceCriteria.map((criterion, index) => {
    const id = normalizeNonEmptyString(criterion?.id);

    if (!id) {
      throw createInternalError("Evaluation structure criterion id is invalid", {
        field: `decisionContext.leafCriteria[${index}].id`,
      });
    }

    if (seenIds.has(id)) {
      throw createInternalError(
        "Evaluation structure criterion ids must be unique",
        {
          field: `decisionContext.leafCriteria[${index}].id`,
        }
      );
    }

    seenIds.add(id);

    return id;
  });
};

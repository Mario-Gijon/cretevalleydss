import { createInternalError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

export const resolveCriteria = ({ decisionContext }) => {
  if (!isPlainObject(decisionContext)) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "decisionContext",
    });
  }

  const sourceCriteria = decisionContext.leafCriteria;

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
    const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
    const name =
      typeof criterion?.name === "string" ? criterion.name.trim() : "";

    if (!id) {
      throw createInternalError("Evaluation structure criterion id is invalid", {
        field: `decisionContext.leafCriteria[${index}].id`,
      });
    }

    if (!name) {
      throw createInternalError(
        "Evaluation structure criterion name is invalid",
        {
          field: `decisionContext.leafCriteria[${index}].name`,
        }
      );
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

    return { id, name, index };
  });
};

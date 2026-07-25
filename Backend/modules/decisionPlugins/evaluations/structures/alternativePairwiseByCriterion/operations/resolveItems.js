import { createInternalError } from "../../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { assertPairwiseReflectionCompatible } from "../../../../../expressionDomains/operations/assertPairwiseReflectionCompatible.js";

const requireDecisionContext = (decisionContext) => {
  if (!isPlainObject(decisionContext)) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "decisionContext",
    });
  }

  return decisionContext;
};

const resolveAlternatives = (decisionContext) => {
  const alternatives = requireDecisionContext(decisionContext).alternatives;

  if (!Array.isArray(alternatives)) {
    throw createInternalError(
      "Evaluation structure context alternatives must be an array",
      {
        field: "decisionContext.alternatives",
      }
    );
  }

  return alternatives.map((alternative, index) => {
    const id = toIdString(alternative?.id ?? alternative?._id);
    const name =
      typeof alternative?.name === "string" ? alternative.name.trim() : "";

    if (!id || !name) {
      throw createInternalError("Evaluation structure alternative is invalid", {
        field: `decisionContext.alternatives[${index}]`,
      });
    }

    return { id, name, index };
  });
};

const resolveCriteria = (decisionContext) => {
  const criteria = requireDecisionContext(decisionContext).leafCriteria;

  if (!Array.isArray(criteria)) {
    throw createInternalError(
      "Evaluation structure context leafCriteria must be an array",
      {
        field: "decisionContext.leafCriteria",
      }
    );
  }

  return criteria.map((criterion, index) => {
    const id = toIdString(criterion?.id ?? criterion?._id);
    const name =
      typeof criterion?.name === "string" ? criterion.name.trim() : "";
    const expressionDomain = criterion?.expressionDomain;

    if (!id || !name) {
      throw createInternalError("Evaluation structure criterion is invalid", {
        field: `decisionContext.leafCriteria[${index}]`,
      });
    }

    if (!isPlainObject(expressionDomain)) {
      throw createInternalError(
        "Evaluation structure criterion expressionDomain is invalid",
        {
          field: `decisionContext.leafCriteria[${index}].expressionDomain`,
        }
      );
    }

    assertPairwiseReflectionCompatible(expressionDomain);

    return {
      id,
      name,
      expressionDomain,
      index,
    };
  });
};

export const resolveItems = async ({ decisionContext }) => {
  const alternatives = resolveAlternatives(decisionContext);
  const criteria = resolveCriteria(decisionContext);

  return {
    alternatives,
    criteria,
    criterionIds: criteria.map((criterion) => criterion.id),
  };
};

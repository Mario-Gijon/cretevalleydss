import { createInternalError } from "../../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { getExpressionDomainTypeOrThrow } from "../../../../../expressionDomains/expressionDomainTypeCatalog.js";

const requireDecisionContextOrThrow = (decisionContext) => {
  if (
    !decisionContext ||
    typeof decisionContext !== "object" ||
    Array.isArray(decisionContext)
  ) {
    throw createInternalError("Decision context is invalid", {
      field: "decisionContext",
    });
  }

  return decisionContext;
};

const requireDecisionAlternativesOrThrow = (decisionContext) => {
  const alternatives = requireDecisionContextOrThrow(
    decisionContext
  )?.alternatives;

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
    const name = typeof alternative?.name === "string" ? alternative.name.trim() : "";

    if (!id || !name) {
      throw createInternalError("Evaluation structure alternative is invalid", {
        field: `decisionContext.alternatives[${index}]`,
      });
    }

    return { id, name };
  });
};

const requireDecisionCriteriaOrThrow = (decisionContext) => {
  const criteria = requireDecisionContextOrThrow(decisionContext)?.leafCriteria;

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
    const name = typeof criterion?.name === "string" ? criterion.name.trim() : "";

    if (!id || !name) {
      throw createInternalError("Evaluation structure criterion is invalid", {
        field: `decisionContext.leafCriteria[${index}]`,
      });
    }

    if (!isPlainObject(criterion?.expressionDomain)) {
      throw createInternalError("Evaluation structure criterion expressionDomain is invalid", {
        field: `decisionContext.leafCriteria[${index}].expressionDomain`,
      });
    }

    const typeKey =
      typeof criterion.expressionDomain.typeKey === "string"
        ? criterion.expressionDomain.typeKey.trim()
        : "";

    if (!typeKey) {
      throw createInternalError("Evaluation structure criterion expressionDomain type is invalid", {
        field: `decisionContext.leafCriteria[${index}].expressionDomain.typeKey`,
      });
    }

    getExpressionDomainTypeOrThrow(typeKey);

    return {
      id,
      name,
      expressionDomain: criterion.expressionDomain,
    };
  });
};

export const resolveAlternativeCriteriaMatrixItems = async ({ decisionContext }) => ({
  alternatives: requireDecisionAlternativesOrThrow(decisionContext),
  criteria: requireDecisionCriteriaOrThrow(decisionContext),
});

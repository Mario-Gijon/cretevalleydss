import { getExpressionDomainTypeMetadataOrThrow } from "../../../../../expressionDomains";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const resolveDecisionAlternatives = (decisionContext) => {
  if (!isPlainObject(decisionContext)) {
    throw new Error("Decision context is invalid.");
  }

  if (!Array.isArray(decisionContext.alternatives)) {
    throw new Error("Decision context alternatives must be an array.");
  }

  return decisionContext.alternatives.map((alternative, index) => {
    const id = String(alternative?.id ?? alternative?._id ?? "").trim();
    const name = String(alternative?.name ?? "").trim();

    if (!id || !name) {
      throw new Error(`Decision context alternative ${index + 1} is invalid.`);
    }

    return { id, name };
  });
};

export const resolveDecisionCriteria = (decisionContext) => {
  if (!isPlainObject(decisionContext)) {
    throw new Error("Decision context is invalid.");
  }

  if (!Array.isArray(decisionContext.leafCriteria)) {
    throw new Error("Decision context leafCriteria must be an array.");
  }

  return decisionContext.leafCriteria.map((criterion, index) => {
    const id = String(criterion?.id ?? criterion?._id ?? "").trim();
    const name = String(criterion?.name ?? "").trim();
    const expressionDomain = criterion?.expressionDomain;

    if (!id || !name) {
      throw new Error(`Decision context criterion ${index + 1} is invalid.`);
    }

    if (!isPlainObject(expressionDomain)) {
      throw new Error(
        `Decision context criterion ${index + 1} expressionDomain is invalid.`
      );
    }

    const typeKey =
      typeof expressionDomain.typeKey === "string"
        ? expressionDomain.typeKey.trim()
        : "";

    if (!typeKey) {
      throw new Error(
        `Decision context criterion ${index + 1} expressionDomain type is invalid.`
      );
    }

    getExpressionDomainTypeMetadataOrThrow(typeKey);

    return {
      id,
      name,
      expressionDomain,
    };
  });
};

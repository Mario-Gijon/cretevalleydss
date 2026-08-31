import { getExpressionDomainType } from "./expressionDomainTypeCatalog";

export const shouldExpressionDomainRenderCollectiveValue = ({
  expressionDomain,
  collectiveValue,
  disabled = false,
}) => {
  if (!disabled || collectiveValue === undefined || collectiveValue === null) {
    return false;
  }

  const typeKey =
    typeof expressionDomain?.typeKey === "string"
      ? expressionDomain.typeKey.trim()
      : "";
  const entry = typeKey ? getExpressionDomainType(typeKey) : null;

  return entry?.collectiveValueDisplay === "replaceReadOnly";
};

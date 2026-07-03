import { formatExpressionDomainDisplayLabel } from "../../../utils/expressionDomains";

export const formatExpressionDomainLabel = (domain) => {
  if (!domain) {
    return "No domain";
  }

  return formatExpressionDomainDisplayLabel(domain);
};


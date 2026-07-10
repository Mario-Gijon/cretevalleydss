import { createBadRequestError } from "../../../utils/common/errors.js";
import { linguisticFuzzy } from "./types/linguisticFuzzy/index.js";
import { linguisticOrdinal } from "./types/linguisticOrdinal/index.js";
import { numericContinuous } from "./types/numericContinuous/index.js";
import { numericDiscrete } from "./types/numericDiscrete/index.js";

export const EXPRESSION_DOMAIN_TYPE_REGISTRY = Object.freeze({
  numericContinuous,
  numericDiscrete,
  linguisticOrdinal,
  linguisticFuzzy,
});

export const getExpressionDomainTypeOrThrow = (typeKey) => {
  const domainType = EXPRESSION_DOMAIN_TYPE_REGISTRY[typeKey];

  if (!domainType) {
    throw createBadRequestError(
      `Unsupported expression domain type: ${typeKey}`,
      {
        code: "UNSUPPORTED_EXPRESSION_DOMAIN_TYPE",
        field: "typeKey",
      }
    );
  }

  return domainType;
};

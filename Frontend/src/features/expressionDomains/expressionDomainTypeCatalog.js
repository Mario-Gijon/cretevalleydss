import { linguisticFuzzyExpressionDomainType } from "./types/linguisticFuzzy/index.js";
import { linguisticOrdinalExpressionDomainType } from "./types/linguisticOrdinal/index.js";
import { numericContinuousExpressionDomainType } from "./types/numericContinuous/index.js";
import { numericDiscreteExpressionDomainType } from "./types/numericDiscrete/index.js";

const ORDERED_EXPRESSION_DOMAIN_TYPE_ENTRIES = Object.freeze([
  numericContinuousExpressionDomainType,
  numericDiscreteExpressionDomainType,
  linguisticOrdinalExpressionDomainType,
  linguisticFuzzyExpressionDomainType,
]);

export const EXPRESSION_DOMAIN_TYPE_CATALOG = Object.freeze({
  numericContinuous: numericContinuousExpressionDomainType,
  numericDiscrete: numericDiscreteExpressionDomainType,
  linguisticOrdinal: linguisticOrdinalExpressionDomainType,
  linguisticFuzzy: linguisticFuzzyExpressionDomainType,
});

export const getExpressionDomainType = (typeKey) =>
  EXPRESSION_DOMAIN_TYPE_CATALOG[typeKey] ?? null;

export const getExpressionDomainTypeOrThrow = (typeKey) => {
  const entry = getExpressionDomainType(typeKey);

  if (!entry) {
    throw new Error(
      `[expressionDomains] Unsupported expression domain type key "${typeKey}".`
    );
  }

  return entry;
};

export const listExpressionDomainTypes = () =>
  ORDERED_EXPRESSION_DOMAIN_TYPE_ENTRIES;

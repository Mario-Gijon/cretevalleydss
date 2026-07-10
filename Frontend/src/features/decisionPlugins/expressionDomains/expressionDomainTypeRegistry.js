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

export const EXPRESSION_DOMAIN_TYPE_REGISTRY = Object.freeze({
  numericContinuous: numericContinuousExpressionDomainType,
  numericDiscrete: numericDiscreteExpressionDomainType,
  linguisticOrdinal: linguisticOrdinalExpressionDomainType,
  linguisticFuzzy: linguisticFuzzyExpressionDomainType,
});

export const getExpressionDomainTypeEntry = (typeKey) =>
  EXPRESSION_DOMAIN_TYPE_REGISTRY[typeKey] ?? null;

export const getExpressionDomainTypeEntryOrThrow = (typeKey) => {
  const entry = getExpressionDomainTypeEntry(typeKey);

  if (!entry) {
    throw new Error(
      `[expressionDomains] Unsupported expression domain type key "${typeKey}".`
    );
  }

  return entry;
};

export const listExpressionDomainTypeEntries = () =>
  ORDERED_EXPRESSION_DOMAIN_TYPE_ENTRIES;

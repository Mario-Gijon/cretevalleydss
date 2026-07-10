const ORDERED_EXPRESSION_DOMAIN_TYPE_METADATA_ENTRIES = Object.freeze([
  Object.freeze({
    key: "numericContinuous",
    label: "Numeric continuous",
    description: "Numeric values within a continuous range.",
    family: "numeric",
    constraintExample: {
      min: 0,
      max: 1,
    },
  }),
  Object.freeze({
    key: "numericDiscrete",
    label: "Numeric discrete",
    description: "Numeric values within a range using a fixed step.",
    family: "numeric",
    constraintExample: {
      min: 1,
      max: 5,
      step: 1,
    },
  }),
  Object.freeze({
    key: "linguisticOrdinal",
    label: "Ordered linguistic",
    description: "Ordered linguistic labels without membership functions.",
    family: "linguistic",
    constraintExample: {
      labelCount: [3, 5, 7],
    },
  }),
  Object.freeze({
    key: "linguisticFuzzy",
    label: "Fuzzy linguistic",
    description: "Linguistic labels represented with membership function values.",
    family: "linguistic",
    constraintExample: {
      membershipFunction: ["triangular"],
      labelCount: [5, 7],
    },
  }),
]);

export const EXPRESSION_DOMAIN_TYPE_METADATA_CATALOG = Object.freeze(
  Object.fromEntries(
    ORDERED_EXPRESSION_DOMAIN_TYPE_METADATA_ENTRIES.map((entry) => [
      entry.key,
      entry,
    ])
  )
);

export const getExpressionDomainTypeMetadata = (typeKey) =>
  EXPRESSION_DOMAIN_TYPE_METADATA_CATALOG[typeKey] ?? null;

export const getExpressionDomainTypeMetadataOrThrow = (typeKey) => {
  const entry = getExpressionDomainTypeMetadata(typeKey);

  if (!entry) {
    throw new Error(
      `[expressionDomains] Unsupported expression domain type key "${typeKey}".`
    );
  }

  return entry;
};

export const listExpressionDomainTypeMetadata = () =>
  ORDERED_EXPRESSION_DOMAIN_TYPE_METADATA_ENTRIES;

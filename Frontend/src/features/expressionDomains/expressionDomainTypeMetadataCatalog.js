const ORDERED_EXPRESSION_DOMAIN_TYPE_METADATA_ENTRIES = Object.freeze([
  Object.freeze({
    key: "numericContinuous",
    label: "Numeric continuous",
    description: "Numeric values within a continuous range.",
    family: "numeric",
    compatibilityConstraintFields: Object.freeze([
      Object.freeze({
        key: "min",
        label: "Minimum",
        kind: "finiteNumber",
        lessThan: "max",
      }),
      Object.freeze({ key: "max", label: "Maximum", kind: "finiteNumber" }),
    ]),
  }),
  Object.freeze({
    key: "numericDiscrete",
    label: "Numeric discrete",
    description: "Numeric values within a range using a fixed step.",
    family: "numeric",
    compatibilityConstraintFields: Object.freeze([
      Object.freeze({
        key: "min",
        label: "Minimum",
        kind: "finiteNumber",
        lessThan: "max",
      }),
      Object.freeze({ key: "max", label: "Maximum", kind: "finiteNumber" }),
      Object.freeze({
        key: "step",
        label: "Step",
        kind: "finiteNumber",
        exclusiveMinimum: 0,
      }),
    ]),
  }),
  Object.freeze({
    key: "linguisticOrdinal",
    label: "Ordered linguistic",
    description: "Ordered linguistic labels without membership functions.",
    family: "linguistic",
    compatibilityConstraintFields: Object.freeze([
      Object.freeze({
        key: "labelCount",
        label: "Allowed label counts",
        kind: "integerList",
        minimum: 2,
      }),
    ]),
  }),
  Object.freeze({
    key: "linguistic2Tuple",
    label: "Linguistic 2-Tuple",
    description: "Ordered linguistic labels with symbolic translation.",
    family: "linguistic",
    compatibilityConstraintFields: Object.freeze([
      Object.freeze({
        key: "labelCount",
        label: "Allowed label counts",
        kind: "integerList",
        minimum: 3,
        mustBeOdd: true,
      }),
    ]),
  }),
  Object.freeze({
    key: "linguisticFuzzy",
    label: "Fuzzy linguistic",
    description: "Linguistic labels represented with membership function values.",
    family: "linguistic",
    compatibilityConstraintFields: Object.freeze([
      Object.freeze({
        key: "membershipFunction",
        label: "Allowed membership functions",
        kind: "multiEnum",
        options: Object.freeze([
          Object.freeze({ value: "triangular", label: "Triangular" }),
          Object.freeze({ value: "trapezoidal", label: "Trapezoidal" }),
          Object.freeze({ value: "hexagonal", label: "Hexagonal" }),
        ]),
      }),
      Object.freeze({
        key: "labelCount",
        label: "Allowed label counts",
        kind: "integerList",
        minimum: 1,
      }),
    ]),
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

import { normalizeExpressionDomainCreationPayload } from "./normalizeExpressionDomainPayload.js";

const freezeDeep = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }

  return value;
};

export const CANONICAL_GLOBAL_EXPRESSION_DOMAINS = freezeDeep([
  {
    name: "Continuous 0-1",
    typeKey: "numericContinuous",
    definition: {
      min: 0,
      max: 1,
    },
  },
  {
    name: "Discrete 0-9",
    typeKey: "numericDiscrete",
    definition: {
      min: 0,
      max: 9,
      step: 1,
    },
  },
  {
    name: "Ordinal 5",
    typeKey: "linguisticOrdinal",
    definition: {
      labels: ["Very Low", "Low", "Medium", "High", "Very High"],
    },
  },
  {
    name: "Fuzzy Linguistic 5",
    typeKey: "linguisticFuzzy",
    definition: {
      membershipFunction: "triangular",
      labels: [
        { key: "very_low", label: "Very Low", values: [0.0, 0.1, 0.3] },
        { key: "low", label: "Low", values: [0.1, 0.3, 0.5] },
        { key: "medium", label: "Medium", values: [0.3, 0.5, 0.7] },
        { key: "high", label: "High", values: [0.5, 0.7, 0.9] },
        { key: "very_high", label: "Very High", values: [0.7, 0.9, 1.0] },
      ],
    },
  },
]);

export const buildCanonicalGlobalExpressionDomains = () =>
  CANONICAL_GLOBAL_EXPRESSION_DOMAINS.map((sourceDomain) => {
    const normalizedDomain = normalizeExpressionDomainCreationPayload(sourceDomain);

    return {
      user: null,
      name: normalizedDomain.name,
      isGlobal: true,
      locked: true,
      typeKey: normalizedDomain.typeKey,
      definition: normalizedDomain.definition,
    };
  });

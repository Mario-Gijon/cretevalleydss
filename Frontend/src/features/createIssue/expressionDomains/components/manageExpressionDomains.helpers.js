const NUMERIC_TYPE_KEYS = Object.freeze(["numericContinuous", "numericDiscrete"]);
const LINGUISTIC_TYPE_KEYS = Object.freeze(["linguisticOrdinal", "linguisticFuzzy"]);

export const MANAGE_DOMAIN_FAMILY_FILTERS = Object.freeze({
  all: "all",
  numeric: "numeric",
  linguistic: "linguistic",
});

export const MANAGE_DOMAIN_SUBTYPE_FILTERS = Object.freeze({
  allNumeric: "allNumeric",
  continuous: "continuous",
  discrete: "discrete",
  allLinguistic: "allLinguistic",
  ordinal: "ordinal",
  fuzzy: "fuzzy",
});

export const getManageExpressionDomainFamily = (domain) => {
  const typeKey = typeof domain?.typeKey === "string" ? domain.typeKey.trim() : "";

  if (NUMERIC_TYPE_KEYS.includes(typeKey)) {
    return MANAGE_DOMAIN_FAMILY_FILTERS.numeric;
  }

  if (LINGUISTIC_TYPE_KEYS.includes(typeKey)) {
    return MANAGE_DOMAIN_FAMILY_FILTERS.linguistic;
  }

  return "";
};

export const getResetSubtypeFilter = (familyFilter) => {
  if (familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.numeric) {
    return MANAGE_DOMAIN_SUBTYPE_FILTERS.allNumeric;
  }

  if (familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.linguistic) {
    return MANAGE_DOMAIN_SUBTYPE_FILTERS.allLinguistic;
  }

  return "";
};

const matchesSubtypeFilter = (domain, subtypeFilter) => {
  const typeKey = typeof domain?.typeKey === "string" ? domain.typeKey.trim() : "";

  switch (subtypeFilter) {
    case MANAGE_DOMAIN_SUBTYPE_FILTERS.continuous:
      return typeKey === "numericContinuous";
    case MANAGE_DOMAIN_SUBTYPE_FILTERS.discrete:
      return typeKey === "numericDiscrete";
    case MANAGE_DOMAIN_SUBTYPE_FILTERS.ordinal:
      return typeKey === "linguisticOrdinal";
    case MANAGE_DOMAIN_SUBTYPE_FILTERS.fuzzy:
      return typeKey === "linguisticFuzzy";
    case MANAGE_DOMAIN_SUBTYPE_FILTERS.allNumeric:
      return NUMERIC_TYPE_KEYS.includes(typeKey);
    case MANAGE_DOMAIN_SUBTYPE_FILTERS.allLinguistic:
      return LINGUISTIC_TYPE_KEYS.includes(typeKey);
    default:
      return true;
  }
};

export const filterManagedExpressionDomains = ({
  domains,
  searchQuery,
  familyFilter,
  subtypeFilter,
}) => {
  const normalizedDomains = Array.isArray(domains) ? [...domains] : [];
  const normalizedSearchQuery =
    typeof searchQuery === "string" ? searchQuery.trim().toLowerCase() : "";

  return normalizedDomains.filter((domain) => {
    const canonicalName =
      typeof domain?.name === "string" ? domain.name.trim().toLowerCase() : "";

    if (normalizedSearchQuery && !canonicalName.includes(normalizedSearchQuery)) {
      return false;
    }

    const family = getManageExpressionDomainFamily(domain);

    if (
      familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.numeric &&
      family !== MANAGE_DOMAIN_FAMILY_FILTERS.numeric
    ) {
      return false;
    }

    if (
      familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.linguistic &&
      family !== MANAGE_DOMAIN_FAMILY_FILTERS.linguistic
    ) {
      return false;
    }

    return matchesSubtypeFilter(domain, subtypeFilter);
  });
};


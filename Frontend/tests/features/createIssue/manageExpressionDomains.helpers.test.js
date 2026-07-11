import { describe, expect, it } from "vitest";

import {
  filterManagedExpressionDomains,
  getResetSubtypeFilter,
  MANAGE_DOMAIN_FAMILY_FILTERS,
  MANAGE_DOMAIN_SUBTYPE_FILTERS,
} from "../../../src/features/createIssue/expressionDomains/components/manageExpressionDomains.helpers.js";

const domainsFixture = [
  {
    _id: "global-continuous",
    name: "Global Cost Range",
    typeKey: "numericContinuous",
    definition: { min: 0, max: 10 },
    __domainScope: "global",
  },
  {
    _id: "global-ordinal",
    name: "Priority Ladder",
    typeKey: "linguisticOrdinal",
    definition: {
      labels: [
        { key: "low", label: "Low", index: 0 },
        { key: "high", label: "High", index: 1 },
      ],
    },
    __domainScope: "global",
  },
  {
    _id: "user-discrete",
    name: "Ticket Count",
    typeKey: "numericDiscrete",
    definition: { min: 0, max: 4, step: 1 },
    __domainScope: "user",
  },
  {
    _id: "user-fuzzy",
    name: "Suitability Cloud",
    typeKey: "linguisticFuzzy",
    definition: {
      membershipFunction: "triangular",
      labels: [
        { key: "low", label: "Low", values: [0, 0, 0.5], index: 0 },
        { key: "high", label: "High", values: [0.5, 1, 1], index: 1 },
      ],
    },
    __domainScope: "user",
  },
];

const runFilter = (overrides = {}) =>
  filterManagedExpressionDomains({
    domains: domainsFixture,
    searchQuery: "",
    familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.all,
    subtypeFilter: "",
    ...overrides,
  }).map((domain) => domain.name);

describe("manageExpressionDomains.helpers", () => {
  it("matches search by canonical name case-insensitively and trims whitespace", () => {
    expect(runFilter({ searchQuery: "  suitability  " })).toEqual(["Suitability Cloud"]);
    expect(runFilter({ searchQuery: "PRIORITY" })).toEqual(["Priority Ladder"]);
  });

  it("does not match only because the descriptor text or label contents would match", () => {
    expect(runFilter({ searchQuery: "continuous" })).toEqual([]);
    expect(runFilter({ searchQuery: "low" })).toEqual([]);
  });

  it("shows all domains for the all family filter", () => {
    expect(runFilter()).toEqual([
      "Global Cost Range",
      "Priority Ladder",
      "Ticket Count",
      "Suitability Cloud",
    ]);
  });

  it("filters numeric and linguistic families from canonical typeKey only", () => {
    expect(
      runFilter({ familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.numeric })
    ).toEqual(["Global Cost Range", "Ticket Count"]);
    expect(
      runFilter({ familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.linguistic })
    ).toEqual(["Priority Ladder", "Suitability Cloud"]);
  });

  it("filters numeric subtypes exactly", () => {
    expect(
      runFilter({
        familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.numeric,
        subtypeFilter: MANAGE_DOMAIN_SUBTYPE_FILTERS.continuous,
      })
    ).toEqual(["Global Cost Range"]);
    expect(
      runFilter({
        familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.numeric,
        subtypeFilter: MANAGE_DOMAIN_SUBTYPE_FILTERS.discrete,
      })
    ).toEqual(["Ticket Count"]);
  });

  it("filters linguistic subtypes exactly", () => {
    expect(
      runFilter({
        familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.linguistic,
        subtypeFilter: MANAGE_DOMAIN_SUBTYPE_FILTERS.ordinal,
      })
    ).toEqual(["Priority Ladder"]);
    expect(
      runFilter({
        familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.linguistic,
        subtypeFilter: MANAGE_DOMAIN_SUBTYPE_FILTERS.fuzzy,
      })
    ).toEqual(["Suitability Cloud"]);
  });

  it("returns the correct reset subtype for each family", () => {
    expect(getResetSubtypeFilter(MANAGE_DOMAIN_FAMILY_FILTERS.numeric)).toBe(
      MANAGE_DOMAIN_SUBTYPE_FILTERS.allNumeric
    );
    expect(getResetSubtypeFilter(MANAGE_DOMAIN_FAMILY_FILTERS.linguistic)).toBe(
      MANAGE_DOMAIN_SUBTYPE_FILTERS.allLinguistic
    );
    expect(getResetSubtypeFilter(MANAGE_DOMAIN_FAMILY_FILTERS.all)).toBe("");
  });

  it("does not mutate source arrays and preserves source order", () => {
    const sourceCopy = domainsFixture.map((domain) => domain.name);
    const result = runFilter({
      familyFilter: MANAGE_DOMAIN_FAMILY_FILTERS.linguistic,
    });

    expect(result).toEqual(["Priority Ladder", "Suitability Cloud"]);
    expect(domainsFixture.map((domain) => domain.name)).toEqual(sourceCopy);
  });
});


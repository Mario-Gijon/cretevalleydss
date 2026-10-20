import { describe, expect, it } from "vitest";

import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { remapBoundaryProfileCriterionIds } from "../../../modules/decisionPlugins/modelParameters/structures/boundaryProfiles/remapCriterionIds.js";
import {
  validateAndNormalizeBoundaryProfiles,
  validateBoundaryProfilesWithParameters,
} from "../../../modules/decisionPlugins/modelParameters/structures/boundaryProfiles/validateAndNormalize.js";
import { validateBoundaryProfilesDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/boundaryProfiles/validateDefinition.js";

const leafCriteria = [
  { id: "benefit-id", name: "Quality", type: "benefit" },
  { id: "cost-id", name: "Cost", type: "cost" },
];

const criterionDomainsById = {
  "benefit-id": {
    typeKey: "numericContinuous",
    definition: { min: 0, max: 100 },
  },
  "cost-id": {
    typeKey: "numericDiscrete",
    definition: { min: 1, max: 9, step: 2 },
  },
};

const categories = [
  { categoryId: "low", label: "Low", order: 0 },
  { categoryId: "middle", label: "Middle", order: 1 },
  { categoryId: "high", label: "High", order: 2 },
];

const validValue = {
  profiles: [
    {
      profileId: "boundary-high",
      categoryId: "high",
      valuesByCriterionId: { "cost-id": 4, "benefit-id": 75 },
    },
    {
      profileId: "boundary-middle",
      categoryId: "middle",
      valuesByCriterionId: { "cost-id": 6, "benefit-id": 50 },
    },
  ],
};

const parameter = {
  key: "boundaries",
  parameterStructureKey: "boundaryProfiles",
  required: true,
};

const categoryParameter = {
  key: "classOrder",
  parameterStructureKey: "orderedCategories",
  required: true,
};

describe("boundaryProfiles model parameter structure", () => {
  it("normalizes criteria by canonical nested leaf ids and profiles by category order", () => {
    const result = validateAndNormalizeModelParametersOrThrow({
      model: { name: "Sorter", parameters: [parameter, categoryParameter] },
      paramValues: { boundaries: validValue, classOrder: categories },
      criteriaNodes: [
        {
          id: "root-id",
          name: "Measures",
          type: "group",
          children: [
            { id: "benefit-id", name: "Quality", type: "benefit", children: [] },
            {
              id: "nested-id",
              name: "Costs",
              type: "group",
              children: [
                { id: "cost-id", name: "Cost", type: "cost", children: [] },
              ],
            },
          ],
        },
      ],
      criterionDomainsById,
    });

    expect(result.boundaries.profiles).toEqual([
      {
        profileId: "boundary-middle",
        categoryId: "middle",
        valuesByCriterionId: { "benefit-id": 50, "cost-id": 6 },
      },
      {
        profileId: "boundary-high",
        categoryId: "high",
        valuesByCriterionId: { "benefit-id": 75, "cost-id": 4 },
      },
    ]);
    expect(result.classOrder.map(({ categoryId }) => categoryId)).toEqual([
      "low",
      "middle",
      "high",
    ]);
  });

  it.each([
    [
      "duplicate profile id",
      {
        profiles: [
          ...validValue.profiles,
          { ...validValue.profiles[0], categoryId: "low" },
        ],
      },
      "profileId 'boundary-high' must be unique",
    ],
    [
      "duplicate boundary category",
      {
        profiles: [
          validValue.profiles[0],
          { ...validValue.profiles[1], categoryId: "high" },
        ],
      },
      "categoryId 'high' has multiple boundary profiles",
    ],
    [
      "missing boundary profile",
      { profiles: [validValue.profiles[1]] },
      "requires exactly 2 boundary profiles",
    ],
    [
      "stale category reference",
      {
        profiles: [
          { ...validValue.profiles[0], categoryId: "removed" },
          validValue.profiles[1],
        ],
      },
      "is missing a boundary profile for category 'high'",
    ],
    [
      "stale criterion reference",
      {
        profiles: validValue.profiles.map((profile) => ({
          ...profile,
          valuesByCriterionId: { ...profile.valuesByCriterionId, stale: 5 },
        })),
      },
      "references unknown criterion 'stale'",
    ],
    [
      "missing criterion value",
      {
        profiles: validValue.profiles.map((profile) => ({
          ...profile,
          valuesByCriterionId: { "benefit-id": 50 },
        })),
      },
      "is missing value for criterion 'cost-id'",
    ],
    [
      "non-monotone benefit value",
      {
        profiles: [
          { ...validValue.profiles[0], valuesByCriterionId: { "cost-id": 4, "benefit-id": 50 } },
          { ...validValue.profiles[1], valuesByCriterionId: { "cost-id": 6, "benefit-id": 75 } },
        ],
      },
      "violate criterion 'benefit-id' preference order",
    ],
    [
      "identical adjacent profiles",
      {
        profiles: [
          { ...validValue.profiles[1], valuesByCriterionId: { "benefit-id": 50, "cost-id": 6 } },
          { ...validValue.profiles[0], categoryId: "high", valuesByCriterionId: { "benefit-id": 50, "cost-id": 6 } },
        ],
      },
      "must differ strictly on at least one criterion",
    ],
    [
      "outside expression domain",
      {
        profiles: validValue.profiles.map((profile) => ({
          ...profile,
          valuesByCriterionId: { ...profile.valuesByCriterionId, "benefit-id": 101 },
        })),
      },
      "must be within its expression domain [0, 100]",
    ],
  ])("rejects %s", (_caseName, value, message) => {
    expect(
      validateBoundaryProfilesWithParameters({
        value,
        context: { leafCriteria, criterionDomainsById },
        dependencies: { categories },
      })
    ).toMatchObject({ ok: false, message: expect.stringContaining(message) });
  });

  it("rejects unsupported domains and criteria without a benefit or cost direction", () => {
    expect(
      validateBoundaryProfilesWithParameters({
        value: validValue,
        context: {
          leafCriteria,
          criterionDomainsById: {
            ...criterionDomainsById,
            "cost-id": {
              typeKey: "linguisticOrdinal",
              definition: { labels: ["low", "high"] },
            },
          },
        },
        dependencies: { categories },
      })
    ).toMatchObject({ ok: false, message: expect.stringContaining("numeric expression domains only") });

    expect(
      validateBoundaryProfilesWithParameters({
        value: validValue,
        context: {
          leafCriteria: [{ ...leafCriteria[0], type: "group" }, leafCriteria[1]],
          criterionDomainsById,
        },
        dependencies: { categories },
      })
    ).toMatchObject({ ok: false, message: expect.stringContaining("must declare type 'benefit' or 'cost'") });
  });

  it("validates categories through a declared cross-parameter dependency independent of manifest order", () => {
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: { name: "Sorter", parameters: [parameter, categoryParameter] },
        paramValues: { boundaries: validValue, classOrder: categories },
        criteriaNodes: leafCriteria,
        criterionDomainsById,
      }).boundaries.profiles.map(({ categoryId }) => categoryId)
    ).toEqual(["middle", "high"]);

    expect(() =>
      validateAndNormalizeModelParametersOrThrow({
        model: { name: "Sorter", parameters: [parameter] },
        paramValues: { boundaries: validValue },
        criteriaNodes: leafCriteria,
        criterionDomainsById,
      })
    ).toThrow("requires exactly one configured 'orderedCategories' parameter");
  });

  it("remaps profile criterion keys without changing profile or category identities", () => {
    const result = remapBoundaryProfileCriterionIds({
      value: validValue,
      parameter,
      criterionIdMap: new Map([
        ["benefit-id", "mongo-benefit"],
        ["cost-id", "mongo-cost"],
      ]),
    });

    expect(result.profiles).toEqual([
      {
        profileId: "boundary-high",
        categoryId: "high",
        valuesByCriterionId: { "mongo-cost": 4, "mongo-benefit": 75 },
      },
      {
        profileId: "boundary-middle",
        categoryId: "middle",
        valuesByCriterionId: { "mongo-cost": 6, "mongo-benefit": 50 },
      },
    ]);
  });

  it("validates structural defaults without depending on display names", () => {
    expect(validateBoundaryProfilesDefinition({ default: validValue })).toBeNull();
    expect(
      validateAndNormalizeBoundaryProfiles({
        value: validValue,
        context: { leafCriteria },
      }).ok
    ).toBe(true);
    expect(
      validateBoundaryProfilesDefinition({ default: { profiles: [{ profileId: "p" }] } })
    ).toContain("categoryId");
  });
});

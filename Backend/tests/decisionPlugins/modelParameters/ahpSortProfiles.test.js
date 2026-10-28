import { describe, expect, it } from "vitest";

import { MODEL_PARAMETER_STRUCTURE_REGISTRY } from "../../../modules/decisionPlugins/modelParameters/parameterStructureRegistry.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { validateAHPSortProfilesDefinition } from "../../../modules/decisionPlugins/modelParameters/structures/ahpSortProfiles/validateDefinition.js";
import {
  validateAHPSortProfilesWithParameters,
} from "../../../modules/decisionPlugins/modelParameters/structures/ahpSortProfiles/validateWithParameters.js";
import {
  validateAndNormalizeAHPSortProfilesParameter,
} from "../../../modules/decisionPlugins/modelParameters/structures/ahpSortProfiles/validateAndNormalize.js";

const categories = [
  { categoryId: "low", label: "Low", order: 0 },
  { categoryId: "medium", label: "Medium", order: 1 },
  { categoryId: "high", label: "High", order: 2 },
];

const limiting = {
  mode: "limiting",
  profiles: [
    {
      profileId: "boundary-medium-high",
      lowerCategoryId: "medium",
      upperCategoryId: "high",
    },
    {
      profileId: "boundary-low-medium",
      lowerCategoryId: "low",
      upperCategoryId: "medium",
    },
  ],
};

const central = {
  mode: "central",
  profiles: [
    { profileId: "center-high", categoryId: "high" },
    { profileId: "center-low", categoryId: "low" },
    { profileId: "center-medium", categoryId: "medium" },
  ],
  tiePolicy: "optimistic",
};

const withCategories = (value, orderedCategories = categories) =>
  validateAHPSortProfilesWithParameters({
    value,
    dependencies: { categories: orderedCategories },
  });

describe("ahpSortProfiles model parameter structure", () => {
  it("is discovered and depends on orderedCategories", () => {
    expect(MODEL_PARAMETER_STRUCTURE_REGISTRY.get("ahpSortProfiles")).toMatchObject({
      key: "ahpSortProfiles",
      parameterDependencies: [
        { key: "categories", parameterStructureKey: "orderedCategories" },
      ],
    });
  });

  it("normalizes limiting profiles by consecutive category order without changing IDs", () => {
    expect(withCategories(limiting)).toEqual({
      ok: true,
      value: {
        mode: "limiting",
        profiles: [
          {
            profileId: "boundary-low-medium",
            lowerCategoryId: "low",
            upperCategoryId: "medium",
          },
          {
            profileId: "boundary-medium-high",
            lowerCategoryId: "medium",
            upperCategoryId: "high",
          },
        ],
      },
    });
  });

  it("resolves orderedCategories through the registered parameter dependency", () => {
    const parameters = [
      { key: "categories", parameterStructureKey: "orderedCategories", required: true },
      { key: "profiles", parameterStructureKey: "ahpSortProfiles", required: true },
    ];
    expect(
      validateAndNormalizeModelParametersOrThrow({
        model: { name: "AHPSort I", parameters },
        paramValues: { categories, profiles: limiting },
        criteriaNodes: [],
      }).profiles
    ).toEqual({
      mode: "limiting",
      profiles: [
        {
          profileId: "boundary-low-medium",
          lowerCategoryId: "low",
          upperCategoryId: "medium",
        },
        {
          profileId: "boundary-medium-high",
          lowerCategoryId: "medium",
          upperCategoryId: "high",
        },
      ],
    });
  });

  it("normalizes central profiles by category order and keeps tie policy", () => {
    expect(withCategories(central)).toEqual({
      ok: true,
      value: {
        mode: "central",
        profiles: [
          { profileId: "center-low", categoryId: "low" },
          { profileId: "center-medium", categoryId: "medium" },
          { profileId: "center-high", categoryId: "high" },
        ],
        tiePolicy: "optimistic",
      },
    });
  });

  it("requires two or more ordered categories", () => {
    expect(withCategories(limiting, [categories[0]])).toMatchObject({
      ok: false,
      message: "requires at least two ordered categories",
    });
  });

  it.each([
    ["unknown mode", { ...limiting, mode: "unknown" }, "mode must be 'limiting' or 'central'"],
    ["missing mode", { profiles: limiting.profiles }, "mode must be 'limiting' or 'central'"],
    ["extra top-level field", { ...limiting, numericalValues: {} }, "contains unsupported field 'numericalValues'"],
    ["extra profile field", { ...limiting, profiles: [{ ...limiting.profiles[0], valuesByCriterionId: {} }] }, "unsupported field 'valuesByCriterionId'"],
    ["empty profile id", { ...limiting, profiles: [{ ...limiting.profiles[0], profileId: " " }, limiting.profiles[1]] }, "profiles[0].profileId must be a non-empty string"],
    ["duplicate profile ID", { ...limiting, profiles: [limiting.profiles[0], { ...limiting.profiles[1], profileId: limiting.profiles[0].profileId }] }, "profileId 'boundary-medium-high' must be unique"],
    ["empty profile list", { ...limiting, profiles: [] }, "requires exactly 2 limiting profiles"],
    ["missing limiting boundary", { ...limiting, profiles: [limiting.profiles[0]] }, "requires exactly 2 limiting profiles"],
    ["reversed limiting boundary", { ...limiting, profiles: [{ ...limiting.profiles[0], lowerCategoryId: "high", upperCategoryId: "medium" }, limiting.profiles[1]] }, "consecutive categories in their configured order"],
    ["nonconsecutive limiting boundary", { ...limiting, profiles: [{ ...limiting.profiles[0], lowerCategoryId: "low", upperCategoryId: "high" }, limiting.profiles[1]] }, "consecutive categories in their configured order"],
    ["unknown category reference", { ...limiting, profiles: [{ ...limiting.profiles[0], lowerCategoryId: "stale" }, limiting.profiles[1]] }, "references unknown category 'stale'"],
    ["self boundary", { ...limiting, profiles: [{ ...limiting.profiles[0], upperCategoryId: "medium" }, limiting.profiles[1]] }, "cannot separate a category from itself"],
    ["central tie policy missing", { mode: "central", profiles: central.profiles }, "central mode requires mode, profiles and tiePolicy"],
    ["central tie policy invalid", { ...central, tiePolicy: "nearest" }, "tiePolicy must be 'optimistic' or 'pessimistic'"],
    ["limiting tie policy is forbidden", { ...limiting, tiePolicy: "optimistic" }, "contains unsupported field 'tiePolicy'"],
    ["duplicate central category", { ...central, profiles: [central.profiles[0], central.profiles[1], { profileId: "other", categoryId: "low" }] }, "categoryId 'low' has multiple central profiles"],
    ["missing central profile", { ...central, profiles: central.profiles.slice(0, 2) }, "requires exactly 3 central profiles"],
    ["unknown central category", { ...central, profiles: [{ ...central.profiles[0], categoryId: "unknown" }, ...central.profiles.slice(1)] }, "references unknown category 'unknown'"],
  ])("rejects %s", (_label, value, message) => {
    const result = withCategories(value);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(message);
  });

  it("validates an optional definition default without adding numeric profile values", () => {
    expect(validateAHPSortProfilesDefinition({ key: "profiles" })).toBeNull();
    expect(validateAHPSortProfilesDefinition({ key: "profiles", default: central })).toBeNull();
    expect(
      validateAHPSortProfilesDefinition({
        key: "profiles",
        default: { ...central, profiles: [{ ...central.profiles[0], valuesByCriterionId: {} }] },
      })
    ).toContain("unsupported field 'valuesByCriterionId'");
  });

  it("normalizes shape first and defers category references to its declared dependency", () => {
    expect(validateAndNormalizeAHPSortProfilesParameter({ value: central })).toEqual({
      ok: true,
      value: central,
    });
  });
});

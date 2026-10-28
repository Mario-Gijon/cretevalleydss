import { isPlainObject } from "../../../utils/common/objects.js";

const normalizeId = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const hasExactFields = (value, expectedFields) =>
  Object.keys(value).length === expectedFields.size &&
  Object.keys(value).every((field) => expectedFields.has(field));

export const normalizeAHPSortProfilesShape = (value) => {
  if (!isPlainObject(value)) {
    return { error: "must be an object containing a profile mode and profiles" };
  }

  const mode = value.mode;
  if (mode !== "limiting" && mode !== "central") {
    return { error: "mode must be 'limiting' or 'central'" };
  }

  const expectedFields = new Set(
    mode === "central" ? ["mode", "profiles", "tiePolicy"] : ["mode", "profiles"]
  );
  const unexpectedField = Object.keys(value).find(
    (field) => !expectedFields.has(field)
  );
  if (unexpectedField) {
    return { error: `contains unsupported field '${unexpectedField}'` };
  }
  if (!hasExactFields(value, expectedFields)) {
    return {
      error:
        mode === "central"
          ? "central mode requires mode, profiles and tiePolicy"
          : "limiting mode requires mode and profiles",
    };
  }
  if (!Array.isArray(value.profiles)) {
    return { error: "profiles must be an array" };
  }

  if (
    mode === "central" &&
    value.tiePolicy !== "optimistic" &&
    value.tiePolicy !== "pessimistic"
  ) {
    return { error: "tiePolicy must be 'optimistic' or 'pessimistic'" };
  }

  const profileIds = new Set();
  const referenceIds = new Set();
  const profiles = [];

  for (const [index, rawProfile] of value.profiles.entries()) {
    const field = `profiles[${index}]`;
    if (!isPlainObject(rawProfile)) {
      return { error: `${field} must be an object` };
    }

    const profileFields = new Set(
      mode === "central"
        ? ["profileId", "categoryId"]
        : ["profileId", "lowerCategoryId", "upperCategoryId"]
    );
    const unknownField = Object.keys(rawProfile).find(
      (key) => !profileFields.has(key)
    );
    if (unknownField) {
      return {
        error: `${field} contains unsupported field '${unknownField}'`,
      };
    }
    if (!hasExactFields(rawProfile, profileFields)) {
      return {
        error: `${field} must contain ${[...profileFields].join(" and ")} only`,
      };
    }

    const profileId = normalizeId(rawProfile.profileId);
    if (!profileId) {
      return { error: `${field}.profileId must be a non-empty string` };
    }
    if (profileIds.has(profileId)) {
      return { error: `profileId '${profileId}' must be unique` };
    }
    profileIds.add(profileId);

    if (mode === "central") {
      const categoryId = normalizeId(rawProfile.categoryId);
      if (!categoryId) {
        return {
          error: `${field}.categoryId must be a non-empty string`,
        };
      }
      if (referenceIds.has(categoryId)) {
        return { error: `categoryId '${categoryId}' has multiple central profiles` };
      }
      referenceIds.add(categoryId);
      profiles.push({ profileId, categoryId });
      continue;
    }

    const lowerCategoryId = normalizeId(rawProfile.lowerCategoryId);
    const upperCategoryId = normalizeId(rawProfile.upperCategoryId);
    if (!lowerCategoryId || !upperCategoryId) {
      return {
        error: `${field} requires non-empty lowerCategoryId and upperCategoryId values`,
      };
    }
    if (lowerCategoryId === upperCategoryId) {
      return { error: `${field} cannot separate a category from itself` };
    }
    const pairKey = JSON.stringify([lowerCategoryId, upperCategoryId]);
    if (referenceIds.has(pairKey)) {
      return {
        error: `the boundary '${lowerCategoryId}' to '${upperCategoryId}' has multiple profiles`,
      };
    }
    referenceIds.add(pairKey);
    profiles.push({ profileId, lowerCategoryId, upperCategoryId });
  }

  return {
    value: {
      mode,
      profiles,
      ...(mode === "central" ? { tiePolicy: value.tiePolicy } : {}),
    },
  };
};

export const normalizeAHPSortProfilesConfiguration = ({ value, categories }) => {
  const shape = normalizeAHPSortProfilesShape(value);
  if (shape.error) return shape;

  if (!Array.isArray(categories) || categories.length < 2) {
    return { error: "requires at least two ordered categories" };
  }

  const orderedCategories = categories.map((category, index) => {
    const categoryId = normalizeId(category?.categoryId);
    if (!categoryId) {
      return { error: `ordered category at index ${index} requires a categoryId` };
    }
    return { categoryId, order: index };
  });
  const categoryIds = orderedCategories.map(({ categoryId }) => categoryId);
  if (new Set(categoryIds).size !== categoryIds.length) {
    return { error: "orderedCategories must have unique category IDs" };
  }

  if (shape.value.mode === "central") {
    const profileByCategoryId = new Map(
      shape.value.profiles.map((profile) => [profile.categoryId, profile])
    );
    const unknownCategoryId = shape.value.profiles.find(
      (profile) => !categoryIds.includes(profile.categoryId)
    )?.categoryId;
    if (unknownCategoryId) {
      return { error: `references unknown category '${unknownCategoryId}'` };
    }
    if (shape.value.profiles.length !== orderedCategories.length) {
      return {
        error: `requires exactly ${orderedCategories.length} central profiles, one per category`,
      };
    }
    const missingCategoryId = categoryIds.find(
      (categoryId) => !profileByCategoryId.has(categoryId)
    );
    if (missingCategoryId) {
      return { error: `is missing a central profile for category '${missingCategoryId}'` };
    }
    return {
      value: {
        ...shape.value,
        profiles: categoryIds.map((categoryId) =>
          profileByCategoryId.get(categoryId)
        ),
      },
    };
  }

  const expectedBoundaries = categoryIds.slice(1).map((upperCategoryId, index) => ({
    lowerCategoryId: categoryIds[index],
    upperCategoryId,
  }));
  const unknownCategoryId = shape.value.profiles
    .flatMap((profile) => [profile.lowerCategoryId, profile.upperCategoryId])
    .find((categoryId) => !categoryIds.includes(categoryId));
  if (unknownCategoryId) {
    return { error: `references unknown category '${unknownCategoryId}'` };
  }
  const profileByBoundary = new Map(
    shape.value.profiles.map((profile) => [
      JSON.stringify([profile.lowerCategoryId, profile.upperCategoryId]),
      profile,
    ])
  );
  const expectedBoundaryKeys = new Set(
    expectedBoundaries.map(({ lowerCategoryId, upperCategoryId }) =>
      JSON.stringify([lowerCategoryId, upperCategoryId])
    )
  );
  const unexpectedBoundary = shape.value.profiles.find(
    (profile) =>
      !expectedBoundaryKeys.has(
        JSON.stringify([profile.lowerCategoryId, profile.upperCategoryId])
      )
  );
  if (unexpectedBoundary) {
    return {
      error: `profile '${unexpectedBoundary.profileId}' must separate consecutive categories in their configured order`,
    };
  }
  if (shape.value.profiles.length !== expectedBoundaries.length) {
    return {
      error: `requires exactly ${expectedBoundaries.length} limiting profiles, one per consecutive category boundary`,
    };
  }

  const missingBoundary = expectedBoundaries.find(
    ({ lowerCategoryId, upperCategoryId }) =>
      !profileByBoundary.has(JSON.stringify([lowerCategoryId, upperCategoryId]))
  );
  if (missingBoundary) {
    return {
      error: `is missing a limiting profile between '${missingBoundary.lowerCategoryId}' and '${missingBoundary.upperCategoryId}'`,
    };
  }

  return {
    value: {
      mode: "limiting",
      profiles: expectedBoundaries.map(({ lowerCategoryId, upperCategoryId }) =>
        profileByBoundary.get(JSON.stringify([lowerCategoryId, upperCategoryId]))
      ),
    },
  };
};

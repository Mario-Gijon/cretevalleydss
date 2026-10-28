import { getParameterValueByStructureKey } from "../../../../modelParameters/context";

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const normalizeId = (value) =>
  typeof value === "string" ? value.trim() : value;

const newProfileId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `ahpsort-profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const categoryId = (category) =>
  typeof category?.categoryId === "string" ? category.categoryId.trim() : "";

const categoryLabel = (category, categories = []) => {
  const label = typeof category?.label === "string" ? category.label.trim() : "";
  if (!label) return "Unnamed category";
  const duplicates = categories.filter((item) =>
    typeof item?.label === "string" && item.label.trim() === label
  ).length;
  if (duplicates < 2) return label;
  return `${label} (category ${categories.findIndex((item) => categoryId(item) === categoryId(category)) + 1})`;
};

const getExpectedAssociations = (mode, categories) => {
  const ordered = Array.isArray(categories) ? categories : [];
  if (mode === "central") {
    return ordered.map((category) => ({ categoryId: categoryId(category) }));
  }
  if (mode === "limiting") {
    return ordered.slice(1).map((upper, index) => ({
      lowerCategoryId: categoryId(ordered[index]),
      upperCategoryId: categoryId(upper),
    }));
  }
  return [];
};

const associationKey = (mode, profile) => mode === "central"
  ? JSON.stringify([normalizeId(profile?.categoryId)])
  : JSON.stringify([
      normalizeId(profile?.lowerCategoryId),
      normalizeId(profile?.upperCategoryId),
    ]);

const associationLabel = (mode, profile, categories) => {
  if (mode === "central") {
    const category = categories.find((item) => categoryId(item) === profile?.categoryId);
    return category ? `${categoryLabel(category, categories)} center` : "an unmatched central profile";
  }
  const lower = categories.find((item) => categoryId(item) === profile?.lowerCategoryId);
  const upper = categories.find((item) => categoryId(item) === profile?.upperCategoryId);
  return lower && upper
    ? `${categoryLabel(lower, categories)} → ${categoryLabel(upper, categories)}`
    : "an unmatched limiting profile";
};

export const createAHPSortProfilesForMode = (mode, categories) => {
  const profiles = getExpectedAssociations(mode, categories)
    .filter((association) => Object.values(association).every(Boolean))
    .map((association) => ({ profileId: newProfileId(), ...association }));

  return mode === "central"
    ? { mode, profiles, tiePolicy: "" }
    : { mode, profiles };
};

/**
 * Normalize only known identifier whitespace. Missing IDs remain missing so
 * validation can report them rather than generating new IDs during render.
 */
export const normalizeAHPSortProfilesValue = (_parameter, value) => {
  if (!isPlainObject(value)) return value;
  if (!Array.isArray(value.profiles)) return { ...value };
  return {
    ...value,
    profiles: value.profiles.map((profile) => {
      if (!isPlainObject(profile)) return profile;
      return Object.fromEntries(
        Object.entries(profile).map(([key, item]) => [
          key,
          ["profileId", "categoryId", "lowerCategoryId", "upperCategoryId"].includes(key)
            ? normalizeId(item)
            : item,
        ])
      );
    }),
  };
};

export const validateAHPSortProfilesValue = (_parameter, value, parameterContext) => {
  if (!isPlainObject(value)) return "Choose a profile method.";
  const { mode } = value;
  if (mode !== "limiting" && mode !== "central") {
    return "Choose limiting profiles or central profiles.";
  }

  const allowedFields = mode === "central"
    ? new Set(["mode", "profiles", "tiePolicy"])
    : new Set(["mode", "profiles"]);
  if (Object.keys(value).some((key) => !allowedFields.has(key))) {
    return mode === "central"
      ? "Review the central profile settings."
      : "Limiting profiles do not use an equal-distance preference.";
  }
  if (mode === "central" && value.tiePolicy !== "optimistic" && value.tiePolicy !== "pessimistic") {
    return "Choose how equally close category centers should be handled.";
  }
  if (!Array.isArray(value.profiles)) return "Configure one profile for each category reference.";

  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  if (!Array.isArray(categories) || categories.length < 2) {
    return "Add at least two ordered categories before configuring profiles.";
  }
  const categoryIds = categories.map(categoryId);
  if (categoryIds.some((id) => !id) || new Set(categoryIds).size !== categoryIds.length) {
    return "Each ordered category needs a unique identifier.";
  }
  if (categories.some((category, index) => category?.order !== index)) {
    return "Categories must remain in their displayed preference order.";
  }

  const expectedFields = mode === "central"
    ? new Set(["profileId", "categoryId"])
    : new Set(["profileId", "lowerCategoryId", "upperCategoryId"]);
  const profileIds = new Set();
  const associations = new Set();
  const expectedAssociations = getExpectedAssociations(mode, categories);
  const expectedAssociationKeys = new Set(
    expectedAssociations.map((association) => associationKey(mode, association))
  );
  for (const [index, profile] of value.profiles.entries()) {
    if (!isPlainObject(profile)) return `Profile ${index + 1} is invalid.`;
    if (
      Object.keys(profile).length !== expectedFields.size ||
      Object.keys(profile).some((key) => !expectedFields.has(key))
    ) {
      return `Review the saved profile ${index + 1}.`;
    }
    const id = typeof profile.profileId === "string" ? profile.profileId.trim() : "";
    if (!id) return `Profile ${index + 1} needs an identifier.`;
    if (profileIds.has(id)) return "Each profile must have a unique identifier.";
    profileIds.add(id);

    const association = associationKey(mode, profile);
    if (associations.has(association)) return "A category can have only one profile.";
    associations.add(association);
    if (mode === "limiting" && !expectedAssociationKeys.has(association)) {
      return "Each limiting profile must separate neighboring categories in preference order.";
    }

    if (mode === "central") {
      if (!categoryIds.includes(profile.categoryId)) {
        return "A central profile refers to a category that no longer exists.";
      }
    } else if (
      !categoryIds.includes(profile.lowerCategoryId) ||
      !categoryIds.includes(profile.upperCategoryId)
    ) {
      return "A limiting profile refers to a category that no longer exists.";
    }
  }

  if (value.profiles.length !== expectedAssociations.length) {
    return mode === "central"
      ? `Configure exactly one central profile for each of the ${categories.length} categories.`
      : `Configure exactly one limiting profile for each of the ${expectedAssociations.length} neighboring category boundaries.`;
  }
  if (expectedAssociations.some((association) => !associations.has(associationKey(mode, association)))) {
    return mode === "central"
      ? "Add one central profile for every category."
      : "Add one limiting profile for every pair of neighboring categories.";
  }

  return null;
};

export const reconcileAHPSortProfilesAfterCategoryChange = ({
  value,
  nextCategories,
}) => {
  if (
    !isPlainObject(value) ||
    (value.mode !== "limiting" && value.mode !== "central") ||
    !Array.isArray(value.profiles)
  ) return value;

  const existingByAssociation = new Map();
  value.profiles.forEach((profile) => {
    const key = associationKey(value.mode, profile);
    if (!existingByAssociation.has(key)) existingByAssociation.set(key, []);
    existingByAssociation.get(key).push(profile);
  });

  const profiles = getExpectedAssociations(value.mode, nextCategories)
    .filter((association) => Object.values(association).every(Boolean))
    .map((association) => {
      const existing = existingByAssociation.get(associationKey(value.mode, association))?.shift();
      const hasStableId = typeof existing?.profileId === "string" && existing.profileId.trim();
      return hasStableId ? existing : { profileId: newProfileId(), ...association };
    });

  return { ...value, profiles };
};

export const describeAHPSortCategoryChange = ({
  value,
  reconciledValue,
  previousContext,
}) => {
  const mode = value?.mode;
  if ((mode !== "limiting" && mode !== "central") || !Array.isArray(value?.profiles)) return [];
  const previousCategories = getParameterValueByStructureKey(previousContext, "orderedCategories") || [];
  const nextProfiles = Array.isArray(reconciledValue?.profiles) ? reconciledValue.profiles : [];
  const removedProfiles = value.profiles.filter((profile) => !nextProfiles.includes(profile));
  return [...new Set(removedProfiles.map((profile) =>
    `Changing categories will remove the ${mode === "central" ? "central profile for " : "limiting profile for "}${associationLabel(mode, profile, previousCategories)}.`
  ))];
};

export const describeAHPSortProfileForDisplay = (mode, profile, categories) =>
  associationLabel(mode, profile, Array.isArray(categories) ? categories : []);

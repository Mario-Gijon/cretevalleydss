import { getParameterValueByStructureKey } from "../../../../modelParameters/context";

const newProfileId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeDraftNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : value;
  if (typeof value !== "string" || value.trim() === "") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export const createBoundaryProfile = ({ categoryId, leafCriteria = [] }) => ({
  profileId: newProfileId(),
  categoryId,
  valuesByCriterionId: Object.fromEntries(
    (Array.isArray(leafCriteria) ? leafCriteria : [])
      .filter((criterion) => typeof criterion?.id === "string" && criterion.id.trim())
      .map((criterion) => [criterion.id, ""])
  ),
});

export const normalizeBoundaryProfilesValue = (_parameter, value) => ({
  profiles: (Array.isArray(value?.profiles) ? value.profiles : []).map((profile) => ({
    profileId:
      typeof profile?.profileId === "string" && profile.profileId.trim()
        ? profile.profileId.trim()
        : newProfileId(),
    categoryId: typeof profile?.categoryId === "string" ? profile.categoryId.trim() : "",
    valuesByCriterionId: isObject(profile?.valuesByCriterionId)
      ? Object.fromEntries(
          Object.entries(profile.valuesByCriterionId).map(([criterionId, rawValue]) => [
            criterionId,
            normalizeDraftNumber(rawValue),
          ])
        )
      : {},
  })),
});

const normalizeFiniteNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getCategories = (parameterContext) => {
  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  return Array.isArray(categories) ? categories : null;
};

const getCriterionRows = (parameterContext) => {
  const criteria = Array.isArray(parameterContext?.leafCriteria)
    ? parameterContext.leafCriteria
    : [];
  const ids = new Set();
  for (const criterion of criteria) {
    const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
    if (!id) return { error: "Leaf criteria must have IDs before profiles can be configured." };
    if (ids.has(id)) return { error: `Criterion ID '${id}' is repeated.` };
    ids.add(id);
  }
  if (!criteria.length) return { error: "Add at least one leaf criterion before configuring profiles." };
  return { rows: criteria.map((criterion) => ({ ...criterion, id: criterion.id.trim() })) };
};

export const validateBoundaryProfilesValue = (parameter, value, parameterContext) => {
  if (!isObject(value) || !Array.isArray(value.profiles)) {
    return "Boundary profiles must be a list.";
  }
  const categories = getCategories(parameterContext);
  if (!categories || categories.length < 2) {
    return "Add at least two ordered categories before configuring boundary profiles.";
  }

  const expectedCategoryIds = categories.slice(1).map((category) => category?.categoryId);
  const categoryIds = new Set();
  const profileIds = new Set();
  for (const profile of value.profiles) {
    const profileId = typeof profile?.profileId === "string" ? profile.profileId.trim() : "";
    const categoryId = typeof profile?.categoryId === "string" ? profile.categoryId.trim() : "";
    if (!profileId) return "Every boundary profile needs an ID.";
    if (profileIds.has(profileId)) return `Profile ID '${profileId}' is repeated.`;
    profileIds.add(profileId);
    if (!categoryId) return `Profile '${profileId}' needs a category ID.`;
    if (categoryIds.has(categoryId)) return `Category '${categoryId}' has more than one profile.`;
    categoryIds.add(categoryId);
  }

  const profilesByCategory = new Map(value.profiles.map((profile) => [profile.categoryId, profile]));
  for (const categoryId of expectedCategoryIds) {
    if (!profilesByCategory.has(categoryId)) {
      const category = categories.find((item) => item?.categoryId === categoryId);
      return `Add a boundary profile for '${category?.label || categoryId}'.`;
    }
  }
  const expectedIds = new Set(expectedCategoryIds);
  const staleProfile = value.profiles.find((profile) => !expectedIds.has(profile.categoryId));
  if (staleProfile) {
    const category = categories.find((item) => item?.categoryId === staleProfile.categoryId);
    return category
      ? `The profile for '${category.label || category.categoryId}' no longer separates two categories. Remove it or restore the category order.`
      : `Profile '${staleProfile.profileId}' refers to a category that was removed. Remove this profile before continuing.`;
  }
  if (value.profiles.length !== expectedCategoryIds.length) {
    return `Configure exactly ${expectedCategoryIds.length} boundary profile(s).`;
  }

  const criterionResult = getCriterionRows(parameterContext);
  if (criterionResult.error) return criterionResult.error;
  const { rows } = criterionResult;
  const expectedCriterionIds = new Set(rows.map((criterion) => criterion.id));
  const restrictions = parameter?.restrictions && typeof parameter.restrictions === "object"
    ? parameter.restrictions
    : {};
  const profiles = expectedCategoryIds.map((categoryId) => profilesByCategory.get(categoryId));

  for (const profile of profiles) {
    if (!isObject(profile.valuesByCriterionId)) {
      return `Profile '${profile.profileId}' needs values for every leaf criterion.`;
    }
    const staleCriterionId = Object.keys(profile.valuesByCriterionId).find((id) => !expectedCriterionIds.has(id));
    if (staleCriterionId) {
      return `Profile '${profile.profileId}' refers to removed criterion '${staleCriterionId}'.`;
    }
    for (const criterion of rows) {
      if (!Object.hasOwn(profile.valuesByCriterionId, criterion.id)) {
        return `Enter a value for '${criterion.name || criterion.id}' in the profile for '${categories.find((item) => item.categoryId === profile.categoryId)?.label || profile.categoryId}'.`;
      }
      const number = normalizeFiniteNumber(profile.valuesByCriterionId[criterion.id]);
      if (number === null) {
        return `Enter a finite number for '${criterion.name || criterion.id}' in the profile for '${profile.categoryId}'.`;
      }
      const domain = parameterContext?.criterionDomainsById?.[criterion.id];
      if (!domain) {
        return `Select a numeric expression domain for '${criterion.name || criterion.id}'.`;
      }
      if (domain.typeKey !== "numericContinuous" && domain.typeKey !== "numericDiscrete") {
        return `Boundary profiles require a numeric domain for '${criterion.name || criterion.id}'.`;
      }
      const min = domain.definition?.min;
      const max = domain.definition?.max;
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        return `The numeric domain for '${criterion.name || criterion.id}' needs valid minimum and maximum values.`;
      }
      if (number < min || number > max) {
        return `Value for '${criterion.name || criterion.id}' must be between ${min} and ${max}.`;
      }
      if (
        (Number.isFinite(restrictions.min) && number < restrictions.min) ||
        (Number.isFinite(restrictions.max) && number > restrictions.max)
      ) {
        return `Value for '${criterion.name || criterion.id}' is outside the allowed parameter range.`;
      }
      if (criterion.type !== "benefit" && criterion.type !== "cost") {
        return `Criterion '${criterion.name || criterion.id}' must be marked as benefit or cost.`;
      }
    }
  }

  for (let index = 1; index < profiles.length; index += 1) {
    const lessPreferred = profiles[index - 1];
    const morePreferred = profiles[index];
    let strictPreferenceFound = false;
    for (const criterion of rows) {
      const previous = normalizeFiniteNumber(lessPreferred.valuesByCriterionId[criterion.id]);
      const next = normalizeFiniteNumber(morePreferred.valuesByCriterionId[criterion.id]);
      const isBenefit = criterion.type === "benefit";
      if ((isBenefit && next < previous) || (!isBenefit && next > previous)) {
        return `Profiles for consecutive categories violate the ${criterion.type} order on '${criterion.name || criterion.id}'.`;
      }
      if (isBenefit ? next > previous : next < previous) strictPreferenceFound = true;
    }
    if (!strictPreferenceFound) {
      return "Consecutive boundary profiles must differ strictly on at least one criterion.";
    }
  }

  return null;
};

const profilesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export const reconcileBoundaryProfiles = ({ value, categories, leafCriteria }) => {
  const current = normalizeBoundaryProfilesValue(null, value);
  const categoryRows = Array.isArray(categories) ? categories : [];
  const criterionRows = Array.isArray(leafCriteria) ? leafCriteria : [];
  const expectedCategoryIds = categoryRows.slice(1)
    .map((category) => category?.categoryId)
    .filter((id) => typeof id === "string" && id.trim());
  const existingByCategory = new Map();
  current.profiles.forEach((profile, index) => {
    if (!existingByCategory.has(profile.categoryId)) existingByCategory.set(profile.categoryId, []);
    existingByCategory.get(profile.categoryId).push({ profile, index });
  });
  const knownCriterionIds = new Set(criterionRows
    .map((criterion) => criterion?.id)
    .filter((id) => typeof id === "string" && id.trim()));
  const consumedIndexes = new Set();
  const activeProfiles = expectedCategoryIds.map((categoryId) => {
    const entry = existingByCategory.get(categoryId)?.shift();
    if (!entry) return createBoundaryProfile({ categoryId, leafCriteria: criterionRows });
    const existing = entry.profile;
    consumedIndexes.add(entry.index);
    return {
      ...existing,
      categoryId,
      valuesByCriterionId: Object.fromEntries([
        ...Object.entries(existing.valuesByCriterionId).filter(([id]) => knownCriterionIds.has(id)),
        ...criterionRows
          .filter((criterion) => typeof criterion?.id === "string" && !Object.hasOwn(existing.valuesByCriterionId, criterion.id))
          .map((criterion) => [criterion.id, ""]),
      ]),
    };
  });
  const staleProfiles = current.profiles.filter((_, index) => !consumedIndexes.has(index));
  const next = { profiles: [...activeProfiles, ...staleProfiles] };
  return {
    value: next,
    changed: !profilesEqual(current, next),
    staleCount: staleProfiles.length,
  };
};

export const reconcileBoundaryProfilesAfterCategoryChange = ({
  value,
  previousCategories,
  nextCategories,
  leafCriteria,
}) => {
  const current = normalizeBoundaryProfilesValue(null, value);
  const previousRows = Array.isArray(previousCategories) ? previousCategories : [];
  const nextRows = Array.isArray(nextCategories) ? nextCategories : [];
  const previousLowerCategoryByUpperId = new Map(
    previousRows.slice(1).map((category, index) => [
      category?.categoryId,
      previousRows[index]?.categoryId,
    ])
  );
  const knownCriterionIds = new Set(
    (Array.isArray(leafCriteria) ? leafCriteria : [])
      .map((criterion) => criterion?.id)
      .filter((id) => typeof id === "string" && id.trim())
  );
  const existingByCategory = new Map();
  current.profiles.forEach((profile, index) => {
    if (!existingByCategory.has(profile.categoryId)) existingByCategory.set(profile.categoryId, []);
    existingByCategory.get(profile.categoryId).push({ profile, index });
  });
  const consumedIndexes = new Set();
  const activeProfiles = nextRows.slice(1)
    .map((category) => category?.categoryId)
    .filter((categoryId) => typeof categoryId === "string" && categoryId.trim())
    .map((categoryId, index) => {
      const entry = existingByCategory.get(categoryId)?.shift();
      if (!entry) return createBoundaryProfile({ categoryId, leafCriteria });
      consumedIndexes.add(entry.index);

      const nextLowerCategoryId = nextRows[index]?.categoryId;
      const previousLowerCategoryId = previousLowerCategoryByUpperId.get(categoryId);
      if (previousLowerCategoryId !== nextLowerCategoryId) {
        return createBoundaryProfile({ categoryId, leafCriteria });
      }

      return {
        ...entry.profile,
        valuesByCriterionId: Object.fromEntries([
          ...Object.entries(entry.profile.valuesByCriterionId).filter(([id]) => knownCriterionIds.has(id)),
          ...(Array.isArray(leafCriteria) ? leafCriteria : [])
            .filter((criterion) =>
              typeof criterion?.id === "string" &&
              !Object.hasOwn(entry.profile.valuesByCriterionId, criterion.id)
            )
            .map((criterion) => [criterion.id, ""]),
        ]),
      };
    });
  const staleProfiles = current.profiles.filter((_, index) => !consumedIndexes.has(index));
  return { profiles: [...activeProfiles, ...staleProfiles] };
};

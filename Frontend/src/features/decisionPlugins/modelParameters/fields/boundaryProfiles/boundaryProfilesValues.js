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
    if (!id) return { error: "Each criterion needs to be identified before a boundary can be configured." };
    if (ids.has(id)) return { error: "A criterion is listed more than once." };
    ids.add(id);
  }
  if (!criteria.length) return { error: "Add at least one criterion before configuring category boundaries." };
  return { rows: criteria.map((criterion) => ({ ...criterion, id: criterion.id.trim() })) };
};

const categoryDisplayName = (category, categories) => {
  const label = typeof category?.label === "string" ? category.label.trim() : "";
  if (!label) return "Unnamed category";
  const duplicateCount = categories.filter((row) => row?.label?.trim() === label).length;
  if (duplicateCount < 2) return label;
  const index = categories.findIndex((row) => row?.categoryId === category?.categoryId);
  return `${label} (category ${index + 1})`;
};

export const getBoundaryCriterionSetupIssue = (criterion, domain, restrictions = {}) => {
  const criterionName = criterion?.name?.trim() || "This criterion";
  if (!domain) return `Choose a numeric expression domain for ${criterionName}.`;
  if (domain.typeKey !== "numericContinuous" && domain.typeKey !== "numericDiscrete") {
    return `Use a continuous or discrete numeric domain for ${criterionName}.`;
  }
  const { min, max } = domain.definition || {};
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return `Set a valid numeric range for ${criterionName}.`;
  }
  const allowedMin = Number.isFinite(restrictions.min) ? Math.max(min, restrictions.min) : min;
  const allowedMax = Number.isFinite(restrictions.max) ? Math.min(max, restrictions.max) : max;
  if (allowedMin > allowedMax) {
    return `Adjust the numeric limits for ${criterionName} to fit its expression domain.`;
  }
  if (criterion?.type !== "benefit" && criterion?.type !== "cost") {
    return `Set ${criterionName} to Benefit or Cost.`;
  }
  return null;
};

export const getBoundaryProfilesValidationIssues = (parameter, value, parameterContext) => {
  const issues = [];
  const addIssue = (message, details = {}) => issues.push({ message, ...details });
  if (!isObject(value) || !Array.isArray(value.profiles)) {
    return [{ message: "Set a reference profile between each pair of categories." }];
  }
  const categories = getCategories(parameterContext);
  if (!categories || categories.length < 2) {
    return [{ message: "Add at least two ordered categories before configuring category boundaries." }];
  }

  const expectedCategoryIds = categories.slice(1).map((category) => category?.categoryId);
  const categoryIds = new Set();
  const profileIds = new Set();
  for (const profile of value.profiles) {
    const profileId = typeof profile?.profileId === "string" ? profile.profileId.trim() : "";
    const categoryId = typeof profile?.categoryId === "string" ? profile.categoryId.trim() : "";
    if (!profileId) addIssue("A saved boundary could not be matched to the categories. Review the boundary list.");
    if (profileId && profileIds.has(profileId)) addIssue("A saved boundary is duplicated. Review the model configuration.");
    profileIds.add(profileId);
    if (!categoryId) addIssue("A saved boundary is missing its category reference.");
    if (categoryId && categoryIds.has(categoryId)) addIssue("Each category boundary can have one reference profile.");
    categoryIds.add(categoryId);
  }

  const profilesByCategory = new Map(value.profiles.map((profile) => [profile?.categoryId, profile]));
  for (const categoryId of expectedCategoryIds) {
    if (!profilesByCategory.has(categoryId)) {
      const category = categories.find((item) => item?.categoryId === categoryId);
      const upperIndex = categories.findIndex((item) => item?.categoryId === categoryId);
      const lower = upperIndex > 0 ? categories[upperIndex - 1] : null;
      const boundary = lower
        ? `${categoryDisplayName(lower, categories)} → ${categoryDisplayName(category, categories)}`
        : "this category pair";
      addIssue(`Complete the ${boundary} reference profile.`);
    }
  }
  const expectedIds = new Set(expectedCategoryIds);
  const staleProfile = value.profiles.find((profile) => !expectedIds.has(profile.categoryId));
  if (staleProfile) {
    addIssue("A saved boundary does not match the current category order.", {
      profileId: staleProfile.profileId,
      kind: "stale-profile",
    });
  }
  if (value.profiles.length !== expectedCategoryIds.length) {
    addIssue("Review the saved category boundaries so there is one reference profile between each category pair.");
  }

  const criterionResult = getCriterionRows(parameterContext);
  if (criterionResult.error) return [{ message: criterionResult.error }];
  const { rows } = criterionResult;
  const expectedCriterionIds = new Set(rows.map((criterion) => criterion.id));
  const restrictions = parameter?.restrictions && typeof parameter.restrictions === "object"
    ? parameter.restrictions
    : {};
  const profiles = expectedCategoryIds.map((categoryId) => profilesByCategory.get(categoryId));

  for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
    const profile = profiles[profileIndex];
    if (!profile) continue;
    const categoryIndex = categories.findIndex((category) => category?.categoryId === profile.categoryId);
    const lowerCategory = categoryIndex > 0 ? categories[categoryIndex - 1] : null;
    const upperCategory = categories[categoryIndex];
    const boundaryName = lowerCategory && upperCategory
      ? `${categoryDisplayName(lowerCategory, categories)} → ${categoryDisplayName(upperCategory, categories)}`
      : "this category boundary";
    if (!isObject(profile.valuesByCriterionId)) {
      addIssue(`Enter a value for every criterion in the ${boundaryName} boundary.`, {
        profileId: profile.profileId,
        kind: "profile",
      });
      continue;
    }
    const staleCriterionId = Object.keys(profile.valuesByCriterionId).find((id) => !expectedCriterionIds.has(id));
    if (staleCriterionId) {
      addIssue("This boundary contains a value for a criterion that is no longer in the Issue.", {
        profileId: profile.profileId,
        kind: "stale-criterion",
      });
    }
    for (const criterion of rows) {
      const criterionName = criterion.name?.trim() || `Criterion ${rows.indexOf(criterion) + 1}`;
      const fieldDetails = { profileId: profile.profileId, criterionId: criterion.id, kind: "field" };
      const rawValue = profile.valuesByCriterionId[criterion.id];
      if (!Object.hasOwn(profile.valuesByCriterionId, criterion.id) || rawValue === "" || rawValue === null || rawValue === undefined) {
        addIssue(`Enter a value for ${criterionName} in the ${boundaryName} boundary.`, fieldDetails);
        continue;
      }
      const number = normalizeFiniteNumber(rawValue);
      if (number === null) {
        addIssue(`Enter a numeric value for ${criterionName} in the ${boundaryName} boundary.`, fieldDetails);
        continue;
      }
      const domain = parameterContext?.criterionDomainsById?.[criterion.id];
      const setupIssue = getBoundaryCriterionSetupIssue(criterion, domain, restrictions);
      if (setupIssue) {
        addIssue(setupIssue, fieldDetails);
        continue;
      }
      const min = domain.definition?.min;
      const max = domain.definition?.max;
      if (number < min || number > max) {
        addIssue(`${criterionName} must be between ${min} and ${max}.`, fieldDetails);
        continue;
      }
      if (
        (Number.isFinite(restrictions.min) && number < restrictions.min) ||
        (Number.isFinite(restrictions.max) && number > restrictions.max)
      ) {
        const allowedMin = Number.isFinite(restrictions.min) ? restrictions.min : min;
        const allowedMax = Number.isFinite(restrictions.max) ? restrictions.max : max;
        addIssue(`${criterionName} must be between ${allowedMin} and ${allowedMax}.`, fieldDetails);
        continue;
      }
    }
  }

  for (let index = 1; index < profiles.length; index += 1) {
    const lessPreferred = profiles[index - 1];
    const morePreferred = profiles[index];
    if (!lessPreferred || !morePreferred) continue;
    const hasUnusableCell = rows.some((criterion) =>
      normalizeFiniteNumber(lessPreferred.valuesByCriterionId?.[criterion.id]) === null ||
      normalizeFiniteNumber(morePreferred.valuesByCriterionId?.[criterion.id]) === null
    );
    if (hasUnusableCell) continue;
    let strictPreferenceFound = false;
    for (const criterion of rows) {
      const previous = normalizeFiniteNumber(lessPreferred.valuesByCriterionId[criterion.id]);
      const next = normalizeFiniteNumber(morePreferred.valuesByCriterionId[criterion.id]);
      const isBenefit = criterion.type === "benefit";
      if ((isBenefit && next < previous) || (!isBenefit && next > previous)) {
        const previousIndex = categories.findIndex((category) => category?.categoryId === lessPreferred.categoryId);
        const currentIndex = categories.findIndex((category) => category?.categoryId === morePreferred.categoryId);
        const previousBoundary = previousIndex > 0
          ? `${categoryDisplayName(categories[previousIndex - 1], categories)} → ${categoryDisplayName(categories[previousIndex], categories)}`
          : "the previous boundary";
        const currentBoundary = currentIndex > 0
          ? `${categoryDisplayName(categories[currentIndex - 1], categories)} → ${categoryDisplayName(categories[currentIndex], categories)}`
          : "this boundary";
        addIssue(`${currentBoundary} must be at least as favorable as ${previousBoundary} for ${criterion.name?.trim() || `Criterion ${rows.indexOf(criterion) + 1}`}.`, {
          profileId: morePreferred.profileId,
          criterionId: criterion.id,
          kind: "order",
        });
      }
      if (isBenefit ? next > previous : next < previous) strictPreferenceFound = true;
    }
    if (!strictPreferenceFound) {
      addIssue("This boundary must be more favorable than the previous boundary on at least one criterion.", {
        profileId: morePreferred.profileId,
        kind: "profile-order",
      });
    }
  }

  return issues;
};

export const validateBoundaryProfilesValue = (parameter, value, parameterContext) =>
  getBoundaryProfilesValidationIssues(parameter, value, parameterContext)[0]?.message || null;

const profilesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const reconcileCriterionValues = (valuesByCriterionId, criteria) => {
  const existingValues = isObject(valuesByCriterionId) ? valuesByCriterionId : {};
  const criterionRows = Array.isArray(criteria) ? criteria : [];
  const liveCriterionIds = new Set(criterionRows
    .map((criterion) => criterion?.id)
    .filter((id) => typeof id === "string" && id.trim()));
  const reconciledValues = Object.fromEntries(
    Object.entries(existingValues).filter(([criterionId]) => liveCriterionIds.has(criterionId))
  );
  criterionRows.forEach((criterion) => {
    const criterionId = criterion?.id;
    if (typeof criterionId === "string" && criterionId.trim() && !Object.hasOwn(reconciledValues, criterionId)) {
      reconciledValues[criterionId] = "";
    }
  });
  return reconciledValues;
};

export const reconcileBoundaryProfiles = ({ value, categories, leafCriteria }) => {
  const current = normalizeBoundaryProfilesValue(null, value);
  const categoryRows = Array.isArray(categories) ? categories : [];
  const criterionRows = Array.isArray(leafCriteria) ? leafCriteria : [];
  const expectedCategoryIds = categoryRows.slice(1)
    .map((category) => category?.categoryId)
    .filter((id) => typeof id === "string" && id.trim());
  const existingByCategory = new Map();
  current.profiles.forEach((profile) => {
    if (!existingByCategory.has(profile.categoryId)) existingByCategory.set(profile.categoryId, []);
    existingByCategory.get(profile.categoryId).push({ profile });
  });
  const activeProfiles = expectedCategoryIds.map((categoryId) => {
    const entry = existingByCategory.get(categoryId)?.shift();
    if (!entry) return createBoundaryProfile({ categoryId, leafCriteria: criterionRows });
    const existing = entry.profile;
    return {
      ...existing,
      categoryId,
      valuesByCriterionId: reconcileCriterionValues(existing.valuesByCriterionId, criterionRows),
    };
  });
  const next = { profiles: activeProfiles };
  return {
    value: next,
    changed: !profilesEqual(current, next),
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
  const existingByCategory = new Map();
  current.profiles.forEach((profile) => {
    if (!existingByCategory.has(profile.categoryId)) existingByCategory.set(profile.categoryId, []);
    existingByCategory.get(profile.categoryId).push({ profile });
  });
  const activeProfiles = nextRows.slice(1)
    .map((category) => category?.categoryId)
    .filter((categoryId) => typeof categoryId === "string" && categoryId.trim())
    .map((categoryId, index) => {
      const entry = existingByCategory.get(categoryId)?.shift();
      if (!entry) return createBoundaryProfile({ categoryId, leafCriteria });

      const nextLowerCategoryId = nextRows[index]?.categoryId;
      const previousLowerCategoryId = previousLowerCategoryByUpperId.get(categoryId);
      if (previousLowerCategoryId !== nextLowerCategoryId) {
        return {
          ...createBoundaryProfile({ categoryId, leafCriteria }),
          profileId: entry.profile.profileId,
        };
      }

      return {
        ...entry.profile,
        valuesByCriterionId: reconcileCriterionValues(entry.profile.valuesByCriterionId, leafCriteria),
      };
    });
  return { profiles: activeProfiles };
};

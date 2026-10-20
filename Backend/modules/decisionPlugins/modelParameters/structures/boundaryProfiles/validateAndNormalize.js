import { isPlainObject } from "../../../../../utils/common/objects.js";
import { normalizeNumberValue } from "../../../../modelParameters/parameterValues.js";
import { getExpressionDomainTypeOrThrow } from "../../../../expressionDomains/expressionDomainTypeCatalog.js";
import { toInvalid, toValid } from "../../parameterValidationResult.js";

const PROFILE_FIELDS = new Set([
  "profileId",
  "categoryId",
  "valuesByCriterionId",
]);

const normalizeId = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const validateBoundaryProfileRestrictions = (parameter) => {
  const restrictions = parameter?.restrictions;
  if (restrictions === null || restrictions === undefined) {
    return { min: null, max: null };
  }
  if (!isPlainObject(restrictions)) {
    return { error: "restrictions must be an object when provided" };
  }
  const unknown = Object.keys(restrictions).find(
    (key) => key !== "min" && key !== "max"
  );
  if (unknown) {
    return { error: `restrictions contains unsupported field '${unknown}'` };
  }
  const { min = null, max = null } = restrictions;
  if (
    (min !== null && (typeof min !== "number" || !Number.isFinite(min))) ||
    (max !== null && (typeof max !== "number" || !Number.isFinite(max)))
  ) {
    return { error: "restrictions min and max must be finite numbers or null" };
  }
  if (min !== null && max !== null && min > max) {
    return { error: "restrictions min must not exceed max" };
  }
  return { min, max };
};

const normalizeProfileShape = (value) => {
  if (!isPlainObject(value)) {
    return { error: "must be an object containing boundary profiles" };
  }
  const unknownTopLevelField = Object.keys(value).find(
    (key) => key !== "profiles"
  );
  if (unknownTopLevelField) {
    return { error: `contains unsupported field '${unknownTopLevelField}'` };
  }
  if (!Array.isArray(value.profiles)) {
    return { error: "profiles must be an array" };
  }

  const profileIds = new Set();
  const categoryIds = new Set();
  const profiles = [];
  for (const [index, rawProfile] of value.profiles.entries()) {
    if (!isPlainObject(rawProfile)) {
      return { error: `profile at index ${index} must be an object` };
    }
    const unknownField = Object.keys(rawProfile).find(
      (key) => !PROFILE_FIELDS.has(key)
    );
    if (unknownField) {
      return {
        error: `profile at index ${index} contains unsupported field '${unknownField}'`,
      };
    }

    const profileId = normalizeId(rawProfile.profileId);
    if (!profileId) {
      return { error: `profile at index ${index} requires a profileId` };
    }
    if (profileIds.has(profileId)) {
      return { error: `profileId '${profileId}' must be unique` };
    }
    profileIds.add(profileId);

    const categoryId = normalizeId(rawProfile.categoryId);
    if (!categoryId) {
      return {
        error: `profile '${profileId}' requires a categoryId`,
      };
    }
    if (categoryIds.has(categoryId)) {
      return { error: `categoryId '${categoryId}' has multiple boundary profiles` };
    }
    categoryIds.add(categoryId);

    if (!isPlainObject(rawProfile.valuesByCriterionId)) {
      return {
        error: `profile '${profileId}' valuesByCriterionId must be an object`,
      };
    }
    const criterionIds = Object.keys(rawProfile.valuesByCriterionId);
    if (criterionIds.some((criterionId) => !normalizeId(criterionId))) {
      return {
        error: `profile '${profileId}' contains an empty criterion id`,
      };
    }
    for (const [criterionId, rawValue] of Object.entries(
      rawProfile.valuesByCriterionId
    )) {
      if (normalizeNumberValue(rawValue) === null) {
        return {
          error: `profile '${profileId}' value for criterion '${criterionId}' must be a finite number`,
        };
      }
    }

    profiles.push({ profileId, categoryId, valuesByCriterionId: { ...rawProfile.valuesByCriterionId } });
  }

  return { profiles };
};

const normalizeCriterionRows = (leafCriteria) => {
  if (!Array.isArray(leafCriteria) || leafCriteria.length === 0) {
    return { error: "requires at least one leaf criterion" };
  }
  const seen = new Set();
  const rows = [];
  for (const criterion of leafCriteria) {
    const id = normalizeId(criterion?.id);
    if (!id) return { error: "leaf criteria must include canonical ids" };
    if (seen.has(id)) return { error: `contains duplicate criterion id '${id}'` };
    seen.add(id);
    rows.push({
      id,
      name: normalizeId(criterion?.name) || id,
      type: normalizeId(criterion?.type),
    });
  }
  return { rows };
};

export const validateAndNormalizeBoundaryProfiles = ({
  value,
  parameter,
  context,
}) => {
  const shape = normalizeProfileShape(value);
  if (shape.error) return toInvalid(shape.error, value);

  const criterionResult = normalizeCriterionRows(context?.leafCriteria);
  if (criterionResult.error) return toInvalid(criterionResult.error, value);
  const restrictions = validateBoundaryProfileRestrictions(parameter);
  if (restrictions.error) return toInvalid(restrictions.error, value);
  const { rows } = criterionResult;
  const criterionIds = new Set(rows.map((row) => row.id));
  const profiles = [];

  for (const profile of shape.profiles) {
    for (const criterionId of Object.keys(profile.valuesByCriterionId)) {
      if (!criterionIds.has(criterionId)) {
        return toInvalid(
          `profile '${profile.profileId}' references unknown criterion '${criterionId}'`,
          value
        );
      }
    }

    const valuesByCriterionId = {};
    for (const criterion of rows) {
      if (!Object.hasOwn(profile.valuesByCriterionId, criterion.id)) {
        return toInvalid(
          `profile '${profile.profileId}' is missing value for criterion '${criterion.id}'`,
          value
        );
      }
      const normalized = normalizeNumberValue(
        profile.valuesByCriterionId[criterion.id]
      );
      if (normalized === null) {
        return toInvalid(
          `profile '${profile.profileId}' value for criterion '${criterion.id}' must be a finite number`,
          value
        );
      }
      if (
        (restrictions.min !== null && normalized < restrictions.min) ||
        (restrictions.max !== null && normalized > restrictions.max)
      ) {
        return toInvalid(
          `profile '${profile.profileId}' value for criterion '${criterion.name}' is outside the parameter restrictions`,
          value
        );
      }
      valuesByCriterionId[criterion.id] = normalized;
    }
    profiles.push({ ...profile, valuesByCriterionId });
  }

  return toValid({ profiles });
};

const validateDomainValue = ({
  profile,
  criterion,
  criterionDomainsById,
}) => {
  const domain = criterionDomainsById?.[criterion.id];
  if (!domain || typeof domain !== "object") {
    return `requires a numeric expression domain for criterion '${criterion.id}'`;
  }
  const typeKey = normalizeId(domain.typeKey);
  let domainType;
  try {
    domainType = getExpressionDomainTypeOrThrow(typeKey);
  } catch {
    return `supports numeric expression domains only (criterion '${criterion.id}' uses '${typeKey || "unknown"}')`;
  }
  if (domainType.family !== "numeric") {
    return `supports numeric expression domains only (criterion '${criterion.id}' uses '${typeKey}')`;
  }
  const min = domain.definition?.min;
  const max = domain.definition?.max;
  if (
    typeof min !== "number" ||
    !Number.isFinite(min) ||
    typeof max !== "number" ||
    !Number.isFinite(max) ||
    min > max
  ) {
    return `requires finite minimum and maximum values for criterion '${criterion.id}'`;
  }

  const value = profile.valuesByCriterionId[criterion.id];
  if (value < min || value > max) {
    return `profile '${profile.profileId}' value for criterion '${criterion.id}' must be within its expression domain [${min}, ${max}]`;
  }
  return null;
};

export const validateBoundaryProfilesWithParameters = ({
  value,
  context,
  dependencies,
}) => {
  const shape = normalizeProfileShape(value);
  if (shape.error) return toInvalid(shape.error, value);
  const categories = dependencies?.categories;
  if (!Array.isArray(categories) || categories.length < 2) {
    return toInvalid("requires at least two ordered categories", value);
  }
  const expectedCategoryIds = categories.slice(1).map((category) => category.categoryId);
  if (shape.profiles.length !== expectedCategoryIds.length) {
    return toInvalid(
      `requires exactly ${expectedCategoryIds.length} boundary profiles for ${categories.length} ordered categories`,
      value
    );
  }

  const profilesByCategory = new Map(
    shape.profiles.map((profile) => [profile.categoryId, profile])
  );
  for (const categoryId of expectedCategoryIds) {
    if (!profilesByCategory.has(categoryId)) {
      return toInvalid(
        `is missing a boundary profile for category '${categoryId}'`,
        value
      );
    }
  }
  const expectedCategorySet = new Set(expectedCategoryIds);
  const unexpectedCategoryId = shape.profiles.find(
    (profile) => !expectedCategorySet.has(profile.categoryId)
  )?.categoryId;
  if (unexpectedCategoryId) {
    return toInvalid(
      `categoryId '${unexpectedCategoryId}' does not identify a boundary between configured categories`,
      value
    );
  }

  const normalized = validateAndNormalizeBoundaryProfiles({
    value: { profiles: shape.profiles },
    context,
  });
  if (!normalized.ok) return normalized;
  const profileByCategory = new Map(
    normalized.value.profiles.map((profile) => [profile.categoryId, profile])
  );
  const profiles = expectedCategoryIds.map((categoryId) =>
    profileByCategory.get(categoryId)
  );
  const criterionResult = normalizeCriterionRows(context?.leafCriteria);
  if (criterionResult.error) return toInvalid(criterionResult.error, value);

  for (const criterion of criterionResult.rows) {
    if (criterion.type !== "benefit" && criterion.type !== "cost") {
      return toInvalid(
        `criterion '${criterion.id}' must declare type 'benefit' or 'cost'`,
        value
      );
    }
    for (const profile of profiles) {
      const domainError = validateDomainValue({
        profile,
        criterion,
        criterionDomainsById: context?.criterionDomainsById,
      });
      if (domainError) return toInvalid(domainError, value);
    }
  }

  for (let index = 1; index < profiles.length; index += 1) {
    const lessPreferred = profiles[index - 1];
    const morePreferred = profiles[index];
    let strictPreferenceFound = false;

    for (const criterion of criterionResult.rows) {
      const previousValue = lessPreferred.valuesByCriterionId[criterion.id];
      const nextValue = morePreferred.valuesByCriterionId[criterion.id];
      const isBenefit = criterion.type === "benefit";
      const isMonotone = isBenefit
        ? nextValue >= previousValue
        : nextValue <= previousValue;
      if (!isMonotone) {
        return toInvalid(
          `profiles '${lessPreferred.profileId}' and '${morePreferred.profileId}' violate criterion '${criterion.id}' preference order`,
          value
        );
      }
      if (isBenefit ? nextValue > previousValue : nextValue < previousValue) {
        strictPreferenceFound = true;
      }
    }

    if (!strictPreferenceFound) {
      return toInvalid(
        `profiles '${lessPreferred.profileId}' and '${morePreferred.profileId}' must differ strictly on at least one criterion`,
        value
      );
    }
  }

  return toValid({ profiles });
};

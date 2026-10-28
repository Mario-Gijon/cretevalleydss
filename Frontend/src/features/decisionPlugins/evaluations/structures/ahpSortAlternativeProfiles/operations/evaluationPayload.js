import { getSaatyScaleValue } from "../../criteriaPairwiseAHP/operations/saatyPreference.js";
import { resolveAHPSortAlternativeProfilesContext } from "./resolveContext.js";

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const tupleKey = (parts) => JSON.stringify(parts);

const normalizeId = (value) =>
  typeof value === "string" ? value.trim() : "";

const expectedKeys = {
  alternativeProfileComparisons: [
    "alternativeId",
    "criterionId",
    "profileId",
    "alternativeToProfile",
  ],
  profileComparisons: [
    "criterionId",
    "firstProfileId",
    "secondProfileId",
    "firstToSecond",
  ],
};

const hasExactKeys = (value, keys) =>
  isRecord(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

const resolveSaatyValue = (value) => {
  const numericValue = typeof value === "string" && value.trim() !== ""
    ? Number(value.trim())
    : value;
  return getSaatyScaleValue(numericValue);
};

const buildIndexes = ({ alternatives, criteria, profiles }) => ({
  alternativeIds: new Set(alternatives.map(({ id }) => id)),
  criterionIds: new Set(criteria.map(({ id }) => id)),
  profileIds: new Set(profiles.map(({ profileId }) => profileId)),
  profileIndexById: new Map(profiles.map(({ profileId, index }) => [profileId, index])),
});

const profilePairKey = ({ criterionId, firstProfileId, secondProfileId, profileIndexById }) => {
  const firstIndex = profileIndexById.get(firstProfileId);
  const secondIndex = profileIndexById.get(secondProfileId);
  const orderedIds = firstIndex < secondIndex
    ? [firstProfileId, secondProfileId]
    : [secondProfileId, firstProfileId];
  return tupleKey([criterionId, ...orderedIds]);
};

const isKnown = (ids, id) => ids.has(id);

const inspectRows = ({
  rows,
  field,
  keys,
  expectedKeyFor,
  validateReferences,
  valueField,
  indexes,
}) => {
  const validByKey = new Map();
  const duplicateKeys = new Set();
  let invalidCount = 0;

  rows.forEach((row) => {
    if (!hasExactKeys(row, keys) || !validateReferences(row, indexes) || resolveSaatyValue(row[valueField]) === null) {
      invalidCount += 1;
      return;
    }

    const key = expectedKeyFor(row, indexes);
    if (!key) {
      invalidCount += 1;
      return;
    }
    if (duplicateKeys.has(key)) {
      invalidCount += 1;
      return;
    }
    if (validByKey.has(key)) {
      validByKey.delete(key);
      duplicateKeys.add(key);
      invalidCount += 2;
      return;
    }
    validByKey.set(key, row);
  });

  return { validByKey, duplicateKeys, invalidCount, field };
};

const resolveExpectedKeys = ({ alternatives, criteria, profiles }) => {
  const alternativeKeysByCriterion = new Map();
  const profileKeysByCriterion = new Map();
  const alternativeKeys = new Set();
  const profileKeys = new Set();

  for (const criterion of criteria) {
    const criterionAlternativeKeys = new Set();
    const criterionProfileKeys = new Set();
    for (const alternative of alternatives) {
      for (const profile of profiles) {
        const key = tupleKey([criterion.id, alternative.id, profile.profileId]);
        alternativeKeys.add(key);
        criterionAlternativeKeys.add(key);
      }
    }
    for (let firstIndex = 0; firstIndex < profiles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < profiles.length; secondIndex += 1) {
        const key = tupleKey([criterion.id, profiles[firstIndex].profileId, profiles[secondIndex].profileId]);
        profileKeys.add(key);
        criterionProfileKeys.add(key);
      }
    }
    alternativeKeysByCriterion.set(criterion.id, criterionAlternativeKeys);
    profileKeysByCriterion.set(criterion.id, criterionProfileKeys);
  }

  return {
    alternativeKeys,
    profileKeys,
    alternativeKeysByCriterion,
    profileKeysByCriterion,
  };
};

export const buildEmptyAHPSortAlternativeProfilesEvaluation = () => ({
  alternativeProfileComparisons: [],
  profileComparisons: [],
});

export const analyzeAHPSortAlternativeProfilesEvaluation = ({
  evaluation,
  resolvedContext,
}) => {
  const context = resolvedContext;
  if (!context) {
    return {
      context: null,
      alternativeByKey: new Map(),
      profileByPairKey: new Map(),
      alternativeByCriterion: new Map(),
      profileByCriterion: new Map(),
      alternativeMissingByCriterion: new Map(),
      profileMissingByCriterion: new Map(),
      totalExpected: 0,
      completed: 0,
      invalidCount: 0,
      alternativeInvalidCount: 0,
      profileInvalidCount: 0,
      complete: false,
      message: "Evaluation context is incomplete.",
    };
  }

  const indexes = buildIndexes(context);
  const allowedEvaluationFields = ["alternativeProfileComparisons", "profileComparisons"];
  let invalidShapeCount = 0;
  if (!isRecord(evaluation)) invalidShapeCount += 1;
  else {
    if (Object.keys(evaluation).some((key) => !allowedEvaluationFields.includes(key))) invalidShapeCount += 1;
    if (!Array.isArray(evaluation.alternativeProfileComparisons)) invalidShapeCount += 1;
    if (!Array.isArray(evaluation.profileComparisons)) invalidShapeCount += 1;
  }

  const alternativeRows = Array.isArray(evaluation?.alternativeProfileComparisons)
    ? evaluation.alternativeProfileComparisons
    : [];
  const profileRows = Array.isArray(evaluation?.profileComparisons)
    ? evaluation.profileComparisons
    : [];

  const alternativeResult = inspectRows({
    rows: alternativeRows,
    field: "alternativeProfileComparisons",
    keys: expectedKeys.alternativeProfileComparisons,
    expectedKeyFor: (row) => tupleKey([
      normalizeId(row.criterionId),
      normalizeId(row.alternativeId),
      normalizeId(row.profileId),
    ]),
    validateReferences: (row, refs) =>
      isKnown(refs.alternativeIds, normalizeId(row.alternativeId)) &&
      isKnown(refs.criterionIds, normalizeId(row.criterionId)) &&
      isKnown(refs.profileIds, normalizeId(row.profileId)),
    valueField: "alternativeToProfile",
    indexes,
  });
  const profileResult = inspectRows({
    rows: profileRows,
    field: "profileComparisons",
    keys: expectedKeys.profileComparisons,
    expectedKeyFor: (row, refs) => profilePairKey({
      criterionId: normalizeId(row.criterionId),
      firstProfileId: normalizeId(row.firstProfileId),
      secondProfileId: normalizeId(row.secondProfileId),
      profileIndexById: refs.profileIndexById,
    }),
    validateReferences: (row, refs) => {
      const firstProfileId = normalizeId(row.firstProfileId);
      const secondProfileId = normalizeId(row.secondProfileId);
      return isKnown(refs.criterionIds, normalizeId(row.criterionId)) &&
        isKnown(refs.profileIds, firstProfileId) &&
        isKnown(refs.profileIds, secondProfileId) &&
        firstProfileId !== secondProfileId;
    },
    valueField: "firstToSecond",
    indexes,
  });

  const expected = resolveExpectedKeys(context);
  const alternativeByKey = new Map(
    [...alternativeResult.validByKey].filter(([key]) => expected.alternativeKeys.has(key))
  );
  const profileByPairKey = new Map(
    [...profileResult.validByKey].filter(([key]) => expected.profileKeys.has(key))
  );
  const unexpectedCount = alternativeResult.validByKey.size - alternativeByKey.size +
    profileResult.validByKey.size - profileByPairKey.size;
  const alternativeByCriterion = new Map();
  const profileByCriterion = new Map();
  const alternativeMissingByCriterion = new Map();
  const profileMissingByCriterion = new Map();

  for (const criterion of context.criteria) {
    const alternativeKeys = expected.alternativeKeysByCriterion.get(criterion.id);
    const profileKeys = expected.profileKeysByCriterion.get(criterion.id);
    const completedAlternative = [...alternativeKeys].filter((key) => alternativeByKey.has(key)).length;
    const completedProfiles = [...profileKeys].filter((key) => profileByPairKey.has(key)).length;
    alternativeByCriterion.set(criterion.id, completedAlternative);
    profileByCriterion.set(criterion.id, completedProfiles);
    alternativeMissingByCriterion.set(criterion.id, alternativeKeys.size - completedAlternative);
    profileMissingByCriterion.set(criterion.id, profileKeys.size - completedProfiles);
  }

  const completed = alternativeByKey.size + profileByPairKey.size;
  const totalExpected = expected.alternativeKeys.size + expected.profileKeys.size;
  const alternativeInvalidCount = alternativeResult.invalidCount + unexpectedCount;
  const profileInvalidCount = profileResult.invalidCount;
  const invalidCount = invalidShapeCount + alternativeInvalidCount + profileInvalidCount;

  return {
    context,
    profileIndexById: indexes.profileIndexById,
    alternativeByKey,
    profileByPairKey,
    alternativeByCriterion,
    profileByCriterion,
    alternativeMissingByCriterion,
    profileMissingByCriterion,
    totalExpected,
    completed,
    invalidCount,
    alternativeInvalidCount,
    profileInvalidCount,
    complete: invalidCount === 0 && completed === totalExpected,
    message: invalidCount > 0 ? `${invalidCount} invalid or duplicate comparison${invalidCount === 1 ? "" : "s"} need review.` : "",
    expected,
  };
};

export const getAlternativeToProfileValue = ({
  assessment,
  criterionId,
  alternativeId,
  profileId,
}) => assessment?.alternativeByKey?.get(tupleKey([criterionId, alternativeId, profileId]))?.alternativeToProfile ?? "";

export const getOrientedProfileComparisonValue = ({
  assessment,
  criterionId,
  rowProfileId,
  columnProfileId,
}) => {
  if (rowProfileId === columnProfileId) return null;
  const row = assessment?.profileByPairKey?.get(profilePairKey({
    criterionId,
    firstProfileId: rowProfileId,
    secondProfileId: columnProfileId,
    profileIndexById: assessment.profileIndexById,
  }));
  if (!row) return "";
  const normalizedValue = resolveSaatyValue(row.firstToSecond);
  if (normalizedValue === null) return "";
  return row.firstProfileId === rowProfileId
    ? normalizedValue
    : getSaatyScaleValue(1 / normalizedValue) ?? "";
};

const copyPayload = (evaluation) => ({
  ...(isRecord(evaluation) ? evaluation : {}),
  alternativeProfileComparisons: Array.isArray(evaluation?.alternativeProfileComparisons)
    ? [...evaluation.alternativeProfileComparisons]
    : [],
  profileComparisons: Array.isArray(evaluation?.profileComparisons)
    ? [...evaluation.profileComparisons]
    : [],
});

const isEmptyValue = (value) => value === null || value === undefined || value === "";

export const updateAlternativeToProfileComparison = ({
  evaluation,
  criterionId,
  alternativeId,
  profileId,
  value,
}) => {
  const next = copyPayload(evaluation);
  const key = tupleKey([criterionId, alternativeId, profileId]);
  next.alternativeProfileComparisons = next.alternativeProfileComparisons.filter((row) =>
    tupleKey([normalizeId(row?.criterionId), normalizeId(row?.alternativeId), normalizeId(row?.profileId)]) !== key
  );
  if (isEmptyValue(value)) return next;
  const canonicalValue = resolveSaatyValue(value);
  if (canonicalValue === null) throw new Error("Choose a valid Saaty comparison value.");
  next.alternativeProfileComparisons.push({
    alternativeId,
    criterionId,
    profileId,
    alternativeToProfile: canonicalValue,
  });
  return next;
};

export const updateOrientedProfileComparison = ({
  evaluation,
  context,
  criterionId,
  rowProfileId,
  columnProfileId,
  value,
}) => {
  if (rowProfileId === columnProfileId) {
    throw new Error("Profile comparisons cannot target the diagonal.");
  }
  const next = copyPayload(evaluation);
  const profileIndexById = new Map(context.profiles.map(({ profileId, index }) => [profileId, index]));
  if (!profileIndexById.has(rowProfileId) || !profileIndexById.has(columnProfileId)) {
    throw new Error("Profile comparison references an unknown profile.");
  }
  const [firstProfileId, secondProfileId] = profileIndexById.get(rowProfileId) < profileIndexById.get(columnProfileId)
    ? [rowProfileId, columnProfileId]
    : [columnProfileId, rowProfileId];
  next.profileComparisons = next.profileComparisons.filter((row) => {
    if (normalizeId(row?.criterionId) !== criterionId) return true;
    return !(
      [normalizeId(row?.firstProfileId), normalizeId(row?.secondProfileId)].includes(firstProfileId) &&
      [normalizeId(row?.firstProfileId), normalizeId(row?.secondProfileId)].includes(secondProfileId)
    );
  });
  if (isEmptyValue(value)) return next;
  const selectedValue = resolveSaatyValue(value);
  if (selectedValue === null) throw new Error("Choose a valid Saaty comparison value.");
  const firstToSecond = rowProfileId === firstProfileId
    ? selectedValue
    : getSaatyScaleValue(1 / selectedValue);
  if (firstToSecond === null) throw new Error("The reciprocal Saaty value is invalid.");
  next.profileComparisons.push({
    criterionId,
    firstProfileId,
    secondProfileId,
    firstToSecond,
  });
  return next;
};

export const validateAHPSortAlternativeProfilesForSubmit = ({ decisionContext, evaluation }) => {
  try {
    const context = resolveAHPSortAlternativeProfilesContext({ decisionContext });
    const assessment = analyzeAHPSortAlternativeProfilesEvaluation({
      decisionContext,
      evaluation,
      resolvedContext: context,
    });
    return {
      valid: assessment.complete,
      message: assessment.complete
        ? ""
        : assessment.message || `${assessment.totalExpected - assessment.completed} comparisons are still missing.`,
    };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "AHPSort I evaluation is incomplete.",
    };
  }
};

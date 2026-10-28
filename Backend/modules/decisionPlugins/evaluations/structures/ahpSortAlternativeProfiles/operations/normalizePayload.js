import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../../../utils/common/strings.js";
import { resolveAHPSortAlternativeProfilesContext } from "./resolveContext.js";
import { validatePayloadShape } from "./validatePayloadShape.js";

const SAATY_SCALE = Object.freeze([
  1 / 9,
  1 / 8,
  1 / 7,
  1 / 6,
  1 / 5,
  1 / 4,
  1 / 3,
  1 / 2,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
]);
const SAATY_TOLERANCE = 1e-12;

const normalizeSaatyValue = ({ value, field }) => {
  const numericValue =
    typeof value === "string" && value.trim() !== ""
      ? Number(value.trim())
      : value;
  const canonicalValue =
    typeof numericValue === "number" && Number.isFinite(numericValue)
      ? SAATY_SCALE.find(
          (allowedValue) =>
            Math.abs(numericValue - allowedValue) <= SAATY_TOLERANCE
        )
      : undefined;
  if (canonicalValue === undefined) {
    throw createBadRequestError(
      "Comparison must use one of Saaty's 17 fundamental scale values",
      { field }
    );
  }
  return canonicalValue;
};

const requireExactFields = ({ row, expectedFields, field }) => {
  if (!isPlainObject(row)) {
    throw createBadRequestError("Comparison must be an object", { field });
  }
  const unsupportedField = Object.keys(row).find(
    (key) => !expectedFields.has(key)
  );
  if (unsupportedField) {
    throw createBadRequestError(
      `Comparison contains unsupported field '${unsupportedField}'`,
      { field: `${field}.${unsupportedField}` }
    );
  }
  if (
    Object.keys(row).length !== expectedFields.size ||
    [...expectedFields].some((key) => !Object.hasOwn(row, key))
  ) {
    throw createBadRequestError(
      `Comparison must contain ${[...expectedFields].join(", ")}`,
      { field }
    );
  }
};

const requiredId = ({ value, field }) => {
  const id = normalizeNonEmptyString(value);
  if (!id) {
    throw createBadRequestError("Comparison IDs must be non-empty strings", {
      field,
    });
  }
  return id;
};

const indexEntities = (entities) => new Map(entities.map((entity) => [entity.id, entity.index]));

const tupleKey = (parts) => JSON.stringify(parts);

const compareBy = (selectors) => (left, right) => {
  for (const selector of selectors) {
    const difference = selector(left) - selector(right);
    if (difference !== 0) return difference;
  }
  return 0;
};

const validateCompleteCoverage = ({
  requireValue,
  alternativeKeys,
  profilePairKeys,
}) => {
  if (!requireValue) return;

  const missingAlternativeKeys = [...alternativeKeys.expected].filter(
    (key) => !alternativeKeys.received.has(key)
  );
  const missingProfilePairKeys = [...profilePairKeys.expected].filter(
    (key) => !profilePairKeys.received.has(key)
  );
  if (missingAlternativeKeys.length > 0 || missingProfilePairKeys.length > 0) {
    const expectedCount =
      alternativeKeys.expected.size + profilePairKeys.expected.size;
    const receivedCount =
      alternativeKeys.received.size + profilePairKeys.received.size;
    throw createBadRequestError(
      `All AHPSort I comparisons are required for submit (${receivedCount} of ${expectedCount} complete)`,
      {
        field:
          missingAlternativeKeys.length > 0
            ? "payload.alternativeProfileComparisons"
            : "payload.profileComparisons",
        details: {
          expectedCount,
          receivedCount,
          missingAlternativeComparisonCount: missingAlternativeKeys.length,
          missingProfileComparisonCount: missingProfilePairKeys.length,
        },
      }
    );
  }
};

export const normalizePayload = ({ payload, decisionContext, requireValue }) => {
  validatePayloadShape({ payload });
  const context = resolveAHPSortAlternativeProfilesContext({ decisionContext });
  const alternativeIndexById = indexEntities(context.alternatives);
  const criterionIndexById = indexEntities(context.criteria);
  const alternativeKeys = { expected: new Set(), received: new Set() };
  const profilePairKeys = { expected: new Set(), received: new Set() };

  for (const criterion of context.criteria) {
    for (const alternative of context.alternatives) {
      for (const profile of context.profiles) {
        alternativeKeys.expected.add(
          tupleKey([criterion.id, alternative.id, profile.profileId])
        );
      }
    }
    for (let firstIndex = 0; firstIndex < context.profiles.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < context.profiles.length;
        secondIndex += 1
      ) {
        profilePairKeys.expected.add(
          tupleKey([
            criterion.id,
            context.profiles[firstIndex].profileId,
            context.profiles[secondIndex].profileId,
          ])
        );
      }
    }
  }

  const alternativeProfileComparisons = payload.alternativeProfileComparisons.map(
    (source, index) => {
      const field = `payload.alternativeProfileComparisons[${index}]`;
      requireExactFields({
        row: source,
        expectedFields: new Set([
          "alternativeId",
          "criterionId",
          "profileId",
          "alternativeToProfile",
        ]),
        field,
      });
      const alternativeId = requiredId({
        value: source.alternativeId,
        field: `${field}.alternativeId`,
      });
      const criterionId = requiredId({
        value: source.criterionId,
        field: `${field}.criterionId`,
      });
      const profileId = requiredId({
        value: source.profileId,
        field: `${field}.profileId`,
      });
      if (!alternativeIndexById.has(alternativeId)) {
        throw createBadRequestError("Comparison references an unknown alternative", {
          field: `${field}.alternativeId`,
        });
      }
      if (!criterionIndexById.has(criterionId)) {
        throw createBadRequestError("Comparison references an unknown criterion", {
          field: `${field}.criterionId`,
        });
      }
      if (!context.profileIndexById.has(profileId)) {
        throw createBadRequestError(
          "Comparison references a profile that is not configured for the selected mode",
          { field: `${field}.profileId` }
        );
      }
      const key = tupleKey([criterionId, alternativeId, profileId]);
      if (alternativeKeys.received.has(key)) {
        throw createBadRequestError(
          "Duplicate alternative-to-profile comparison",
          { field }
        );
      }
      alternativeKeys.received.add(key);
      return {
        alternativeId,
        criterionId,
        profileId,
        alternativeToProfile: normalizeSaatyValue({
          value: source.alternativeToProfile,
          field: `${field}.alternativeToProfile`,
        }),
      };
    }
  );

  const profileComparisons = payload.profileComparisons.map((source, index) => {
    const field = `payload.profileComparisons[${index}]`;
    requireExactFields({
      row: source,
      expectedFields: new Set([
        "criterionId",
        "firstProfileId",
        "secondProfileId",
        "firstToSecond",
      ]),
      field,
    });
    const criterionId = requiredId({
      value: source.criterionId,
      field: `${field}.criterionId`,
    });
    const firstProfileId = requiredId({
      value: source.firstProfileId,
      field: `${field}.firstProfileId`,
    });
    const secondProfileId = requiredId({
      value: source.secondProfileId,
      field: `${field}.secondProfileId`,
    });
    if (!criterionIndexById.has(criterionId)) {
      throw createBadRequestError("Comparison references an unknown criterion", {
        field: `${field}.criterionId`,
      });
    }
    if (firstProfileId === secondProfileId) {
      throw createBadRequestError(
        "A profile cannot be compared with itself",
        { field }
      );
    }
    const firstProfileIndex = context.profileIndexById.get(firstProfileId);
    const secondProfileIndex = context.profileIndexById.get(secondProfileId);
    if (firstProfileIndex === undefined) {
      throw createBadRequestError(
        "Comparison references a profile that is not configured for the selected mode",
        { field: `${field}.firstProfileId` }
      );
    }
    if (secondProfileIndex === undefined) {
      throw createBadRequestError(
        "Comparison references a profile that is not configured for the selected mode",
        { field: `${field}.secondProfileId` }
      );
    }

    const orderedProfileIndexes = [firstProfileIndex, secondProfileIndex].sort(
      (left, right) => left - right
    );
    const key = tupleKey([
      criterionId,
      context.profiles[orderedProfileIndexes[0]].profileId,
      context.profiles[orderedProfileIndexes[1]].profileId,
    ]);
    if (profilePairKeys.received.has(key)) {
      throw createBadRequestError(
        "Duplicate unordered profile comparison for this criterion",
        { field }
      );
    }
    profilePairKeys.received.add(key);

    return {
      criterionId,
      firstProfileId,
      secondProfileId,
      firstToSecond: normalizeSaatyValue({
        value: source.firstToSecond,
        field: `${field}.firstToSecond`,
      }),
    };
  });

  validateCompleteCoverage({
    requireValue,
    alternativeKeys,
    profilePairKeys,
  });

  alternativeProfileComparisons.sort(
    compareBy([
      (row) => criterionIndexById.get(row.criterionId),
      (row) => alternativeIndexById.get(row.alternativeId),
      (row) => context.profileIndexById.get(row.profileId),
    ])
  );
  profileComparisons.sort(
    compareBy([
      (row) => criterionIndexById.get(row.criterionId),
      (row) =>
        Math.min(
          context.profileIndexById.get(row.firstProfileId),
          context.profileIndexById.get(row.secondProfileId)
        ),
      (row) =>
        Math.max(
          context.profileIndexById.get(row.firstProfileId),
          context.profileIndexById.get(row.secondProfileId)
        ),
    ])
  );

  return { alternativeProfileComparisons, profileComparisons };
};

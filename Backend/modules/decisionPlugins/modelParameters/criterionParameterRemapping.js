import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const criterionParameterField = (parameter) =>
  `modelParameters.${normalizeNonEmptyString(parameter?.key) || "<unknown>"}`;

export const buildCriterionIdMapOrThrow = ({ criterionIdMappings }) => {
  if (!Array.isArray(criterionIdMappings)) {
    throw createBadRequestError("Criterion ID mappings are required", {
      field: "criteria",
    });
  }

  const criterionIdMap = new Map();
  const persistedIds = new Set();

  for (const mapping of criterionIdMappings) {
    const sourceCriterionId = normalizeNonEmptyString(mapping?.sourceCriterionId);
    const persistedCriterionId = normalizeNonEmptyString(mapping?.persistedCriterionId);
    if (!sourceCriterionId || !persistedCriterionId) {
      // Criteria without a client identity cannot be referenced by keyed parameters.
      continue;
    }

    if (criterionIdMap.has(sourceCriterionId)) {
      throw createBadRequestError(
        `Criterion id '${sourceCriterionId}' is duplicated and cannot be remapped`,
        {
          field: "criteria",
          details: { criterionId: sourceCriterionId },
        }
      );
    }
    if (persistedIds.has(persistedCriterionId)) {
      throw createBadRequestError("Persisted criterion ids must be unique", {
        field: "criteria",
        details: { criterionId: persistedCriterionId },
      });
    }

    criterionIdMap.set(sourceCriterionId, persistedCriterionId);
    persistedIds.add(persistedCriterionId);
  }

  return criterionIdMap;
};

export const remapCriterionKeyedParameterValueOrThrow = ({
  value,
  criterionIdMap,
  parameter,
}) => {
  const field = criterionParameterField(parameter);
  if (!isPlainObject(value)) {
    throw createBadRequestError(`${field} must be an object keyed by criterion id`, {
      field,
    });
  }
  if (!(criterionIdMap instanceof Map)) {
    throw createBadRequestError("criterionIdMap must be a Map", {
      field: "criterionIdMap",
    });
  }

  const seenSourceIds = new Set();
  const seenPersistedIds = new Set();
  const remappedEntries = Object.entries(value).map(([rawCriterionId, item]) => {
    const sourceCriterionId = normalizeNonEmptyString(rawCriterionId);
    if (!sourceCriterionId) {
      throw createBadRequestError(`${field} contains an empty criterion id`, {
        field: `${field}.${rawCriterionId}`,
      });
    }
    if (seenSourceIds.has(sourceCriterionId)) {
      throw createBadRequestError(`${field} contains duplicate criterion references`, {
        field,
        details: { criterionId: sourceCriterionId },
      });
    }
    seenSourceIds.add(sourceCriterionId);

    if (!criterionIdMap.has(sourceCriterionId)) {
      throw createBadRequestError(
        `${field} references unknown or unremappable criterion '${sourceCriterionId}'`,
        {
          field: `${field}.${sourceCriterionId}`,
          details: { criterionId: sourceCriterionId },
        }
      );
    }

    const persistedCriterionId = normalizeNonEmptyString(
      criterionIdMap.get(sourceCriterionId)
    );
    if (!persistedCriterionId) {
      throw createBadRequestError(
        `${field} references a criterion that cannot be remapped`,
        {
          field: `${field}.${sourceCriterionId}`,
          details: { criterionId: sourceCriterionId },
        }
      );
    }
    if (seenPersistedIds.has(persistedCriterionId)) {
      throw createBadRequestError(`${field} contains duplicate persisted criterion references`, {
        field,
        details: { criterionId: persistedCriterionId },
      });
    }
    seenPersistedIds.add(persistedCriterionId);

    return [persistedCriterionId, item];
  });

  return Object.fromEntries(remappedEntries);
};
